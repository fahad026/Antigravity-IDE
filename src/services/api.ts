import type {
  StationConfig,
  TelemetryPoint,
  AlarmItem,
  ControlPayload,
  ISOZone,
  FilterHealthStatus,
} from '../types/telemetry';
import { scadaAudio } from './audioAlerts';

export const FALLBACK_STATIONS: StationConfig[] = [
  {
    id: 'RMS-Station-04',
    name: 'RMS-Station-04 City Distribution Header',
    code: 'RMS-04-IOT',
    location: 'District 4 Gas Regulating Terminal',
    ansiClass: 'Class 600 (Yokogawa / PT100 / ADXL345 Sensing)',
    maopBar: 70.0,
    designFlowCapacity: 50000,
    nominalInletBar: 65.4,
    nominalOutletBar: 12.1,
    opsoLimitBar: 16.5,
    upsoLimitBar: 8.5,
    maxVibrationMmS: 4.5,
    minPreheatTempC: 45.0,
    gatewayType: 'ESP32-S3',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-Station-04',
  },
  {
    id: 'RMS-01',
    name: 'St. Clair North City Gate RMS',
    code: 'SC-RMS-01',
    location: 'Sector 4B Transmission Junction',
    ansiClass: 'Class 600 (ANSI 100 Bar Rating)',
    maopBar: 75.0,
    designFlowCapacity: 45000,
    nominalInletBar: 64.5,
    nominalOutletBar: 19.5,
    opsoLimitBar: 22.0,
    upsoLimitBar: 16.5,
    maxVibrationMmS: 4.5,
    minPreheatTempC: 45.0,
    gatewayType: 'Raspberry Pi CM4',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-01',
  },
  {
    id: 'RMS-02',
    name: 'Bayview Petrochem Industrial Feeder',
    code: 'BV-RMS-02',
    location: 'Bayview Chemical Corridor Pier 8',
    ansiClass: 'Class 900 (High Pressure Header)',
    maopBar: 88.0,
    designFlowCapacity: 80000,
    nominalInletBar: 74.0,
    nominalOutletBar: 28.0,
    opsoLimitBar: 31.5,
    upsoLimitBar: 24.0,
    maxVibrationMmS: 5.0,
    minPreheatTempC: 50.0,
    gatewayType: 'ESP32-S3',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-02',
  },
  {
    id: 'RMS-03',
    name: 'Highland CCGT Peaking Power RMS',
    code: 'HL-RMS-03',
    location: 'Highland Turbine Substation Enclosure',
    ansiClass: 'Class 300 / 600 Dual Stream',
    maopBar: 55.0,
    designFlowCapacity: 62000,
    nominalInletBar: 48.0,
    nominalOutletBar: 14.5,
    opsoLimitBar: 17.0,
    upsoLimitBar: 12.0,
    maxVibrationMmS: 4.0,
    minPreheatTempC: 42.0,
    gatewayType: 'Raspberry Pi CM4',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-03',
  }
];

class ApiClient {
  private isServerOnline: boolean = false;
  private eventSource: EventSource | null = null;
  private clientSimulationTimer: number | null = null;
  private stepCount: number = 0;
  private clientActiveFault: string | null = null;
  private clientFaultTimer: number = 0;
  private clientOutletSetpoint: number = 19.5;
  private clientActiveStream: 'STREAM_A' | 'STREAM_B' = 'STREAM_A';
  private clientEsdStatus: 'ARMED' | 'TRIPPED' = 'ARMED';
  private clientDailyVolume: number = 328400;

