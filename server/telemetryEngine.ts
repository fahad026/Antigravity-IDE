import { db } from './db';
import type {
  StationConfig,
  TelemetryPoint,
  VibrationTelemetry,
  AnomalyRecord,
  StreamMode,
  ISOZone,
  FilterHealthStatus,
  ESDStatus,
  ControlPayload,
} from '../src/types/telemetry';

interface StationRuntimeState {
  config: StationConfig;
  inletPressure: number;
  outletSetpoint: number;
  outletPressure: number;
  filterDiffBase: number;
  waterBathTemp: number;
  flowRate: number;
  activeStream: StreamMode;
  esdStatus: ESDStatus;
  activeFault: string | null;
  faultTimer: number;
  dailyVolume: number;
  stepCount: number;
}

export class TelemetryEngine {
  private runtimeStates: Map<string, StationRuntimeState> = new Map();
  private historyBuffers: Map<string, TelemetryPoint[]> = new Map();
  private sseClients: Set<(data: TelemetryPoint) => void> = new Set();
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeStations();
    this.startSimulationLoop();
  }

  private initializeStations() {
    const stations = db.getStations();
    for (const station of stations) {
      this.runtimeStates.set(station.id, {
        config: station,
        inletPressure: station.nominalInletBar,
        outletSetpoint: station.nominalOutletBar,
        outletPressure: station.nominalOutletBar,
        filterDiffBase: 0.24,
        waterBathTemp: 58.5,
        flowRate: station.designFlowCapacity * 0.42,
        activeStream: 'STREAM_A',
        esdStatus: 'ARMED',
        activeFault: null,
        faultTimer: 0,
        dailyVolume: 248500 + Math.random() * 50000,
        stepCount: 0,
      });
      this.historyBuffers.set(station.id, []);
    }
  }

  public getLatestTelemetry(stationId: string): TelemetryPoint | null {
    const history = this.historyBuffers.get(stationId);
    if (history && history.length > 0) {
      return history[history.length - 1];
    }
    // Generate one if buffer empty
    const point = this.generateStationTelemetry(stationId);
    return point;
  }

  public getTelemetryHistory(stationId: string, limit = 60): TelemetryPoint[] {
    const history = this.historyBuffers.get(stationId) || [];
    return history.slice(-limit);
  }

  public registerSSEClient(callback: (data: TelemetryPoint) => void) {
    this.sseClients.add(callback);
    return () => {
      this.sseClients.delete(callback);
    };
  }

  public handleControlCommand(payload: ControlPayload): { success: boolean; message: string; state?: any } {
    const state = this.runtimeStates.get(payload.stationId);
    if (!state) {
      return { success: false, message: `Station ${payload.stationId} not found.` };
    }

    const operator = payload.operator || 'SCADA Operator';

    switch (payload.action) {
      case 'SET_OUTLET_SETPOINT': {
        if (payload.setpointBar === undefined) {
          return { success: false, message: 'Missing setpoint value.' };
        }
        if (payload.setpointBar < 5 || payload.setpointBar > state.config.opsoLimitBar) {
          return {
            success: false,
            message: `Setpoint ${payload.setpointBar} bar out of safe range (5 to ${state.config.opsoLimitBar} bar).`,
          };
        }
        const oldVal = state.outletSetpoint;
        state.outletSetpoint = Number(payload.setpointBar.toFixed(2));
        db.addAuditLog(
          payload.stationId,
          operator,
          'SET_OUTLET_PRESSURE_SETPOINT',
          `Adjusted outlet regulator target setpoint from ${oldVal} to ${state.outletSetpoint} bar.`
        );
        return {
          success: true,
          message: `Outlet setpoint successfully calibrated to ${state.outletSetpoint} bar.`,
        };
      }

      case 'SWITCH_STREAM': {
        if (!payload.targetStream) {
          return { success: false, message: 'Target stream not specified.' };
        }
        const prev = state.activeStream;
        state.activeStream = payload.targetStream;
        db.addAuditLog(
          payload.stationId,
          operator,
          'STREAM_SWITCHOVER',
          `Active regulating line switched from ${prev} to ${payload.targetStream}.`
        );
        return {
          success: true,
          message: `Stream switchover complete: ${payload.targetStream} now in Duty.`,
        };
      }

      case 'TRIGGER_ESD': {
        state.esdStatus = 'TRIPPED';
        db.addAuditLog(
          payload.stationId,
          operator,
          'MANUAL_EMERGENCY_SHUTDOWN',
          'EMERGENCY SLAM-SHUT VALVE (ESD-101) MANUALLY TRIPPED by SCADA Control Room!'
        );
        db.addAlarm({
          stationId: payload.stationId,
          timestamp: new Date().toISOString(),
          severity: 'CRITICAL',
          tag: 'SSV-101',
          title: 'Manual ESD Slam-Shut Tripped',
          message: 'Station inlet slammed shut by operator action. Gas flow halting.',
          value: 'TRIPPED (0 Bar Downstream)',
          threshold: 'Armed / Open',
          acknowledged: false,
        });
        return {
          success: true,
          message: 'EMERGENCY SHUTDOWN INITIATED. Station isolated.',
        };
      }

      case 'RESET_ESD': {
        state.esdStatus = 'ARMED';
        state.activeFault = null;
        db.addAuditLog(
          payload.stationId,
          operator,
          'RESET_EMERGENCY_SHUTDOWN',
          'Emergency Slam-Shut Valve manually reset after field safety clearance.'
        );
        return {
          success: true,
          message: 'ESD valve reset. Pipeline line-pack recovery sequence commencing.',
        };
      }

      case 'INJECT_FAULT': {
        state.activeFault = payload.faultType || null;
        state.faultTimer = 0;
        db.addAuditLog(
          payload.stationId,
          operator,
          'FAULT_SIMULATION_INJECTED',
          `Injected diagnostic simulation scenario: ${payload.faultType}`
        );
        return {
          success: true,
          message: `Fault scenario [${payload.faultType}] injected for diagnostic verification.`,
        };
      }

      case 'CLEAR_FAULT': {
        state.activeFault = null;
        state.faultTimer = 0;
        db.addAuditLog(
          payload.stationId,
          operator,
          'FAULT_SIMULATION_CLEARED',
          'Cleared active simulated anomaly conditions. System normalized.'
        );
        return {
          success: true,
          message: 'All simulated faults cleared. Station returning to nominal steady-state.',
        };
      }

      default:
        return { success: false, message: 'Unrecognized action.' };
    }
  }

  private startSimulationLoop() {
    this.timer = setInterval(() => {
      for (const [stationId] of this.runtimeStates) {
        const point = this.generateStationTelemetry(stationId);
        if (point) {
          // Broadcast to connected SSE clients
          for (const send of this.sseClients) {
            try {
              send(point);
            } catch (err) {
              console.error('Error broadcasting to SSE client:', err);
            }
          }
        }
      }
    }, 1000);
  }

  public stopSimulationLoop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private generateStationTelemetry(stationId: string): TelemetryPoint | null {
    const state = this.runtimeStates.get(stationId);
    if (!state) return null;

    state.stepCount++;
    const t = state.stepCount;

    // Environmental noise & micro-oscillations
    const pressureNoise = (Math.sin(t * 0.15) * 0.4 + (Math.random() - 0.5) * 0.3);
    const flowNoise = (Math.cos(t * 0.1) * 350 + (Math.random() - 0.5) * 200);

    // Baseline physics
    let targetInlet = state.config.nominalInletBar + pressureNoise;
    let targetWaterBath = 58.0 + Math.sin(t * 0.05) * 1.5;
    let targetFilterBase = state.filterDiffBase + (Math.random() * 0.02);
    let targetFlow = state.flowRate + flowNoise;

    // Apply Fault Scenarios if active
    if (state.activeFault === 'PIPELINE_DROP') {
      state.faultTimer++;
      // Rapid inlet pressure plunge from ~65 bar to ~20 bar (simulates major pipeline burst/leakage)
      targetInlet = Math.max(18.5, state.config.nominalInletBar - state.faultTimer * 3.8);
      targetFlow = Math.max(2000, targetFlow * 0.4);
    } else if (state.activeFault === 'PREHEATER_FLAMEOUT') {
      state.faultTimer++;
      // Water bath temperature steadily drops towards ambient (8°C)
      targetWaterBath = Math.max(8.0, 58.0 - state.faultTimer * 0.9);
    } else if (state.activeFault === 'FILTER_CLOGGED') {
      state.faultTimer++;
      targetFilterBase = Math.min(1.25, 0.24 + state.faultTimer * 0.035);
    } else if (state.activeFault === 'PRESSURE_SURGE') {
      state.faultTimer++;
      targetInlet = Math.min(state.config.maopBar + 2.0, state.config.nominalInletBar + state.faultTimer * 0.85);
    }

    state.inletPressure = Number(targetInlet.toFixed(2));
    state.waterBathTemp = Number(targetWaterBath.toFixed(1));

    // Handle ESD Shutoff
    if (state.esdStatus === 'TRIPPED') {
      targetFlow = 0;
      state.outletPressure = Math.max(0, state.outletPressure - 1.5);
    } else {
      // Regulated outlet pressure follows setpoint with small pilot controller response
      const pError = state.outletSetpoint - state.outletPressure;
      state.outletPressure = Number((state.outletPressure + pError * 0.25 + (Math.random() - 0.5) * 0.08).toFixed(2));
    }

    // Filter Differential Pressure (scales with square of flow)
    const flowRatio = Math.max(0.1, targetFlow / state.config.designFlowCapacity);
    const filterDiffPressure = Number((targetFilterBase * Math.pow(flowRatio, 1.8)).toFixed(3));
    let filterStatus: FilterHealthStatus = 'CLEAN';
    if (filterDiffPressure > 0.85) filterStatus = 'CRITICAL';
    else if (filterDiffPressure > 0.60) filterStatus = 'WARNING';
    else if (filterDiffPressure > 0.35) filterStatus = 'NORMAL';

    // Joule-Thomson Effect Calculation
    // Natural Gas JT coefficient: ~0.48 °C drop per bar of pressure drop
    const inletTemp = 13.5 + Math.sin(t * 0.02) * 0.8;
    const deltaP = Math.max(0, state.inletPressure - state.outletPressure);
    const jouleThomsonDrop = Number((deltaP * 0.48).toFixed(2));

    // Water bath pre-heat recovery
    // Heat exchanger transfers heat from water bath to gas before regulation
    const heatExchangeCoeff = 0.68;
    const preHeatedGasTemp = inletTemp + (state.waterBathTemp - inletTemp) * heatExchangeCoeff * (1 / (1 + flowRatio * 0.3));
    const outletTemp = Number((preHeatedGasTemp - jouleThomsonDrop).toFixed(1));

    // Hydrate Formation Risk Assessment
    // Hydrate curve threshold: T_hydrate = 8.9 * ln(P_out) - 16.5
    const hydrateThreshold = 8.9 * Math.log(Math.max(1, state.outletPressure)) - 16.5;
    const tempMargin = outletTemp - hydrateThreshold;
    let hydrateRiskPercent = 0;
    if (tempMargin < 0) {
      hydrateRiskPercent = 100;
    } else if (tempMargin < 6.0) {
      hydrateRiskPercent = Math.min(99, Math.round(((6.0 - tempMargin) / 6.0) * 100));
    } else {
      hydrateRiskPercent = Math.max(2, Math.round(5 - tempMargin * 0.3));
    }

    // Flow calculations
    const finalFlow = Math.max(0, Math.round(targetFlow));
    const flowRateMMSCFD = Number(((finalFlow * 35.3147) / 1000000 * 24).toFixed(2));
    state.dailyVolume += (finalFlow / 3600);

    // Vibration Synthesis (ISO 10816-3 Mechanical Anomaly Modeling)
    const vibration = this.generateVibrationTelemetry(state, t);

    // Anomaly Detection and SCADA Alarm Generation
    const anomalies: AnomalyRecord[] = [];

    // 0. Critical Pipeline Drop Detection (Yokogawa EJA530E Inlet Pressure Plunge)
    if (state.inletPressure < 35.0 || state.activeFault === 'PIPELINE_DROP') {
      anomalies.push({
        id: `anom-pdrop-${t}`,
        timestamp: new Date().toISOString(),
        type: 'PIPELINE_DROP',
        severity: 'CRITICAL',
        message: `CRITICAL PIPELINE DROP DETECTED! Inlet pressure plunged to ${state.inletPressure} bar (Line breach or rupture suspected).`,
        tag: 'PIT-101',
        currentValue: state.inletPressure,
        thresholdValue: 40.0,
        unit: 'Bar',
        suggestedAction: 'Trigger Master Emergency Slam-Shut Valve (ESD-101) to isolate station perimeter.',
      });
      this.triggerSCADAAlarmOnce(stationId, 'PIT-101', 'CRITICAL', 'CRITICAL PIPELINE DROP',
        `Inlet pressure collapsed to ${state.inletPressure} bar on Yokogawa EJA530E transmitter. Major line-pack loss detected.`,
        `${state.inletPressure} Bar`, '< 40.0 Bar');
    }

    // 1. Valve Chatter & Vibration Anomaly (ADXL345 3-Axis Accelerometer)
    if (state.activeFault === 'VALVE_CHATTER' || vibration.isoZone === 'D') {
      anomalies.push({
        id: `anom-vib-${t}`,
        timestamp: new Date().toISOString(),
        type: 'VALVE_CHATTER',
        severity: 'CRITICAL',
        message: 'VALVE CHATTER DETECTED! ADXL345 accelerometer registers severe high-frequency seat impact & flutter (ISO Zone D).',
        tag: 'VIT-101',
        currentValue: vibration.overallRms,
        thresholdValue: 7.1,
        unit: 'mm/s',
        suggestedAction: 'Execute hot switchover to Standby Stream B to protect regulator cage from fatigue failure.',
      });
      this.triggerSCADAAlarmOnce(stationId, 'VIT-101', 'CRITICAL', 'VALVE CHATTER DETECTED',
        `ADXL345 accelerometer measured ${vibration.overallRms} mm/s RMS (ISO Zone D). Mechanical chatter on regulator stem.`,
        `${vibration.overallRms} mm/s`, '> 7.1 mm/s');
    } else if (vibration.isoZone === 'C') {
      anomalies.push({
        id: `anom-vib-${t}`,
        timestamp: new Date().toISOString(),
        type: 'VIBRATION_SPIKE',
        severity: 'WARNING',
        message: 'Regulator acoustic flutter detected in ISO Zone C (Alert). Mechanical wear accelerated.',
        tag: 'VIT-101',
        currentValue: vibration.overallRms,
        thresholdValue: 4.5,
        unit: 'mm/s',
        suggestedAction: 'Monitor spectral peak at 480 Hz and throttle pilot feed if oscillation persists.',
      });
    }

    // 2. Hydrate Freezing Anomaly
    if (hydrateRiskPercent > 75 || outletTemp <= 2.0) {
      anomalies.push({
        id: `anom-hyd-${t}`,
        timestamp: new Date().toISOString(),
        type: 'HYDRATE_FREEZE_RISK',
        severity: 'CRITICAL',
        message: `Gas outlet temperature (${outletTemp}°C) dropped below hydrate stability envelope! Ice formation threat.`,
        tag: 'TIT-102',
        currentValue: outletTemp,
        thresholdValue: 3.0,
        unit: '°C',
        suggestedAction: 'Verify water bath burner ignition and increase heat duty to prevent pilot regulator freeze-up.',
      });
      this.triggerSCADAAlarmOnce(stationId, 'TIT-102', 'CRITICAL', 'Hydrate Formation Freeze Hazard',
        `Gas outlet plunged to ${outletTemp}°C due to insufficient preheating (${state.waterBathTemp}°C). Hydrate risk ${hydrateRiskPercent}%.`,
        `${outletTemp} °C`, '< 3.0 °C');
    }

    // 3. Filter DP Anomaly
    if (filterDiffPressure > 0.80) {
      anomalies.push({
        id: `anom-flt-${t}`,
        timestamp: new Date().toISOString(),
        type: 'FILTER_CLOG',
        severity: filterDiffPressure > 1.0 ? 'CRITICAL' : 'WARNING',
        message: `Cartridge filter differential pressure (${filterDiffPressure} bar) indicates heavy particulate saturation.`,
        tag: 'PDT-101',
        currentValue: filterDiffPressure,
        thresholdValue: 0.80,
        unit: 'Bar',
        suggestedAction: 'Perform blowdown or switch to redundant standby filter separator basket.',
      });
      if (filterDiffPressure > 1.0) {
        this.triggerSCADAAlarmOnce(stationId, 'PDT-101', 'CRITICAL', 'Filter Element High Differential Pressure',
          `Filter DP has reached ${filterDiffPressure} bar. Danger of element collapse or filter bypass.`,
          `${filterDiffPressure} Bar`, '> 0.80 Bar');
      }
    }

    // 4. Overpressure (OPSO) Threat
    if (state.outletPressure >= state.config.opsoLimitBar - 0.5) {
      anomalies.push({
        id: `anom-opso-${t}`,
        timestamp: new Date().toISOString(),
        type: 'OPSO_WARNING',
        severity: 'CRITICAL',
        message: `Regulated outlet pressure (${state.outletPressure} bar) approaching Over-Pressure Slam-Shut trip limit (${state.config.opsoLimitBar} bar)!`,
        tag: 'PIT-102',
        currentValue: state.outletPressure,
        thresholdValue: state.config.opsoLimitBar,
        unit: 'Bar',
        suggestedAction: 'Verify pilot sensing line and check if primary regulator diaphragm has ruptured.',
      });
    }

    // Stream status logic
    const isStreamA = state.activeStream === 'STREAM_A';
    const valveAOpen = state.esdStatus === 'TRIPPED' ? 0 : isStreamA ? 68 + Math.sin(t * 0.1) * 6 : 0;
    const valveBOpen = state.esdStatus === 'TRIPPED' ? 0 : !isStreamA ? 65 + Math.cos(t * 0.1) * 5 : 0;

    // 4-Layer IoT Architecture Signal Synthesis
    // Layer 1: Physical sensing signals
    // Yokogawa EJA530E: 4-20 mA current output
    const rawInletMa = Number((4.0 + (state.inletPressure / 100.0) * 16.0).toFixed(2));
    const rawOutletMa = Number((4.0 + (state.outletPressure / 40.0) * 16.0).toFixed(2));
    
    // PT100 RTD in Thermowell: R = 100 + 0.385 * T_c
    const rawPtdResistanceOhm = Number((100.0 + 0.385 * outletTemp).toFixed(2));
    
    // ADXL345 3-Axis Accelerometer (attached to regulator body)
    const rawAdxlRegisters = {
      x: Math.round(vibration.vx * 32.5),
      y: Math.round(vibration.vy * 32.5),
      z: Math.round(vibration.vz * 32.5),
    };

    const sensingHardware = {
      inletTransmitter: {
        model: 'Yokogawa EJA530E' as const,
        signalType: '4-20 mA Current Loop (HART)' as const,
        currentMa: rawInletMa,
        measuredBar: state.inletPressure,
      },
      outletTransmitter: {
        model: 'Yokogawa EJA530E' as const,
        signalType: '4-20 mA Current Loop (HART)' as const,
        currentMa: rawOutletMa,
        measuredBar: state.outletPressure,
      },
      thermowellSensor: {
        model: 'PT100 RTD Duplex Sensor' as const,
        signalType: 'Resistance (DIN EN 60751)' as const,
        resistanceOhm: rawPtdResistanceOhm,
        temperatureC: outletTemp,
      },
      accelerometer: {
        model: 'ADXL345 3-Axis Digital Accelerometer' as const,
        signalType: 'I2C / SPI Register Stream' as const,
        rawRegisters: rawAdxlRegisters,
        rmsVelocityMmS: vibration.overallRms,
      },
    };

    // Layer 2 & 3: Edge JSON Payload created by ESP32 / Raspberry Pi Industrial Gateway
    const edgePayload = {
      node_id: stationId,
      timestamp: new Date().toISOString(),
      inlet_pressure_bar: Number(state.inletPressure.toFixed(1)),
      outlet_pressure_bar: Number(state.outletPressure.toFixed(1)),
      gas_temp_c: Number(outletTemp.toFixed(1)),
      vibration_rms: Number(vibration.overallRms.toFixed(2)),
      protocol: 'MQTT (Mosquitto)' as const,
      mqttTopic: state.config.mqttBrokerTopic,
      gatewayHardware: (state.config.gatewayType === 'ESP32-S3'
        ? 'ESP32-S3 Industrial Gateway'
        : 'Raspberry Pi CM4 Industrial') as 'ESP32-S3 Industrial Gateway' | 'Raspberry Pi CM4 Industrial',
      samplingIntervalMs: 500,
    };

    // Active Anomaly Flag calculation
    let anomalyFlag: ActiveAnomalyFlag = 'NORMAL';
    if (state.inletPressure <= 35.0 || state.activeFault === 'PIPELINE_DROP') {
      anomalyFlag = 'CRITICAL PIPELINE DROP';
    } else if (vibration.overallRms >= 4.5 || state.activeFault === 'VALVE_CHATTER' || state.activeFault === 'CAVITATION_VIBRATION') {
      anomalyFlag = 'VALVE CHATTER DETECTED';
    } else if (hydrateRiskPercent > 60) {
      anomalyFlag = 'HYDRATE FREEZE HAZARD';
    } else if (filterDiffPressure > 0.8) {
      anomalyFlag = 'FILTER SATURATION SURGE';
    }

    const point: TelemetryPoint = {
      timestamp: new Date().toISOString(),
      timestampMs: Date.now(),
      stationId,
      inletPressure: state.inletPressure,
      filterDiffPressure,
      filterStatus,
      outletPressure: state.outletPressure,
      outletPressureSetpoint: state.outletSetpoint,
      inletTemp: Number(inletTemp.toFixed(1)),
      waterBathTemp: state.waterBathTemp,
      outletTemp,
      jouleThomsonDrop,
      hydrateRiskPercent,
      flowRate: finalFlow,
      flowRateMMSCFD,
      dailyCumulativeSm3: Math.round(state.dailyVolume),
      activeStream: state.activeStream,
      streamA: {
        valveOpenPercent: Math.round(valveAOpen),
        status: state.esdStatus === 'TRIPPED' ? 'TRIPPED' : isStreamA ? 'DUTY' : 'STANDBY',
      },
      streamB: {
        valveOpenPercent: Math.round(valveBOpen),
        status: state.esdStatus === 'TRIPPED' ? 'TRIPPED' : !isStreamA ? 'DUTY' : 'STANDBY',
      },
      esdStatus: state.esdStatus,
      vibration,
      edgePayload,
      sensingHardware,
      anomalyFlag,
      anomalies,
      activeAlarmsCount: db.getAlarms(stationId).filter((a) => !a.acknowledged).length,
    };

    // Store in history buffer (keep last 120 points)
    const history = this.historyBuffers.get(stationId) || [];
    history.push(point);
    if (history.length > 120) {
      history.shift();
    }
    this.historyBuffers.set(stationId, history);

    return point;
  }

  private generateVibrationTelemetry(state: StationRuntimeState, t: number): VibrationTelemetry {
    const isCavitation = state.activeFault === 'CAVITATION_VIBRATION';
    const isChatter = state.activeFault === 'VALVE_CHATTER';
    const isFault = isCavitation || isChatter;

    let baseline = 1.35;
    let faultMultiplier = 1.0;
    let dominantFreq = 120; // 120 Hz aerodynamic turbulence

    if (isChatter) {
      state.faultTimer++;
      faultMultiplier = 5.2 + Math.sin(t * 0.7) * 1.6;
      dominantFreq = 380; // 380 Hz mechanical valve chatter & seat impact
    } else if (isCavitation) {
      state.faultTimer++;
      faultMultiplier = 4.8 + Math.sin(t * 0.6) * 1.5;
      dominantFreq = 480; // 480 Hz acoustic trim resonance
    }

    const vx = Number((baseline * 0.8 * faultMultiplier + Math.sin(t * 0.8) * 0.25 + (Math.random() - 0.5) * 0.2).toFixed(2));
    const vy = Number((baseline * 0.95 * faultMultiplier + Math.cos(t * 0.7) * 0.3 + (Math.random() - 0.5) * 0.2).toFixed(2));
    const vz = Number((baseline * 1.15 * faultMultiplier + Math.sin(t * 0.9) * 0.35 + (Math.random() - 0.5) * 0.25).toFixed(2));

    const overallRms = Number(Math.sqrt((vx * vx + vy * vy + vz * vz) / 3 * 2).toFixed(2));
    const peakAccelerationG = Number((overallRms * 0.32 + (Math.random() * 0.1)).toFixed(2));

    let isoZone: ISOZone = 'A';
    let severityDescription = 'Zone A (< 2.3 mm/s): Rigid, pristine mechanical condition';

    if (overallRms >= 7.1) {
      isoZone = 'D';
      severityDescription = 'Zone D (> 7.1 mm/s): DANGER - Severe Cavitation & High-Frequency Trim Flutter';
    } else if (overallRms >= 4.5) {
      isoZone = 'C';
      severityDescription = 'Zone C (4.5 - 7.1 mm/s): ALERT - Unrestricted operation restricted; fatigue damage';
    } else if (overallRms >= 2.3) {
      isoZone = 'B';
      severityDescription = 'Zone B (2.3 - 4.5 mm/s): SATISFACTORY - Continuous industrial operation permitted';
    }

    // Generate 32-bin FFT spectrum
    const fftSpectrum: number[] = [];
    for (let i = 0; i < 32; i++) {
      const centerHz = 15 + i * 31;
      let amp = 0.15 + (Math.random() * 0.1);

      // Normal peaks
      if (Math.abs(centerHz - 120) < 30) amp += 0.8;
      if (Math.abs(centerHz - 240) < 35) amp += 0.45;

      // Fault resonance peak at ~480 Hz
      if (isFault) {
        if (Math.abs(centerHz - 480) < 50) amp += 4.5;
        if (centerHz > 600) amp += 1.8; // High frequency cavitation hiss
      }

      fftSpectrum.push(Number(amp.toFixed(2)));
    }

    return {
      vx,
      vy,
      vz,
      overallRms,
      peakAccelerationG,
      dominantFrequencyHz: dominantFreq,
      kurtosis: isFault ? 4.9 : 2.8,
      crestFactor: isFault ? 5.2 : 3.4,
      isoZone,
      severityDescription,
      fftSpectrum,
    };
  }

  private triggerSCADAAlarmOnce(
    stationId: string,
    tag: string,
    severity: 'CRITICAL' | 'WARNING' | 'INFO',
    title: string,
    message: string,
    value: string,
    threshold: string
  ) {
    const active = db.getAlarms(stationId).find((a) => a.tag === tag && !a.acknowledged);
    if (!active) {
      db.addAlarm({
        stationId,
        timestamp: new Date().toISOString(),
        severity,
        tag,
        title,
        message,
        value,
        threshold,
        acknowledged: false,
      });
    }
  }
}

export const telemetryEngine = new TelemetryEngine();
