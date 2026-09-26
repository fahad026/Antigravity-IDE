export type ISOZone = 'A' | 'B' | 'C' | 'D';
export type AlarmSeverity = 'CRITICAL' | 'WARNING' | 'INFO';
export type FilterHealthStatus = 'CLEAN' | 'NORMAL' | 'WARNING' | 'CRITICAL';
export type StreamMode = 'STREAM_A' | 'STREAM_B' | 'PARALLEL' | 'BYPASS';
export type ValveStatus = 'DUTY' | 'STANDBY' | 'TRIPPED' | 'ISOLATED';
export type ESDStatus = 'ARMED' | 'TRIPPED';

export type ActiveAnomalyFlag =
  | 'NORMAL'
  | 'CRITICAL PIPELINE DROP'
  | 'VALVE CHATTER DETECTED'
  | 'HYDRATE FREEZE HAZARD'
  | 'FILTER SATURATION SURGE';

export interface StationConfig {
  id: string;
  name: string;
  code: string;
  location: string;
  ansiClass: string;
  maopBar: number; // Maximum Allowable Operating Pressure (bar)
  designFlowCapacity: number; // Sm3/h
  nominalInletBar: number;
  nominalOutletBar: number;
  opsoLimitBar: number; // Over-Pressure Slam-Shut Limit
  upsoLimitBar: number; // Under-Pressure Slam-Shut Limit
  maxVibrationMmS: number; // ISO 10816 Zone C/D threshold
  minPreheatTempC: number;
  gatewayType: 'ESP32-S3' | 'Raspberry Pi CM4';
  mqttBrokerTopic: string;
}

export interface EdgeGatewayPayload {
  node_id: string;
  timestamp: string;
  inlet_pressure_bar: number;
  outlet_pressure_bar: number;
  gas_temp_c: number;
  vibration_rms: number;
  protocol: 'MQTT (Mosquitto)' | 'HTTP REST API';
  mqttTopic: string;
  gatewayHardware: 'ESP32-S3 Industrial Gateway' | 'Raspberry Pi CM4 Industrial';
  samplingIntervalMs: number;
}

export interface HardwareSensingLayer {
  inletTransmitter: {
    model: 'Yokogawa EJA530E';
    signalType: '4-20 mA Current Loop (HART)';
    currentMa: number;
    measuredBar: number;
  };
  outletTransmitter: {
    model: 'Yokogawa EJA530E';
    signalType: '4-20 mA Current Loop (HART)';
    currentMa: number;
    measuredBar: number;
  };
  thermowellSensor: {
    model: 'PT100 RTD Duplex Sensor';
    signalType: 'Resistance (DIN EN 60751)';
    resistanceOhm: number;
    temperatureC: number;
  };
  accelerometer: {
    model: 'ADXL345 3-Axis Digital Accelerometer';
    signalType: 'I2C / SPI Register Stream';
    rawRegisters: { x: number; y: number; z: number };
    rmsVelocityMmS: number;
  };
}

export interface VibrationTelemetry {
  vx: number; // mm/s RMS (X-axis)
  vy: number; // mm/s RMS (Y-axis)
  vz: number; // mm/s RMS (Z-axis)
  overallRms: number; // mm/s RMS combined vector
  peakAccelerationG: number; // g peak
  dominantFrequencyHz: number; // Hz
  kurtosis: number;
  crestFactor: number;
  isoZone: ISOZone;
  severityDescription: string;
  fftSpectrum: number[]; // 32 frequency bins from 10Hz to 1000Hz
}

export interface AnomalyRecord {
  id: string;
  timestamp: string;
  type: 'PIPELINE_DROP' | 'VALVE_CHATTER' | 'VIBRATION_SPIKE' | 'HYDRATE_FREEZE_RISK' | 'FILTER_CLOG' | 'PRESSURE_DEVIATION' | 'OPSO_WARNING';
  severity: AlarmSeverity;
  message: string;
  tag: string;
  currentValue: number;
  thresholdValue: number;
  unit: string;
  suggestedAction: string;
}

export interface TelemetryPoint {
  timestamp: string;
  timestampMs: number;
  stationId: string;
  
  // Pressures (Bar)
  inletPressure: number;
  filterDiffPressure: number;
  filterStatus: FilterHealthStatus;
  outletPressure: number;
  outletPressureSetpoint: number;
  
  // Temperatures (°C)
  inletTemp: number;
  waterBathTemp: number;
  outletTemp: number;
  jouleThomsonDrop: number;
  hydrateRiskPercent: number; // 0 - 100%
  
  // Flow
  flowRate: number; // Sm3/h
  flowRateMMSCFD: number; // Million Standard Cubic Feet per Day
  dailyCumulativeSm3: number;
  
  // Stream & Valve states
  activeStream: StreamMode;
  streamA: {
    valveOpenPercent: number;
    status: ValveStatus;
  };
  streamB: {
    valveOpenPercent: number;
    status: ValveStatus;
  };
  esdStatus: ESDStatus;
  
  // Vibration
  vibration: VibrationTelemetry;

  // 4-Layer IoT Architecture Metadata
  edgePayload: EdgeGatewayPayload;
  sensingHardware: HardwareSensingLayer;
  anomalyFlag: ActiveAnomalyFlag;
  
  // Detected anomalies in this cycle
  anomalies: AnomalyRecord[];
  activeAlarmsCount: number;
}

export interface AlarmItem {
  id: string;
  stationId: string;
  timestamp: string;
  severity: AlarmSeverity;
  tag: string;
  title: string;
  message: string;
  value: string;
  threshold: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  operatorNote?: string;
}

export interface ControlPayload {
  action: 'SET_OUTLET_SETPOINT' | 'SWITCH_STREAM' | 'TRIGGER_ESD' | 'RESET_ESD' | 'INJECT_FAULT' | 'CLEAR_FAULT';
  stationId: string;
  setpointBar?: number;
  targetStream?: StreamMode;
  faultType?: 'PIPELINE_DROP' | 'VALVE_CHATTER' | 'CAVITATION_VIBRATION' | 'PREHEATER_FLAMEOUT' | 'FILTER_CLOGGED' | 'PRESSURE_SURGE' | 'NORMAL';
  operator?: string;
}

export interface UnitPreferences {
  pressure: 'BAR' | 'PSI';
  temperature: 'C' | 'F';
  flow: 'SM3H' | 'MMSCFD';
  vibration: 'MMS' | 'IPS'; // mm/s vs in/s
}