  // Local alarm store for standalone mode
  private localAlarms: AlarmItem[] = [
    {
      id: 'ALM-INIT-1',
      stationId: 'RMS-01',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      severity: 'INFO',
      tag: 'FIT-101',
      title: 'Ultrasonic Flow Range Verification',
      message: 'Flow velocity within nominal calibrated envelope (18,420 Sm3/h).',
      value: '18,420 Sm3/h',
      threshold: 'Nominal 45,000 max',
      acknowledged: true,
      acknowledgedBy: 'System Auto-Log',
      acknowledgedAt: new Date(Date.now() - 850000).toISOString(),
    },
    {
      id: 'ALM-INIT-2',
      stationId: 'RMS-01',
      timestamp: new Date(Date.now() - 320000).toISOString(),
      severity: 'WARNING',
      tag: 'PDT-101',
      title: 'Filter Coarse Differential Pressure Advisory',
      message: 'Cartridge strainer differential pressure approaching service threshold (0.42 bar).',
      value: '0.42 Bar',
      threshold: '> 0.70 Bar (Clean Recommended)',
      acknowledged: false,
    }
  ];

  public getIsServerOnline(): boolean {
    return this.isServerOnline;
  }

  public async fetchStations(): Promise<StationConfig[]> {
    try {
      const res = await fetch('/api/stations');
      if (res.ok) {
        const json = await res.json();
        this.isServerOnline = true;
        return json.data;
      }
    } catch {
      // Backend not yet reachable, use local fallback
    }
    this.isServerOnline = false;
    return FALLBACK_STATIONS;
  }

  public async fetchTelemetryHistory(stationId: string): Promise<TelemetryPoint[]> {
    try {
      const res = await fetch(`/api/telemetry/history?stationId=${stationId}&limit=60`);
      if (res.ok) {
        const json = await res.json();
        this.isServerOnline = true;
        return json.data;
      }
    } catch {
      // fallback
    }
    // Generate synthetic historical trace if server offline
    const now = Date.now();
    const history: TelemetryPoint[] = [];
    for (let i = 59; i >= 0; i--) {
      this.stepCount++;
      const p = this.generateLocalTelemetry(stationId, now - i * 1000);
      history.push(p);
    }
    return history;
  }

  public async fetchAlarms(stationId?: string): Promise<AlarmItem[]> {
    try {
      const url = stationId ? `/api/alarms?stationId=${stationId}` : '/api/alarms';
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
    } catch {
      // fallback
    }
    if (stationId) {
      return this.localAlarms.filter((a) => a.stationId === stationId);
    }
    return this.localAlarms;
  }

