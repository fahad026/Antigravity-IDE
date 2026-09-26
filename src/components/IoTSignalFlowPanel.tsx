import React, { useState } from 'react';
import {
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  Copy,
  Check,
  Activity,
  Wifi,
  Zap,
  Gauge,
  Thermometer,
  Waves,
  ShieldAlert,
  ArrowRight,
  Radio,
  Server,
  X,
  FileCode,
  HardDrive
} from 'lucide-react';
import type { TelemetryPoint, StationConfig } from '../types/telemetry';

interface IoTSignalFlowPanelProps {
  telemetry: TelemetryPoint;
  station: StationConfig;
  isOpen: boolean;
  onClose: () => void;
  onTriggerFault?: (fault: 'PIPELINE_DROP' | 'VALVE_CHATTER' | 'NORMAL') => void;
}

export const IoTSignalFlowPanel: React.FC<IoTSignalFlowPanelProps> = ({
  telemetry,
  station,
  isOpen,
  onClose,
  onTriggerFault,
}) => {
  const [copiedJson, setCopiedJson] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL_STEPS' | 'PAYLOAD_JSON'>('ALL_STEPS');

  if (!isOpen) return null;

  const sensing = telemetry.sensingHardware || {
    inletTransmitter: {
      model: 'Yokogawa EJA530E',
      signalType: '4-20 mA Current Loop (HART)',
      currentMa: Number((4.0 + (telemetry.inletPressure / 100.0) * 16.0).toFixed(2)),
      measuredBar: telemetry.inletPressure,
    },
    outletTransmitter: {
      model: 'Yokogawa EJA530E',
      signalType: '4-20 mA Current Loop (HART)',
      currentMa: Number((4.0 + (telemetry.outletPressure / 40.0) * 16.0).toFixed(2)),
      measuredBar: telemetry.outletPressure,
    },
    thermowellSensor: {
      model: 'PT100 RTD Duplex Sensor',
      signalType: 'Resistance (DIN EN 60751)',
      resistanceOhm: Number((100.0 + 0.385 * telemetry.outletTemp).toFixed(2)),
      temperatureC: telemetry.outletTemp,
    },
    accelerometer: {
      model: 'ADXL345 3-Axis Digital Accelerometer',
      signalType: 'I2C / SPI Register Stream',
      rawRegisters: {
        x: Math.round(telemetry.vibration.vx * 32.5),
        y: Math.round(telemetry.vibration.vy * 32.5),
        z: Math.round(telemetry.vibration.vz * 32.5),
      },
      rmsVelocityMmS: telemetry.vibration.overallRms,
    },
  };

  const edgePayload = telemetry.edgePayload || {
    node_id: station.id,
    timestamp: telemetry.timestamp,
    inlet_pressure_bar: Number(telemetry.inletPressure.toFixed(1)),
    outlet_pressure_bar: Number(telemetry.outletPressure.toFixed(1)),
    gas_temp_c: Number(telemetry.outletTemp.toFixed(1)),
    vibration_rms: Number(telemetry.vibration.overallRms.toFixed(2)),
    protocol: 'MQTT (Mosquitto)',
    mqttTopic: station.mqttBrokerTopic,
    gatewayHardware: station.gatewayType === 'ESP32-S3' ? 'ESP32-S3 Industrial Gateway' : 'Raspberry Pi CM4 Industrial',
    samplingIntervalMs: 500,
  };

  // Formatted JSON string exactly conforming to user's specification:
  // { "node_id": "RMS-Station-04", "timestamp": "...", "inlet_pressure_bar": 65.4, "outlet_pressure_bar": 12.1, "gas_temp_c": 28.3, "vibration_rms": 1.45 }
  const cleanUserJson = JSON.stringify(
    {
      node_id: edgePayload.node_id,
      timestamp: edgePayload.timestamp,
      inlet_pressure_bar: edgePayload.inlet_pressure_bar,
      outlet_pressure_bar: edgePayload.outlet_pressure_bar,
      gas_temp_c: edgePayload.gas_temp_c,
      vibration_rms: edgePayload.vibration_rms,
    },
    null,
    2
  );

  const handleCopyJson = () => {
    navigator.clipboard.writeText(cleanUserJson);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const isAnomaly = telemetry.anomalyFlag !== 'NORMAL';
  const isPipelineDrop = telemetry.anomalyFlag === 'CRITICAL PIPELINE DROP';
  const isValveChatter = telemetry.anomalyFlag === 'VALVE CHATTER DETECTED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-[#0b111e] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 font-sans">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-[#070b14]/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Layers className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  4-STAGE IOT ARCHITECTURE
                </span>
                <span className="text-xs text-slate-400 font-mono">Physical Signal &rarr; Live SCADA Screen</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                Gas RMS End-to-End Industrial IoT Pipeline
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher tabs */}
            <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveTab('ALL_STEPS')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'ALL_STEPS'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                4-Stage Pipeline
              </button>
              <button
                onClick={() => setActiveTab('PAYLOAD_JSON')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors ${
                  activeTab === 'PAYLOAD_JSON'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                Raw Edge JSON
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Real-time Status Alert Banner */}
          <div
            className={`p-3 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isPipelineDrop
                ? 'bg-rose-500/20 border-rose-500 text-rose-200 animate-pulse'
                : isValveChatter
                ? 'bg-amber-500/20 border-amber-500 text-amber-200 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {isAnomaly ? (
                <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              )}
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                  <span>SYSTEM FLAG:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                      isAnomaly ? 'bg-rose-600 text-white' : 'bg-emerald-600/30 text-emerald-300'
                    }`}
                  >
                    {telemetry.anomalyFlag}
                  </span>
                </div>
                <div className="text-xs mt-0.5 opacity-90">
                  {isPipelineDrop
                    ? 'Yokogawa EJA530E inlet pressure dropped below safe threshold (≤ 35 Bar). Anomaly engine flagged CRITICAL PIPELINE DROP.'
                    : isValveChatter
                    ? 'ADXL345 accelerometer measured high-frequency seat vibration (≥ 4.5 mm/s RMS). Anomaly engine flagged VALVE CHATTER DETECTED.'
                    : 'All physical signals (4-20mA, PT100 Resistance, ADXL345 I2C) within safety margins.'}
                </div>
              </div>
            </div>

            {/* Quick Test Trigger Controls */}
            {onTriggerFault && (
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => onTriggerFault('PIPELINE_DROP')}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600 border border-rose-500 text-[11px] font-mono font-bold text-rose-200 hover:text-white transition-all cursor-pointer"
                  title="Simulate sudden inlet pressure collapse from 65 to 20 bar"
                >
                  TEST PIPELINE DROP
                </button>
                <button
                  onClick={() => onTriggerFault('VALVE_CHATTER')}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600 border border-amber-500 text-[11px] font-mono font-bold text-amber-200 hover:text-white transition-all cursor-pointer"
                  title="Simulate severe regulator valve seat flutter"
                >
                  TEST VALVE CHATTER
                </button>
                <button
                  onClick={() => onTriggerFault('NORMAL')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition-all cursor-pointer"
                >
                  RESET
                </button>
              </div>
            )}
          </div>

          {activeTab === 'ALL_STEPS' ? (
            <div className="space-y-6">
              {/* STAGE 1: Sensing Layer */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-extrabold font-mono">
                      1
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>ধাপ ১: পাইপলাইন থেকে রিয়েল-টাইম সিগন্যাল সংগ্রহ</span>
                        <span className="text-xs text-amber-400 font-mono font-normal">
                          (Sensing Layer)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Physical pressure, temperature & mechanical vibrations converted to analog 4–20 mA current and digital I2C bus signals.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                    Transmission: 4-20mA Current Loop / I2C Bus
                  </span>
                </div>

                {/* 3 Hardware Sensor Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
                  {/* Yokogawa EJA530E */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5" /> Pressure Transmitter
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          PIT-101 / PIT-102
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">Yokogawa EJA530E</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Inlet and outlet pipeline mounting. Measures live gas pressure into standard 4-20 mA current loop.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Inlet Current:</span>
                        <span className="text-amber-300 font-bold">
                          {sensing.inletTransmitter.currentMa} mA ({telemetry.inletPressure.toFixed(1)} bar)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Outlet Current:</span>
                        <span className="text-cyan-300 font-bold">
                          {sensing.outletTransmitter.currentMa} mA ({telemetry.outletPressure.toFixed(1)} bar)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PT100 RTD Sensor */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="font-bold text-purple-400 flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5" /> Thermowell RTD
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          TIT-101 / TE-101
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">PT100 RTD Sensor</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Embedded in pipeline thermowell. Platinum resistance varies predictably with gas temperature (DIN EN 60751).
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Resistance:</span>
                        <span className="text-purple-300 font-bold">
                          {sensing.thermowellSensor.resistanceOhm} &Omega;
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Calibrated Temp:</span>
                        <span className="text-white font-bold">{telemetry.outletTemp.toFixed(1)} &deg;C</span>
                      </div>
                    </div>
                  </div>

                  {/* ADXL345 Accelerometer */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                        <span className="font-bold text-rose-400 flex items-center gap-1.5">
                          <Waves className="w-3.5 h-3.5" /> Accelerometer
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          VIT-101 (Valve Body)
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white">ADXL345 Accelerometer</div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Bolted to PCV-101 regulator valve bonnet. Measures 3-axis mechanical vibration amplitude & frequency.
                      </p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1 font-mono text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Raw Registers:</span>
                        <span className="text-slate-300 text-[11px]">
                          X:{sensing.accelerometer.rawRegisters.x} Y:{sensing.accelerometer.rawRegisters.y} Z:{sensing.accelerometer.rawRegisters.z}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vibration RMS:</span>
                        <span
                          className={`font-bold ${
                            telemetry.vibration.overallRms >= 4.5 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {telemetry.vibration.overallRms.toFixed(2)} mm/s (Zone {telemetry.vibration.isoZone})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transition arrow 1 -> 2 */}
              <div className="flex items-center justify-center -my-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  <span>ADC Sampling & I2C Bus Read</span>
                  <ArrowRight className="w-3 h-3 text-cyan-400" />
                </div>
              </div>

              {/* STAGE 2: Edge Processing Layer */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-xs font-extrabold font-mono">
                      2
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>ধাপ ২: সিগন্যাল প্রসেসিং ও ডেটা এনকোডিং</span>
                        <span className="text-xs text-cyan-400 font-mono font-normal">
                          (Edge Processing Layer)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        {station.gatewayType === 'ESP32-S3' ? 'ESP32-S3' : 'Raspberry Pi CM4'} Gateway controller converts raw signals to engineering units and generates compact JSON payload.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5" />
                      {station.gatewayType === 'ESP32-S3' ? 'ESP32-S3 Dual-Core' : 'Raspberry Pi CM4'}
                    </span>
                    <span className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                      Cadence: 500 ms
                    </span>
                  </div>
                </div>

                {/* Edge Payload Code Block */}
                <div className="mt-4 bg-[#050811] border border-slate-800 rounded-lg p-3.5 relative font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pb-2 border-b border-slate-800/70 mb-2">
                    <span>Generated JSON Payload (Every 500ms)</span>
                    <button
                      onClick={handleCopyJson}
                      className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJson ? 'COPIED' : 'COPY JSON'}</span>
                    </button>
                  </div>
                  <pre className="text-cyan-300 overflow-x-auto leading-relaxed">
                    {cleanUserJson}
                  </pre>
                </div>
              </div>

              {/* Transition arrow 2 -> 3 */}
              <div className="flex items-center justify-center -my-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  <Wifi className="w-3 h-3 text-blue-400" />
                  <span>MQTT / HTTP REST API Protocol Transmission</span>
                  <ArrowRight className="w-3 h-3 text-blue-400" />
                </div>
              </div>

              {/* STAGE 3: Network & Backend Layer */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 text-xs font-extrabold font-mono">
                      3
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>ধাপ ৩: ক্লাউড বা সার্ভারে ডেটা ট্রান্সমিশন</span>
                        <span className="text-xs text-blue-400 font-mono font-normal">
                          (Network & Backend Layer)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Gateway transmits JSON over Wi-Fi / Industrial Ethernet / GSM to Python Backend for storage & anomaly analysis.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-blue-400" />
                    MQTT Broker: Mosquitto ({station.mqttBrokerTopic})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Task 1: Storage */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-300 mb-1">
                      <Database className="w-4 h-4 text-blue-400" />
                      <span>1. Storage (Database Engine)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Logs time-stamped telemetry frames into SQLite / PostgreSQL persistence tables for historical trending, custody transfer audits & audit logs.
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Database Status:</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <HardDrive className="w-3 h-3" /> PERSISTED (1 Hz Buffer)
                      </span>
                    </div>
                  </div>

                  {/* Task 2: Anomaly Engine */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-purple-300 mb-1">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span>2. Anomaly Engine (Rule Algorithm)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Evaluates whether any parameter breaches safety boundaries (e.g. inlet pressure plunging from 60+ to 20 bar indicates line breach).
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Rule Engine Check:</span>
                      <span
                        className={`font-bold ${
                          isAnomaly ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                        }`}
                      >
                        {isAnomaly ? 'BREACH DETECTED!' : 'ALL ENVELOPES NOMINAL'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transition arrow 3 -> 4 */}
              <div className="flex items-center justify-center -my-3">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  <Server className="w-3 h-3 text-emerald-400" />
                  <span>WebSockets / Server-Sent Events (SSE) Push</span>
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                </div>
              </div>

              {/* STAGE 4: Visualization & Automatic Alerts */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 sm:p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-extrabold font-mono">
                      4
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>ধাপ ৪: ভিজ্যুয়ালাইজেশন ও স্বয়ংক্রিয় অ্যালার্ট</span>
                        <span className="text-xs text-emerald-400 font-mono font-normal">
                          (Antigravity Dashboard UI)
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Processed data renders instantly on live gauges & charts without page refresh. Status badges transition dynamically.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-md text-xs font-mono font-bold border transition-colors ${
                        isAnomaly
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                          : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      }`}
                    >
                      {telemetry.anomalyFlag}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400">Inlet Pressure</div>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">
                      {telemetry.inletPressure.toFixed(1)} Bar
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Normal: 60 - 75 Bar</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400">Outlet Pressure</div>
                    <div className="text-lg font-bold text-cyan-400 mt-0.5">
                      {telemetry.outletPressure.toFixed(1)} Bar
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Setpoint: {telemetry.outletPressureSetpoint.toFixed(1)} Bar</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400">Gas Temperature</div>
                    <div className="text-lg font-bold text-purple-400 mt-0.5">
                      {telemetry.outletTemp.toFixed(1)} &deg;C
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">Hydrate Limit: 3.0 &deg;C</div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                    <div className="text-slate-400">Vibration RMS</div>
                    <div
                      className={`text-lg font-bold mt-0.5 ${
                        telemetry.vibration.overallRms >= 4.5 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {telemetry.vibration.overallRms.toFixed(2)} mm/s
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">ISO Zone: {telemetry.vibration.isoZone}</div>
                  </div>
                </div>

                {/* Active Anomaly Alerts Log snippet */}
                {telemetry.anomalies.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-rose-950/30 border border-rose-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-rose-300">
                      <Activity className="w-3.5 h-3.5 text-rose-400" />
                      <span>LIVE AUTOMATIC ALERTS LOG ENTRY</span>
                    </div>
                    {telemetry.anomalies.map((anom) => (
                      <div key={anom.id} className="text-xs text-rose-200/90 font-mono flex items-start gap-2">
                        <span className="text-rose-400 font-bold">[{anom.severity}]</span>
                        <span>{anom.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* PAYLOAD JSON TAB */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Full Industrial Gateway Edge JSON Object</h3>
                  <p className="text-xs text-slate-400">
                    This JSON payload is assembled at the edge ({station.gatewayType}) and transmitted via MQTT Mosquitto broker to the central server.
                  </p>
                </div>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedJson ? 'COPIED TO CLIPBOARD' : 'COPY JSON'}</span>
                </button>
              </div>

              <div className="bg-[#050811] border border-cyan-500/30 rounded-xl p-4 font-mono text-xs text-cyan-300 overflow-x-auto shadow-inner">
                <pre>{cleanUserJson}</pre>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">MQTT Broker Configuration:</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Broker Protocol:</span>
                    <span className="text-slate-200">MQTT v3.1.1 / v5.0 (TCP/TLS)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Topic:</span>
                    <span className="text-cyan-300">{station.mqttBrokerTopic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">QoS Level:</span>
                    <span className="text-slate-200">1 (At Least Once Delivery)</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="text-slate-400 font-bold">Edge Controller Specs:</div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hardware Node:</span>
                    <span className="text-slate-200">{edgePayload.gatewayHardware}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Station Node ID:</span>
                    <span className="text-cyan-300">{edgePayload.node_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Telemetry Rate:</span>
                    <span className="text-emerald-400 font-bold">{edgePayload.samplingIntervalMs} ms interval</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#070b14]/90 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Industrial IoT Loop: Sensing &rarr; Gateway &rarr; MQTT/Database &rarr; Antigravity UI</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
