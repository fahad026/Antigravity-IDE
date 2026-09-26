import { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  RotateCw,
  Power,
  AlertOctagon,
  Flame,
  Waves,
  Filter,
  CheckCircle,
  TrendingUp,
  Cpu
} from 'lucide-react';
import type { TelemetryPoint, StationConfig, UnitPreferences } from '../types/telemetry';
import { formatPressure } from '../utils/units';

interface ControlConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: TelemetryPoint;
  station: StationConfig;
  units: UnitPreferences;
  onUpdateSetpoint: (newSetpoint: number) => Promise<void>;
  onSwitchStream: (targetStream: 'STREAM_A' | 'STREAM_B') => Promise<void>;
  onTriggerESD: () => Promise<void>;
  onResetESD: () => Promise<void>;
  onInjectFault: (
    faultType: 'PIPELINE_DROP' | 'VALVE_CHATTER' | 'CAVITATION_VIBRATION' | 'PREHEATER_FLAMEOUT' | 'FILTER_CLOGGED' | 'PRESSURE_SURGE' | 'NORMAL'
  ) => Promise<void>;
}

export const ControlConsoleModal: React.FC<ControlConsoleModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  station,
  units,
  onUpdateSetpoint,
  onSwitchStream,
  onTriggerESD,
  onResetESD,
  onInjectFault,
}) => {
  const [setpointInput, setSetpointInput] = useState<number>(telemetry.outletPressureSetpoint);
  const [isApplying, setIsApplying] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showEsdConfirm, setShowEsdConfirm] = useState(false);

  useEffect(() => {
    setSetpointInput(telemetry.outletPressureSetpoint);
  }, [telemetry.outletPressureSetpoint]);

  if (!isOpen) return null;

  const handleApplySetpoint = async () => {
    setIsApplying(true);
    setFeedbackMsg(null);
    try {
      await onUpdateSetpoint(setpointInput);
      setFeedbackMsg(`Setpoint calibrated to ${setpointInput} Bar.`);
    } catch {
      setFeedbackMsg('Failed to calibrate setpoint.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleStreamChange = async (stream: 'STREAM_A' | 'STREAM_B') => {
    setIsApplying(true);
    try {
      await onSwitchStream(stream);
      setFeedbackMsg(`Regulating duty switched to ${stream}.`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleFault = async (fault: any) => {
    setIsApplying(true);
    try {
      await onInjectFault(fault);
      setFeedbackMsg(fault === 'NORMAL' ? 'Nominal parameters restored.' : `Fault [${fault}] active.`);
    } finally {
      setIsApplying(false);
    }
  };

  const isEsdTripped = telemetry.esdStatus === 'TRIPPED';
  const isStreamA = telemetry.activeStream === 'STREAM_A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
                SCADA OPERATOR INTERLOCK
              </span>
              <h2 className="text-lg font-bold text-white">
                Station Control & Fault Injection Console
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Feedback banner */}
          {feedbackMsg && (
            <div className="p-3 rounded-lg bg-cyan-500/20 border border-cyan-500 text-cyan-200 text-xs font-mono flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-cyan-400" />
              <span>{feedbackMsg}</span>
            </div>
          )}

          {/* Section 1: Outlet Pressure Setpoint Tuning */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Regulated Outlet Pressure Setpoint (P_SET)
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Current: <strong className="text-cyan-300">{formatPressure(telemetry.outletPressureSetpoint, units.pressure)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center pt-2">
              <div className="sm:col-span-3 space-y-1">
                <input
                  type="range"
                  min="8.0"
                  max={(station.opsoLimitBar - 1.0).toFixed(1)}
                  step="0.1"
                  value={setpointInput}
                  onChange={(e) => setpointInput !== Number(e.target.value) && setSetpointInput(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
                <div className="flex justify-between text-[11px] font-mono text-slate-400">
                  <span>Min: 8.0 Bar</span>
                  <span className="text-cyan-400 font-bold text-sm">{setpointInput.toFixed(1)} Bar</span>
                  <span>Max Safe: {(station.opsoLimitBar - 1.0).toFixed(1)} Bar</span>
                </div>
              </div>

              <div className="sm:col-span-1 flex gap-2">
                <button
                  disabled={isApplying || setpointInput === telemetry.outletPressureSetpoint}
                  onClick={handleApplySetpoint}
                  className="w-full py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  CALIBRATE
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Stream Redundancy Switchover */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Stream Run Redundancy Switchover
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Active: <strong className="text-emerald-400">{telemetry.activeStream}</strong>
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Hot switchover transfers gas regulating load smoothly between Stream A (PCV-101) and Stream B (PCV-102) with zero downstream supply interruption.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                disabled={isStreamA || isApplying || isEsdTripped}
                onClick={() => handleStreamChange('STREAM_A')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  isStreamA
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>RUN A (PCV-101)</span>
                <span className="text-[10px] font-normal">{isStreamA ? 'CURRENTLY IN DUTY' : 'STANDBY READY'}</span>
              </button>

              <button
                disabled={!isStreamA || isApplying || isEsdTripped}
                onClick={() => handleStreamChange('STREAM_B')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  !isStreamA
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span>RUN B (PCV-102)</span>
                <span className="text-[10px] font-normal">{!isStreamA ? 'CURRENTLY IN DUTY' : 'STANDBY READY'}</span>
              </button>
            </div>
          </div>

          {/* Section 3: Diagnostic Fault Simulation Injector */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  SCADA Fault Injection & Diagnostic Simulator
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                SCADA TESTING HARNESS
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Inject real-world operational anomalies to verify telemetry alarms, vibration spectral shift, and emergency response logic.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* 1. Critical Pipeline Drop (Inlet pressure collapse from 65 to 20 bar) */}
              <button
                onClick={() => handleFault('PIPELINE_DROP')}
                className="p-3 rounded-xl bg-rose-950/30 border border-rose-600/50 hover:border-rose-400 text-left transition-colors cursor-pointer group shadow-sm ring-1 ring-rose-500/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" /> 🚨 Critical Pipeline Drop
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 bg-rose-500/20 px-1.5 py-0.5 rounded">Line Rupture</span>
                </div>
                <p className="text-[11px] text-rose-200/80 mt-1">
                  Drops Yokogawa inlet pressure from 65 to 20 bar (flags CRITICAL PIPELINE DROP).
                </p>
              </button>

              {/* 2. Valve Chatter Detected (ADXL345 Accelerometer Flutter) */}
              <button
                onClick={() => handleFault('VALVE_CHATTER')}
                className="p-3 rounded-xl bg-amber-950/30 border border-amber-600/50 hover:border-amber-400 text-left transition-colors cursor-pointer group shadow-sm ring-1 ring-amber-500/30"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Waves className="w-4 h-4 text-amber-400 animate-pulse" /> ⚡ Valve Chatter Detected
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">ADXL345 Flutter</span>
                </div>
                <p className="text-[11px] text-amber-200/80 mt-1">
                  Spikes ADXL345 vibration to 7.8 mm/s RMS (flags VALVE CHATTER DETECTED).
                </p>
              </button>

              <button
                onClick={() => handleFault('CAVITATION_VIBRATION')}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                    <Waves className="w-4 h-4" /> ⚡ Trim Cavitation & Resonance
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-rose-300">ISO Zone D</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Spikes vibration to 8.5 mm/s RMS with 480 Hz harmonic trim resonance.
                </p>
              </button>

              <button
                onClick={() => handleFault('PREHEATER_FLAMEOUT')}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Flame className="w-4 h-4" /> ❄️ Preheater Loss / Freeze Risk
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-300">Hydrate Threat</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Cools water bath to 8°C, plunging gas outlet below 0°C via Joule-Thomson.
                </p>
              </button>

              <button
                onClick={() => handleFault('FILTER_CLOGGED')}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Filter className="w-4 h-4" /> 🛢️ Strainer Differential Surge
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-amber-300">&gt;1.0 Bar DP</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Simulates heavy particulate clogging in basket strainer FLT-101.
                </p>
              </button>

              <button
                onClick={() => handleFault('PRESSURE_SURGE')}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-yellow-500 text-left transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> 📈 Pipeline Inflow Surge
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-yellow-300">78 Bar</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Simulates rapid upstream compressor surge testing OPSO slam-shut limits.
                </p>
              </button>
            </div>

            {/* Clear fault button */}
            <div className="pt-2">
              <button
                onClick={() => handleFault('NORMAL')}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold font-mono transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>RESTORE NOMINAL STEADY-STATE OPERATION (CLEAR SIMULATED FAULTS)</span>
              </button>
            </div>
          </div>

          {/* Section 4: Emergency Slam-Shut Valve (ESD) */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500 animate-pulse" />
                <h3 className="text-sm font-bold text-rose-300 uppercase tracking-tight">
                  Emergency Slam-Shut Valve (SSV-101 / ESD-1)
                </h3>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  isEsdTripped ? 'bg-rose-500 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {isEsdTripped ? 'STATE: TRIPPED (SHUT)' : 'STATE: ARMED'}
              </span>
            </div>

            <p className="text-xs text-rose-300/80">
              Emergency trip isolates the station immediately, cutting off inlet transmission gas in under 0.8 seconds (SIL-3 safety interlock).
            </p>

            {isEsdTripped ? (
              <button
                disabled={isApplying}
                onClick={onResetESD}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                <span>RESET EMERGENCY SLAM-SHUT VALVE & COMMENCE LINE-PACK RESTORATION</span>
              </button>
            ) : !showEsdConfirm ? (
              <button
                disabled={isApplying}
                onClick={() => setShowEsdConfirm(true)}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs font-mono shadow-lg hover:shadow-rose-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                <span>MANUALLY TRIP EMERGENCY SLAM-SHUT VALVE (ESD)</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-900/50 border border-rose-500 text-center space-y-2">
                <span className="text-xs font-bold text-white block">
                  ARE YOU ABSOLUTELY SURE? This will isolate station feed immediately.
                </span>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      onTriggerESD();
                      setShowEsdConfirm(false);
                    }}
                    className="py-1.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded cursor-pointer"
                  >
                    CONFIRM SLAM TRIP
                  </button>
                  <button
                    onClick={() => setShowEsdConfirm(false)}
                    className="py-1.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            CLOSE CONSOLE
          </button>
        </div>
      </div>
    </div>
  );
};