  public async acknowledgeAlarm(id: string, operator: string, note?: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/alarms/${id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator, note }),
      });
      if (res.ok) return true;
    } catch {
      // fallback
    }
    const alm = this.localAlarms.find((a) => a.id === id);
    if (alm) {
      alm.acknowledged = true;
      alm.acknowledgedBy = operator;
      alm.acknowledgedAt = new Date().toISOString();
      alm.operatorNote = note;
    }
    return true;
  }

  public async sendControlCommand(payload: ControlPayload): Promise<{ success: boolean; message: string }> {
    try {
      const res = await fetch(`/api/stations/${payload.stationId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // fallback
    }

    // Local handling
    if (payload.action === 'SET_OUTLET_SETPOINT' && payload.setpointBar) {
      this.clientOutletSetpoint = payload.setpointBar;
      return { success: true, message: `Setpoint adjusted to ${payload.setpointBar} bar (Local Engine)` };
    }
    if (payload.action === 'SWITCH_STREAM' && payload.targetStream) {
      this.clientActiveStream = payload.targetStream as 'STREAM_A' | 'STREAM_B';
      return { success: true, message: `Switched active stream to ${payload.targetStream} (Local Engine)` };
    }
    if (payload.action === 'TRIGGER_ESD') {
      this.clientEsdStatus = 'TRIPPED';
      this.localAlarms.unshift({
        id: `ALM-ESD-${Date.now()}`,
        stationId: payload.stationId,
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',
        tag: 'SSV-101',
        title: 'Manual ESD Slam-Shut Tripped',
        message: 'Station inlet slammed shut by operator action.',
        value: 'TRIPPED (0 Bar Downstream)',
        threshold: 'Armed / Open',
        acknowledged: false,
      });
      scadaAudio.playCriticalAlarm();
      return { success: true, message: 'EMERGENCY SHUTDOWN INITIATED (Local Engine)' };
    }
    if (payload.action === 'RESET_ESD') {
      this.clientEsdStatus = 'ARMED';
      this.clientActiveFault = null;
      return { success: true, message: 'ESD valve reset. Pipeline line-pack recovery sequence commencing.' };
    }
    if (payload.action === 'INJECT_FAULT') {
      this.clientActiveFault = payload.faultType || null;
      this.clientFaultTimer = 0;
      return { success: true, message: `Fault [${payload.faultType}] injected (Local Engine)` };
    }
    if (payload.action === 'CLEAR_FAULT') {
      this.clientActiveFault = null;
      this.clientFaultTimer = 0;
      return { success: true, message: 'Simulated faults cleared (Local Engine)' };
    }

    return { success: true, message: 'Action processed.' };
  }

  public subscribeTelemetry(stationId: string, onPoint: (point: TelemetryPoint) => void): () => void {
    let sseActive = false;

    // Attempt SSE connection
    try {
      this.eventSource = new EventSource('/api/telemetry/stream');
      
      this.eventSource.onopen = () => {
        this.isServerOnline = true;
        sseActive = true;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'TELEMETRY' && parsed.payload) {
            const point: TelemetryPoint = parsed.payload;
            if (point.stationId === stationId) {
              this.handleNewPointSounds(point);
              onPoint(point);
            }
          }
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isServerOnline = false;
        // Fallback to local simulation if SSE connection fails
        if (!this.clientSimulationTimer) {
          this.startClientSimulation(stationId, onPoint);
        }
      };
    } catch {
      this.isServerOnline = false;
      this.startClientSimulation(stationId, onPoint);
    }

    // Safety timeout: if SSE didn't connect within 1500ms, start local loop
    const fallbackTimer = window.setTimeout(() => {
      if (!sseActive && !this.clientSimulationTimer) {
        this.startClientSimulation(stationId, onPoint);
      }
    }, 1500);

    return () => {
      window.clearTimeout(fallbackTimer);
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      if (this.clientSimulationTimer) {
        window.clearInterval(this.clientSimulationTimer);
        this.clientSimulationTimer = null;
      }
    };
  }

  private startClientSimulation(stationId: string, onPoint: (point: TelemetryPoint) => void) {
    if (this.clientSimulationTimer) return;
    this.clientSimulationTimer = window.setInterval(() => {
      this.stepCount++;
      const point = this.generateLocalTelemetry(stationId, Date.now());
      this.handleNewPointSounds(point);
      onPoint(point);
    }, 1000);
  }

  private handleNewPointSounds(point: TelemetryPoint) {
    if (point.anomalies.some((a) => a.severity === 'CRITICAL') || point.vibration.isoZone === 'D') {
      scadaAudio.playCriticalAlarm();
    } else if (point.anomalies.some((a) => a.severity === 'WARNING') || point.vibration.isoZone === 'C') {
      scadaAudio.playWarningChime();
    }
  }

  private generateLocalTelemetry(stationId: string, timestampMs: number): TelemetryPoint {
    const station = FALLBACK_STATIONS.find((s) => s.id === stationId) || FALLBACK_STATIONS[0];
    const t = this.stepCount;

    const pressureNoise = Math.sin(t * 0.15) * 0.4 + (Math.random() - 0.5) * 0.25;
    const flowNoise = Math.cos(t * 0.1) * 350 + (Math.random() - 0.5) * 200;

    let targetInlet = station.nominalInletBar + pressureNoise;
    let targetWaterBath = 58.0 + Math.sin(t * 0.05) * 1.5;
    let targetFilterBase = 0.24 + Math.random() * 0.02;
    let targetFlow = station.designFlowCapacity * 0.42 + flowNoise;

    if (this.clientActiveFault === 'PIPELINE_DROP') {
      this.clientFaultTimer++;
      targetInlet = Math.max(18.5, station.nominalInletBar - this.clientFaultTimer * 3.8);
      targetFlow = Math.max(2000, targetFlow * 0.4);
    } else if (this.clientActiveFault === 'PREHEATER_FLAMEOUT') {
      this.clientFaultTimer++;
      targetWaterBath = Math.max(8.0, 58.0 - this.clientFaultTimer * 0.9);
    } else if (this.clientActiveFault === 'FILTER_CLOGGED') {
      this.clientFaultTimer++;
      targetFilterBase = Math.min(1.25, 0.24 + this.clientFaultTimer * 0.035);
    } else if (this.clientActiveFault === 'PRESSURE_SURGE') {
      this.clientFaultTimer++;
      targetInlet = Math.min(station.maopBar + 2.0, station.nominalInletBar + this.clientFaultTimer * 0.85);
    }

    const inletPressure = Number(targetInlet.toFixed(2));
    const waterBathTemp = Number(targetWaterBath.toFixed(1));

    let outletPressure = this.clientOutletSetpoint;
    if (this.clientEsdStatus === 'TRIPPED') {
      targetFlow = 0;
      outletPressure = 0;
    } else {
      outletPressure = Number((this.clientOutletSetpoint + (Math.random() - 0.5) * 0.12).toFixed(2));
    }

    const flowRatio = Math.max(0.1, targetFlow / station.designFlowCapacity);
    const filterDiffPressure = Number((targetFilterBase * Math.pow(flowRatio, 1.8)).toFixed(3));
    let filterStatus: FilterHealthStatus = 'CLEAN';
    if (filterDiffPressure > 0.85) filterStatus = 'CRITICAL';
    else if (filterDiffPressure > 0.60) filterStatus = 'WARNING';
    else if (filterDiffPressure > 0.35) filterStatus = 'NORMAL';

    const inletTemp = 13.5 + Math.sin(t * 0.02) * 0.8;
    const deltaP = Math.max(0, inletPressure - outletPressure);
    const jouleThomsonDrop = Number((deltaP * 0.48).toFixed(2));

    const heatExchangeCoeff = 0.68;
    const preHeatedGasTemp = inletTemp + (waterBathTemp - inletTemp) * heatExchangeCoeff * (1 / (1 + flowRatio * 0.3));
    const outletTemp = Number((preHeatedGasTemp - jouleThomsonDrop).toFixed(1));

    const hydrateThreshold = 8.9 * Math.log(Math.max(1, outletPressure)) - 16.5;
    const tempMargin = outletTemp - hydrateThreshold;
    let hydrateRiskPercent = 0;
    if (tempMargin < 0) {
      hydrateRiskPercent = 100;
    } else if (tempMargin < 6.0) {
      hydrateRiskPercent = Math.min(99, Math.round(((6.0 - tempMargin) / 6.0) * 100));
    } else {
      hydrateRiskPercent = Math.max(2, Math.round(5 - tempMargin * 0.3));
    }

    const finalFlow = Math.max(0, Math.round(targetFlow));
    const flowRateMMSCFD = Number(((finalFlow * 35.3147) / 1000000 * 24).toFixed(2));
    this.clientDailyVolume += finalFlow / 3600;

    // Vibration modeling
    const isCavitation = this.clientActiveFault === 'CAVITATION_VIBRATION';
    const isChatter = this.clientActiveFault === 'VALVE_CHATTER';
    const isVibFault = isCavitation || isChatter;

    let faultMultiplier = 1.0;
    let dominantFrequencyHz = 120;
    if (isChatter) {
      faultMultiplier = 5.2 + Math.sin(t * 0.7) * 1.6;
      dominantFrequencyHz = 380;
    } else if (isCavitation) {
      faultMultiplier = 4.8 + Math.sin(t * 0.6) * 1.5;
      dominantFrequencyHz = 480;
    }

    const vx = Number((1.1 * faultMultiplier + Math.sin(t * 0.8) * 0.25).toFixed(2));
    const vy = Number((1.3 * faultMultiplier + Math.cos(t * 0.7) * 0.3).toFixed(2));
    const vz = Number((1.5 * faultMultiplier + Math.sin(t * 0.9) * 0.35).toFixed(2));
    const overallRms = Number(Math.sqrt((vx * vx + vy * vy + vz * vz) / 3 * 2).toFixed(2));

    let isoZone: ISOZone = 'A';
    let severityDescription = 'Zone A (< 2.3 mm/s): Rigid, pristine mechanical condition';
    if (overallRms >= 7.1) {
      isoZone = 'D';
      severityDescription = 'Zone D (> 7.1 mm/s): DANGER - Severe Cavitation & High-Frequency Trim Flutter';
    } else if (overallRms >= 4.5) {
      isoZone = 'C';
      severityDescription = 'Zone C (4.5 - 7.1 mm/s): ALERT - Unrestricted operation restricted';
    } else if (overallRms >= 2.3) {
      isoZone = 'B';
      severityDescription = 'Zone B (2.3 - 4.5 mm/s): SATISFACTORY - Continuous industrial operation permitted';
    }

    const fftSpectrum: number[] = [];
    for (let i = 0; i < 32; i++) {
      const centerHz = 15 + i * 31;
      let amp = 0.15 + Math.random() * 0.1;
      if (Math.abs(centerHz - 120) < 30) amp += 0.8;
      if (isVibFault && Math.abs(centerHz - dominantFrequencyHz) < 50) amp += 4.5;
      fftSpectrum.push(Number(amp.toFixed(2)));
    }

    const anomalies = [];
    if (inletPressure <= 35.0 || this.clientActiveFault === 'PIPELINE_DROP') {
      anomalies.push({
        id: `anom-pdrop-${t}`,
        timestamp: new Date().toISOString(),
        type: 'PIPELINE_DROP' as const,
        severity: 'CRITICAL' as const,
        message: `CRITICAL PIPELINE DROP DETECTED! Inlet pressure plunged to ${inletPressure} bar (Major line leakage suspected).`,
        tag: 'PIT-101',
        currentValue: inletPressure,
        thresholdValue: 40.0,
        unit: 'Bar',
        suggestedAction: 'Trigger Master Emergency Slam-Shut Valve (ESD) to isolate pipeline section.',
      });
    }

    if (isChatter || isoZone === 'D') {
      anomalies.push({
        id: `anom-chatter-${t}`,
        timestamp: new Date().toISOString(),
        type: 'VALVE_CHATTER' as const,
        severity: 'CRITICAL' as const,
        message: 'VALVE CHATTER DETECTED! ADXL345 accelerometer registers severe high-frequency seat impact.',
        tag: 'VIT-101',
        currentValue: overallRms,
        thresholdValue: 7.1,
        unit: 'mm/s',
        suggestedAction: 'Execute hot switchover to Standby Stream B immediately.',
      });
    }

    if (hydrateRiskPercent > 75 || outletTemp <= 2.0) {
      anomalies.push({
        id: `anom-hyd-${t}`,
        timestamp: new Date().toISOString(),
        type: 'HYDRATE_FREEZE_RISK' as const,
        severity: 'CRITICAL' as const,
        message: `Gas outlet temperature (${outletTemp}°C) dropped below hydrate stability envelope!`,
        tag: 'TIT-102',
        currentValue: outletTemp,
        thresholdValue: 3.0,
        unit: '°C',
        suggestedAction: 'Verify water bath burner ignition to prevent freeze-up.',
      });
    }

    const isStreamA = this.clientActiveStream === 'STREAM_A';
    const valveAOpen = this.clientEsdStatus === 'TRIPPED' ? 0 : isStreamA ? 68 : 0;
    const valveBOpen = this.clientEsdStatus === 'TRIPPED' ? 0 : !isStreamA ? 65 : 0;

    // 4-Layer IoT Modeling
    const rawInletMa = Number((4.0 + (inletPressure / 100.0) * 16.0).toFixed(2));
    const rawOutletMa = Number((4.0 + (outletPressure / 40.0) * 16.0).toFixed(2));
    const rawPtdResistanceOhm = Number((100.0 + 0.385 * outletTemp).toFixed(2));
    const rawAdxlRegisters = {
      x: Math.round(vx * 32.5),
      y: Math.round(vy * 32.5),
      z: Math.round(vz * 32.5),
    };

    const sensingHardware = {
      inletTransmitter: {
        model: 'Yokogawa EJA530E' as const,
        signalType: '4-20 mA Current Loop (HART)' as const,
        currentMa: rawInletMa,
        measuredBar: inletPressure,
      },
      outletTransmitter: {
        model: 'Yokogawa EJA530E' as const,
        signalType: '4-20 mA Current Loop (HART)' as const,
        currentMa: rawOutletMa,
        measuredBar: outletPressure,
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
        rmsVelocityMmS: overallRms,
      },
    };

    const edgePayload = {
      node_id: stationId,
      timestamp: new Date().toISOString(),
      inlet_pressure_bar: Number(inletPressure.toFixed(1)),
      outlet_pressure_bar: Number(outletPressure.toFixed(1)),
      gas_temp_c: Number(outletTemp.toFixed(1)),
      vibration_rms: Number(overallRms.toFixed(2)),
      protocol: 'MQTT (Mosquitto)' as const,
      mqttTopic: station.mqttBrokerTopic,
      gatewayHardware: (station.gatewayType === 'ESP32-S3'
        ? 'ESP32-S3 Industrial Gateway'
        : 'Raspberry Pi CM4 Industrial') as 'ESP32-S3 Industrial Gateway' | 'Raspberry Pi CM4 Industrial',
      samplingIntervalMs: 500,
    };

    let anomalyFlag: any = 'NORMAL';
    if (inletPressure <= 35.0 || this.clientActiveFault === 'PIPELINE_DROP') {
      anomalyFlag = 'CRITICAL PIPELINE DROP';
    } else if (overallRms >= 4.5 || isChatter || isCavitation) {
      anomalyFlag = 'VALVE CHATTER DETECTED';
    } else if (hydrateRiskPercent > 60) {
      anomalyFlag = 'HYDRATE FREEZE HAZARD';
    } else if (filterDiffPressure > 0.8) {
      anomalyFlag = 'FILTER SATURATION SURGE';
    }

    return {
      timestamp: new Date(timestampMs).toISOString(),
      timestampMs,
      stationId,
      inletPressure,
      filterDiffPressure,
      filterStatus,
      outletPressure,
      outletPressureSetpoint: this.clientOutletSetpoint,
      inletTemp: Number(inletTemp.toFixed(1)),
      waterBathTemp,
      outletTemp,
      jouleThomsonDrop,
      hydrateRiskPercent,
      flowRate: finalFlow,
      flowRateMMSCFD,
      dailyCumulativeSm3: Math.round(this.clientDailyVolume),
      activeStream: this.clientActiveStream,
      streamA: {
        valveOpenPercent: valveAOpen,
        status: this.clientEsdStatus === 'TRIPPED' ? 'TRIPPED' : isStreamA ? 'DUTY' : 'STANDBY',
      },
      streamB: {
        valveOpenPercent: valveBOpen,
        status: this.clientEsdStatus === 'TRIPPED' ? 'TRIPPED' : !isStreamA ? 'DUTY' : 'STANDBY',
      },
      esdStatus: this.clientEsdStatus,
      vibration: {
        vx,
        vy,
        vz,
        overallRms,
        peakAccelerationG: Number((overallRms * 0.32).toFixed(2)),
        dominantFrequencyHz,
        kurtosis: isVibFault ? 4.9 : 2.8,
        crestFactor: isVibFault ? 5.2 : 3.4,
        isoZone,
        severityDescription,
        fftSpectrum,
      },
      sensingHardware,
      edgePayload,
      anomalyFlag,
      anomalies,
      activeAlarmsCount: this.localAlarms.filter((a) => !a.acknowledged).length,
    };
  }
}

export const api = new ApiClient();
