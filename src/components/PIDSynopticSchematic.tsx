import { useState } from 'react';
import {
  Activity,
  Sparkles,
  X
} from 'lucide-react';
import type { TelemetryPoint, StationConfig, UnitPreferences } from '../types/telemetry';
import { formatPressure, formatTemperature, formatFlow, formatVibration } from '../utils/units';

interface PIDSynopticSchematicProps {
  telemetry: TelemetryPoint;
  station: StationConfig;
  units: UnitPreferences;
  onOpenControls: () => void;
}

export const PIDSynopticSchematic: React.FC<PIDSynopticSchematicProps> = ({
  telemetry,
  station,
  units,
  onOpenControls,
}) => {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const isStreamA = telemetry.activeStream === 'STREAM_A';
  const isTripped = telemetry.esdStatus === 'TRIPPED';
  const isVibAlert = telemetry.vibration.isoZone === 'C' || telemetry.vibration.isoZone === 'D';

  // Sensor definitions for interactive inspection
  const sensorDetails: Record<
    string,
    { name: string; tag: string; location: string; range: string; value: string; status: string; desc: string }
  > = {
    'PIT-101': {
      name: 'Inlet Pressure Transmitter (Yokogawa EJA530E)',
      tag: 'PIT-101',
      location: 'Upstream Line-Pack Header (Manifold 1A)',
      range: `0.0 - 100.0 Bar (4-20mA HART Current Loop)`,
      value: `${formatPressure(telemetry.inletPressure, units.pressure)} [${telemetry.sensingHardware?.inletTransmitter.currentMa ?? '14.46'} mA]`,
      status: telemetry.inletPressure < 35 ? 'CRITICAL PIPELINE DROP' : 'NORMAL',
      desc: 'Mounted directly at pipeline inlet. Measures high-pressure transmission gas (60-75 bar) into a 4-20 mA industrial current loop for the ESP32 gateway ADC.',
    },
    'SSV-101': {
      name: 'Emergency Slam-Shut Safety Valve',
      tag: 'SSV-101',
      location: 'Station Primary Perimeter Isolation',
      range: 'Digital Safety Interlock (SIL-3)',
      value: isTripped ? 'TRIPPED / CLOSED' : 'ARMED / OPEN',
      status: isTripped ? 'CRITICAL TRIPPED' : 'ARMED',
      desc: 'High-speed slam-shut shutoff valve automatically triggers on overpressure (OPSO) or emergency shutdown.',
    },
    'PDT-101': {
      name: 'Filter Basket Differential Pressure Transmitter',
      tag: 'PDT-101',
      location: 'Dual Cartridge Separator / Strainer (FLT-101)',
      range: '0.0 - 2.0 Bar DP (0.1% FS Accuracy)',
      value: `${telemetry.filterDiffPressure.toFixed(3)} Bar`,
      status: telemetry.filterStatus,
      desc: 'Measures pressure drop across 5-micron gas particulate and coalescing filtration elements.',
    },
    'TIT-101': {
      name: 'Gas Temperature Sensor (PT100 RTD in Thermowell)',
      tag: 'TIT-101',
      location: 'Pipeline Thermowell Well Sleeve (HE-101 / Discharge)',
      range: '-50.0 to 150.0 °C (Resistance DIN EN 60751)',
      value: `${formatTemperature(telemetry.outletTemp, units.temperature)} [${telemetry.sensingHardware?.thermowellSensor.resistanceOhm ?? '109.2'} Ω]`,
      status: telemetry.outletTemp < 3.0 ? 'HYDRATE FREEZE THREAT' : 'OPTIMAL',
      desc: 'Platinum resistance sensor in thermowell. Platinum resistance changes with gas temperature (R = 100 + 0.385 * T_c) to measure expansion temperature drop.',
    },
    'PCV-101': {
      name: 'Stream A Pilot Regulating Control Valve',
      tag: 'PCV-101',
      location: 'Regulating Run A (Duty Line)',
      range: `Pilot Setpoint: ${formatPressure(telemetry.outletPressureSetpoint, units.pressure)}`,
      value: `${telemetry.streamA.valveOpenPercent}% Open (${telemetry.streamA.status})`,
      status: telemetry.streamA.status,
      desc: 'Self-operated pilot-directed axial flow pressure reducing valve maintaining tight downstream pressure.',
    },
    'VIT-101': {
      name: 'Valve Body Accelerometer (ADXL345 3-Axis)',
      tag: 'VIT-101',
      location: 'PCV-101 Valve Actuator / Bonnet Neck',
      range: '0 - 25 mm/s RMS (Digital I2C / SPI Register Stream)',
      value: `${formatVibration(telemetry.vibration.overallRms, units.vibration)} (Zone ${telemetry.vibration.isoZone})`,
      status: telemetry.vibration.overallRms >= 4.5 ? 'VALVE CHATTER DETECTED' : 'HEALTHY NOMINAL',
      desc: 'Screwed/bolted directly onto regulator valve body. High-frequency 3-axis accelerometer measures mechanical vibration intensity and frequency to detect seat chatter.',
    },
    'PCV-102': {
      name: 'Stream B Standby Regulating Control Valve',
      tag: 'PCV-102',
      location: 'Regulating Run B (Standby Line)',
      range: `Pilot Setpoint: ${formatPressure(telemetry.outletPressureSetpoint, units.pressure)}`,
      value: `${telemetry.streamB.valveOpenPercent}% Open (${telemetry.streamB.status})`,
      status: telemetry.streamB.status,
      desc: 'Redundant parallel regulating stream automatically assumes load if Stream A trips or vibrates excessively.',
    },
    'FIT-101': {
      name: 'Custody Transfer Ultrasonic Flow Meter',
      tag: 'FIT-101',
      location: 'Downstream Metering Run Spool (FQI-101)',
      range: `0 - ${station.designFlowCapacity} Sm³/h (4-Path Ultrasonic)`,
      value: formatFlow(telemetry.flowRate, units.flow),
      status: 'FISCAL ACCREDITED',
      desc: 'Multi-path ultrasonic flow meter providing fiscal custody transfer gas metering with AGA-9 volume correction.',
    },
    'PIT-102': {
      name: 'Outlet Pressure Transmitter (Yokogawa EJA530E)',
      tag: 'PIT-102',
      location: 'Station Outlet Discharge Header',
      range: '0.0 - 40.0 Bar (4-20mA Current Loop)',
      value: `${formatPressure(telemetry.outletPressure, units.pressure)} [${telemetry.sensingHardware?.outletTransmitter.currentMa ?? '8.84'} mA]`,
      status: 'CALIBRATED NOMINAL',
      desc: 'Yokogawa EJA530E transmitter at station discharge. Generates 4-20 mA current loop for regulated gas distribution monitoring and OPSO safety slam shutoff.',
    },
    'GW-101': {
      name: `Industrial Edge Gateway (${station.gatewayType})`,
      tag: 'GW-101',
      location: 'Local Control Panel (LCP-01)',
      range: 'Dual-Core FreeRTOS / 500ms Sampling Cadence',
      value: `MQTT Topic: ${station.mqttBrokerTopic}`,
      status: 'ONLINE (JSON PAYLOAD STREAMING)',
      desc: 'Converts raw sensor signals (Yokogawa 4-20mA, PT100 resistance, ADXL345 I2C) to engineering units and transmits lightweight JSON payload over MQTT / REST API.',
    },
  };

  const selectedSensor = selectedTag ? sensorDetails[selectedTag] : null;

  return (
    <div className="relative bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md overflow-hidden">
      {/* Header controls & legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              P&ID SYNOPTIC FLOW SCHEMATIC
            </span>
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              ANSI / ISA-5.1 SCADA Mimic
            </span>
          </div>
          <h2 className="text-base font-bold text-white mt-1">
            RMS Gas Regulating & Metering Process Topology
          </h2>
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-amber-500" />
            <span className="text-slate-400">High-P Inlet (Amber)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-cyan-400" />
            <span className="text-slate-400">Regulated Outlet (Cyan)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-400">Duty Run</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
            <span className="text-slate-400">Standby</span>
          </div>
        </div>
      </div>

      {/* SVG Pipeline Canvas */}
      <div className="w-full overflow-x-auto py-4">
        <div className="min-w-[940px]">
          <svg viewBox="0 0 1000 420" className="w-full h-auto select-none">
            <defs>
              {/* Pipe glow filters */}
              <filter id="glow-amber-pipe" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-cyan-pipe" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <linearGradient id="inletGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="outletGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines */}
            <g opacity="0.05" stroke="#ffffff" strokeWidth="1">
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`v-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="420" />
              ))}
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 50} x2="1000" y2={i * 50} />
              ))}
            </g>

            {/* 1. UPSTREAM INLET MAIN LINE (From Gas Grid to Preheater) */}
            {/* Main high pressure pipe: (20, 210) -> (100, 210) [SSV] -> (200, 210) [Filter] -> (340, 210) [Heater] */}
            <line x1="20" y1="210" x2="340" y2="210" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />
            
            {/* Animated gas flow dashes (stops if ESD tripped) */}
            {!isTripped && (
              <line
                x1="20"
                y1="210"
                x2="340"
                y2="210"
                stroke="#fef08a"
                strokeWidth="3"
                className="animate-flow-normal"
              />
            )}

            {/* Upstream inlet arrow */}
            <path d="M 35 204 L 55 210 L 35 216 Z" fill="#f59e0b" />

            {/* Sensor Tag Bubble: PIT-101 */}
            <g
              onClick={() => setSelectedTag('PIT-101')}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              <line x1="75" y1="210" x2="75" y2="130" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="75" cy="115" r="20" fill="#0f172a" stroke="#0284c7" strokeWidth="2.5" />
              <text x="75" y="112" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PIT
              </text>
              <text x="75" y="124" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                101
              </text>
              {/* Telemetry pill */}
              <rect x="35" y="70" width="80" height="20" rx="4" fill="#0284c7" fillOpacity="0.2" stroke="#0284c7" strokeWidth="1" />
              <text x="75" y="84" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {formatPressure(telemetry.inletPressure, units.pressure, 1)}
              </text>
            </g>

            {/* 2. EMERGENCY SLAM-SHUT VALVE (SSV-101) */}
            <g
              onClick={() => setSelectedTag('SSV-101')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              {/* Valve Hourglass Shape */}
              <path
                d="M 115 195 L 145 225 L 145 195 L 115 225 Z"
                fill={isTripped ? '#ef4444' : '#10b981'}
                stroke="#1e293b"
                strokeWidth="2"
              />
              {/* Actuator Solenoid Head */}
              <line x1="130" y1="210" x2="130" y2="175" stroke="#94a3b8" strokeWidth="3" />
              <circle cx="130" cy="170" r="8" fill={isTripped ? '#ef4444' : '#10b981'} stroke="#fff" strokeWidth="1.5" />
              <text x="130" y="245" textAnchor="middle" fill={isTripped ? '#f87171' : '#34d399'} fontSize="10" fontWeight="bold" fontFamily="monospace">
                SSV-101 [{isTripped ? 'TRIPPED' : 'ARMED'}]
              </text>
            </g>

            {/* 3. DUAL CARTRIDGE FILTER / STRAINER (FLT-101) */}
            <g
              onClick={() => setSelectedTag('PDT-101')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              {/* Filter Vessel */}
              <rect x="200" y="180" width="55" height="60" rx="8" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />
              {/* Internal mesh basket pattern */}
              <line x1="212" y1="185" x2="212" y2="235" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="227" y1="185" x2="227" y2="235" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
              <line x1="242" y1="185" x2="242" y2="235" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
              <text x="227.5" y="260" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                FLT-101 (Filter)
              </text>

              {/* PDT-101 Sensor bubble above filter */}
              <line x1="227.5" y1="180" x2="227.5" y2="130" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              <circle
                cx="227.5"
                cy="115"
                r="20"
                fill="#0f172a"
                stroke={telemetry.filterDiffPressure > 0.7 ? '#f59e0b' : '#10b981'}
                strokeWidth="2.5"
              />
              <text x="227.5" y="112" textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PDT
              </text>
              <text x="227.5" y="124" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                101
              </text>
              {/* DP Readout Badge */}
              <rect
                x="187"
                y="70"
                width="82"
                height="20"
                rx="4"
                fill={telemetry.filterDiffPressure > 0.7 ? '#f59e0b' : '#10b981'}
                fillOpacity="0.2"
                stroke={telemetry.filterDiffPressure > 0.7 ? '#f59e0b' : '#10b981'}
                strokeWidth="1"
              />
              <text
                x="228"
                y="84"
                textAnchor="middle"
                fill="#fff"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                ΔP: {telemetry.filterDiffPressure.toFixed(3)} Bar
              </text>
            </g>

            {/* 4. INDIRECT WATER BATH GAS PRE-HEATER (HE-101) */}
            <g
              onClick={() => setSelectedTag('TIT-101')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              {/* Heater Vessel */}
              <rect x="310" y="165" width="85" height="90" rx="12" fill="#182234" stroke="#f59e0b" strokeWidth="2.5" />
              {/* Internal heat exchange serpentine coils */}
              <path
                d="M 325 185 Q 350 185 350 200 Q 350 215 375 215 M 325 225 Q 350 225 350 240 Q 350 250 375 250"
                fill="none"
                stroke="#f97316"
                strokeWidth="2.5"
              />
              {/* Firetube flame badge */}
              <circle cx="352" cy="180" r="10" fill="#f97316" fillOpacity="0.3" />
              <text x="352" y="184" textAnchor="middle" fill="#fed7aa" fontSize="11">
                🔥
              </text>
              <text x="352" y="275" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="bold" fontFamily="monospace">
                HE-101 (Pre-Heater)
              </text>

              {/* TIT-101 RTD bubble */}
              <line x1="352" y1="165" x2="352" y2="130" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="352" cy="115" r="20" fill="#0f172a" stroke="#c084fc" strokeWidth="2.5" />
              <text x="352" y="112" textAnchor="middle" fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="monospace">
                TIT
              </text>
              <text x="352" y="124" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                101
              </text>
              {/* Temperature Badge */}
              <rect x="312" y="70" width="80" height="20" rx="4" fill="#c084fc" fillOpacity="0.2" stroke="#c084fc" strokeWidth="1" />
              <text x="352" y="84" textAnchor="middle" fill="#e9d5ff" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {formatTemperature(telemetry.waterBathTemp, units.temperature)}
              </text>
            </g>

            {/* SPLIT TO DUAL REGULATION RUNS: STREAM A (Upper) & STREAM B (Lower) */}
            {/* Manifold split at x=395, y=210 */}
            <path
              d="M 395 210 L 440 210 L 440 140 L 470 140 M 440 210 L 440 280 L 470 280"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="7"
              strokeLinejoin="round"
            />

            {/* Flow dots into Stream A */}
            {!isTripped && isStreamA && (
              <path
                d="M 395 210 L 440 210 L 440 140 L 470 140"
                fill="none"
                stroke="#fef08a"
                strokeWidth="2.5"
                className="animate-flow-fast"
              />
            )}
            {/* Flow dots into Stream B */}
            {!isTripped && !isStreamA && (
              <path
                d="M 395 210 L 440 210 L 440 280 L 470 280"
                fill="none"
                stroke="#fef08a"
                strokeWidth="2.5"
                className="animate-flow-fast"
              />
            )}

            {/* ======================================================== */}
            {/* STREAM A: UPPER RUN (DUTY) with PCV-101 & VIT-101 */}
            {/* ======================================================== */}
            {/* Inlet pipe for Stream A */}
            <line x1="470" y1="140" x2="520" y2="140" stroke="#f59e0b" strokeWidth="7" />
            
            {/* Stream A Regulating Valve PCV-101 */}
            <g
              onClick={() => setSelectedTag('PCV-101')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              {/* Valve Hourglass */}
              <path
                d="M 520 125 L 560 155 L 560 125 L 520 155 Z"
                fill={isStreamA && !isTripped ? '#0284c7' : '#475569'}
                stroke="#38bdf8"
                strokeWidth="2"
              />
              {/* Actuator Diaphragm */}
              <line x1="540" y1="140" x2="540" y2="90" stroke="#94a3b8" strokeWidth="3" />
              <path d="M 525 90 C 525 78, 555 78, 555 90 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
              
              <text x="540" y="172" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PCV-101 (Run A)
              </text>
              <text x="540" y="184" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                {telemetry.streamA.valveOpenPercent}% Open
              </text>
            </g>

            {/* Acoustic & Vibration Transmitter VIT-101 (Mounted on PCV-101) */}
            <g
              onClick={() => setSelectedTag('VIT-101')}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              <line x1="540" y1="78" x2="540" y2="40" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              <circle
                cx="540"
                cy="30"
                r="18"
                fill="#0f172a"
                stroke={isVibAlert ? '#ef4444' : '#10b981'}
                strokeWidth={isVibAlert ? '3' : '2'}
                className={isVibAlert ? 'scada-beacon' : ''}
              />
              <text x="540" y="27" textAnchor="middle" fill={isVibAlert ? '#f87171' : '#34d399'} fontSize="9" fontWeight="bold" fontFamily="monospace">
                VIT
              </text>
              <text x="540" y="37" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                101
              </text>
              {/* Vibration readout bubble */}
              <rect
                x="570"
                y="18"
                width="95"
                height="24"
                rx="4"
                fill={isVibAlert ? '#ef4444' : '#10b981'}
                fillOpacity="0.25"
                stroke={isVibAlert ? '#ef4444' : '#10b981'}
                strokeWidth="1.5"
              />
              <text
                x="617"
                y="34"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {telemetry.vibration.overallRms} mm/s (Z-{telemetry.vibration.isoZone})
              </text>
            </g>

            {/* Outlet pipe from Stream A (Cyan color - Pressure is now regulated!) */}
            <line x1="560" y1="140" x2="680" y2="140" stroke="#06b6d4" strokeWidth="7" />
            {!isTripped && isStreamA && (
              <line
                x1="560"
                y1="140"
                x2="680"
                y2="140"
                stroke="#67e8f9"
                strokeWidth="2.5"
                className="animate-flow-normal"
              />
            )}

            {/* ======================================================== */}
            {/* STREAM B: LOWER RUN (STANDBY) with PCV-102 */}
            {/* ======================================================== */}
            <line x1="470" y1="280" x2="520" y2="280" stroke="#f59e0b" strokeWidth="7" />
            
            <g
              onClick={() => setSelectedTag('PCV-102')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              <path
                d="M 520 265 L 560 295 L 560 265 L 520 295 Z"
                fill={!isStreamA && !isTripped ? '#0284c7' : '#334155'}
                stroke={!isStreamA && !isTripped ? '#38bdf8' : '#64748b'}
                strokeWidth="2"
              />
              <line x1="540" y1="280" x2="540" y2="320" stroke="#94a3b8" strokeWidth="3" />
              <path d="M 525 320 C 525 332, 555 332, 555 320 Z" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
              
              <text x="540" y="345" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PCV-102 (Run B - Standby)
              </text>
            </g>

            {/* Outlet pipe from Stream B */}
            <line x1="560" y1="280" x2="680" y2="280" stroke="#06b6d4" strokeWidth="7" />
            {!isTripped && !isStreamA && (
              <line
                x1="560"
                y1="280"
                x2="680"
                y2="280"
                stroke="#67e8f9"
                strokeWidth="2.5"
                className="animate-flow-normal"
              />
            )}

            {/* ======================================================== */}
            {/* MERGE BACK INTO DOWNSTREAM HEADER at x=680, y=210 */}
            {/* ======================================================== */}
            <path
              d="M 680 140 L 710 140 L 710 210 L 750 210 M 680 280 L 710 280 L 710 210"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="8"
              strokeLinejoin="round"
            />
            {!isTripped && (
              <path
                d="M 680 140 L 710 140 L 710 210 L 750 210"
                fill="none"
                stroke="#67e8f9"
                strokeWidth="3"
                className="animate-flow-normal"
              />
            )}

            {/* 5. CUSTODY ULTRASONIC FLOW METER (FQI-101) */}
            <g
              onClick={() => setSelectedTag('FIT-101')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              {/* Spool piece with flanges */}
              <line x1="750" y1="210" x2="820" y2="210" stroke="#06b6d4" strokeWidth="8" />
              <rect x="765" y="190" width="40" height="40" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              {/* Diagonal ultrasonic acoustic transit sound path */}
              <line x1="772" y1="195" x2="798" y2="225" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
              <line x1="772" y1="225" x2="798" y2="195" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 2" />
              
              <text x="785" y="250" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                FIT-101 (Ultrasonic)
              </text>

              {/* FQI Bubble */}
              <line x1="785" y1="190" x2="785" y2="130" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="785" cy="115" r="20" fill="#0f172a" stroke="#06b6d4" strokeWidth="2.5" />
              <text x="785" y="112" textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="bold" fontFamily="monospace">
                FIT
              </text>
              <text x="785" y="124" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                101
              </text>
              {/* Flow readout */}
              <rect x="735" y="70" width="100" height="20" rx="4" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="1" />
              <text x="785" y="84" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {formatFlow(telemetry.flowRate, units.flow)}
              </text>
            </g>

            {/* 6. OUTLET DISCHARGE HEADER WITH PIT-102 & TIT-102 */}
            <line x1="820" y1="210" x2="980" y2="210" stroke="#06b6d4" strokeWidth="8" strokeLinecap="round" />
            {!isTripped && (
              <line
                x1="820"
                y1="210"
                x2="980"
                y2="210"
                stroke="#67e8f9"
                strokeWidth="3"
                className="animate-flow-normal"
              />
            )}
            {/* Downstream exit arrow */}
            <path d="M 965 204 L 985 210 L 965 216 Z" fill="#06b6d4" />

            {/* Discharge Transmitter PIT-102 */}
            <g
              onClick={() => setSelectedTag('PIT-102')}
              className="cursor-pointer transition-transform hover:scale-110"
            >
              <line x1="910" y1="210" x2="910" y2="130" stroke="#94a3b8" strokeWidth="2" strokeDasharray="3 3" />
              <circle cx="910" cy="115" r="20" fill="#0f172a" stroke="#06b6d4" strokeWidth="2.5" />
              <text x="910" y="112" textAnchor="middle" fill="#06b6d4" fontSize="10" fontWeight="bold" fontFamily="monospace">
                PIT
              </text>
              <text x="910" y="124" textAnchor="middle" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                102
              </text>
              {/* Outlet Pressure Readout */}
              <rect x="865" y="70" width="90" height="20" rx="4" fill="#06b6d4" fillOpacity="0.2" stroke="#06b6d4" strokeWidth="1" />
              <text x="910" y="84" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontWeight="bold" fontFamily="monospace">
                {formatPressure(telemetry.outletPressure, units.pressure, 1)}
              </text>
            </g>

            {/* PRV-101 Pressure Relief Valve branch */}
            <g>
              <line x1="860" y1="210" x2="860" y2="280" stroke="#06b6d4" strokeWidth="5" />
              <path d="M 850 280 L 870 280 L 860 300 Z" fill="#f43f5e" stroke="#fff" strokeWidth="1" />
              <text x="860" y="320" textAnchor="middle" fill="#f43f5e" fontSize="9" fontWeight="bold" fontFamily="monospace">
                PRV-101
              </text>
            </g>

            {/* Flow rate label */}
            <text x="880" y="240" fill="#94a3b8" fontSize="10" fontFamily="monospace">
              To Grid &gt;&gt;
            </text>

            {/* 7. INDUSTRIAL IOT GATEWAY NODE (GW-101: ESP32-S3 / Raspberry Pi CM4) */}
            <g
              onClick={() => setSelectedTag('GW-101')}
              className="cursor-pointer transition-transform hover:scale-105"
            >
              {/* Signal wires coming from PIT-101, TIT-101, VIT-101, and PIT-102 into Gateway */}
              <path
                d="M 75 135 L 75 375 L 370 375 M 352 135 L 352 375 M 540 48 L 540 10 L 400 10 L 400 370 M 910 135 L 910 375 L 610 375"
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.4"
              />
              
              {/* Gateway enclosure box */}
              <rect
                x="370"
                y="352"
                width="240"
                height="50"
                rx="8"
                fill="#0b1329"
                stroke="#06b6d4"
                strokeWidth="2"
                className="drop-shadow-lg"
              />
              {/* Status LED blinker */}
              <circle cx="388" cy="370" r="4" fill="#10b981" />
              
              <text x="402" y="371" fill="#38bdf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                GW-101: {station.gatewayType} GATEWAY
              </text>
              <text x="402" y="388" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                4-20mA + I2C &rarr; JSON &rarr; MQTT (500ms)
              </text>
              
              {/* Antenna / Cloud uplink indicator */}
              <line x1="585" y1="352" x2="585" y2="338" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="585" cy="336" r="3" fill="#38bdf8" />
              <path d="M 579 332 Q 585 326 591 332 M 575 328 Q 585 320 595 328" fill="none" stroke="#38bdf8" strokeWidth="1.2" />
            </g>
          </svg>
        </div>
      </div>

      {/* Sensor Inspection Drawer overlay when a bubble is clicked */}
      {selectedSensor && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mt-1">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {selectedSensor.tag}
                </span>
                <span className="text-sm font-bold text-white">{selectedSensor.name}</span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  STATUS: {selectedSensor.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">{selectedSensor.desc}</p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs font-mono">
                <span className="text-slate-400">
                  Location: <strong className="text-slate-200">{selectedSensor.location}</strong>
                </span>
                <span className="text-slate-400">
                  Calibrated Range: <strong className="text-slate-200">{selectedSensor.range}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-mono">LIVE TELEMETRY</div>
              <div className="text-xl font-extrabold text-cyan-300 font-mono-numbers">
                {selectedSensor.value}
              </div>
            </div>
            <button
              onClick={() => setSelectedTag(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Click any sensor circle (PIT, PDT, TIT, VIT) to inspect calibration & loop telemetry.</span>
        </div>
        <button
          onClick={onOpenControls}
          className="text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer"
        >
          Open Setpoint & Valve Controls &rarr;
        </button>
      </div>
    </div>
  );
};
