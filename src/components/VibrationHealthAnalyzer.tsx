import { useState } from 'react';
import {
  AlertTriangle,
  Waves,
  ShieldCheck,
  ShieldAlert,
  Cpu
} from 'lucide-react';
import type { VibrationTelemetry, UnitPreferences } from '../types/telemetry';
import { formatVibration } from '../utils/units';

interface VibrationHealthAnalyzerProps {
  vibration: VibrationTelemetry;
  units: UnitPreferences;
  onInjectVibrationFault?: () => void;
}

export const VibrationHealthAnalyzer: React.FC<VibrationHealthAnalyzerProps> = ({
  vibration,
  units,
}) => {
  const [hoveredBin, setHoveredBin] = useState<{ hz: number; amp: number } | null>(null);

  const isZoneD = vibration.isoZone === 'D';
  const isZoneC = vibration.isoZone === 'C';
  const isZoneB = vibration.isoZone === 'B';

  // ISO 10816-3 visual gauge pointer percentage
  // Zone A: 0 - 2.3 mm/s (0 - 25%)
  // Zone B: 2.3 - 4.5 mm/s (25 - 50%)
  // Zone C: 4.5 - 7.1 mm/s (50 - 75%)
  // Zone D: 7.1 - 10+ mm/s (75 - 100%)
  let gaugePercent = 0;
  if (vibration.overallRms <= 2.3) {
    gaugePercent = (vibration.overallRms / 2.3) * 25;
  } else if (vibration.overallRms <= 4.5) {
    gaugePercent = 25 + ((vibration.overallRms - 2.3) / (4.5 - 2.3)) * 25;
  } else if (vibration.overallRms <= 7.1) {
    gaugePercent = 50 + ((vibration.overallRms - 4.5) / (7.1 - 4.5)) * 25;
  } else {
    gaugePercent = Math.min(100, 75 + ((vibration.overallRms - 7.1) / 3.0) * 25);
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg border ${
              isZoneD
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse glow-rose'
                : isZoneC
                ? 'bg-amber-500/20 border-amber-500 text-amber-400 glow-amber'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Waves className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                TAG: VIT-101
              </span>
              <span className="text-xs text-slate-400 font-mono">ISO 10816-3 CLASS II/III</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Regulator Valve Vibration & Acoustic Spectrum Analyzer
            </h2>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${
              isZoneD
                ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse'
                : isZoneC
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : isZoneB
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {isZoneD ? (
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            ZONE {vibration.isoZone}: {isZoneD ? 'CRITICAL DANGER' : isZoneC ? 'ALERT' : isZoneB ? 'SATISFACTORY' : 'GOOD'}
          </span>
        </div>
      </div>

      {/* Grid: 3-Axis Readouts & ISO Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left: Overall RMS & 3-Axis (X, Y, Z) */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
          {/* Main Overall RMS Card */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <span className="text-xs font-mono text-slate-400">COMBINED VECTOR RMS</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className={`text-4xl font-extrabold font-mono-numbers tracking-tight ${
                  isZoneD ? 'text-rose-400' : isZoneC ? 'text-amber-400' : 'text-cyan-300'
                }`}
              >
                {formatVibration(vibration.overallRms, units.vibration)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{vibration.severityDescription}</p>

            {/* Tri-Axial Breakdown Grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800">
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-mono">X-AXIS (RADIAL)</span>
                <div className="text-sm font-bold text-white font-mono font-mono-numbers mt-0.5">
                  {formatVibration(vibration.vx, units.vibration)}
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-mono">Y-AXIS (VERTICAL)</span>
                <div className="text-sm font-bold text-white font-mono font-mono-numbers mt-0.5">
                  {formatVibration(vibration.vy, units.vibration)}
                </div>
              </div>
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 font-mono">Z-AXIS (AXIAL)</span>
                <div className="text-sm font-bold text-white font-mono font-mono-numbers mt-0.5">
                  {formatVibration(vibration.vz, units.vibration)}
                </div>
              </div>
            </div>
          </div>

          {/* Acceleration & Statistical Indicators */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Peak Accel</span>
              <div className="text-sm font-bold text-slate-200 mt-1 font-mono-numbers">
                {vibration.peakAccelerationG} g
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Dominant Freq</span>
              <div className="text-sm font-bold text-cyan-400 mt-1 font-mono-numbers">
                {vibration.dominantFrequencyHz} Hz
              </div>
            </div>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
              <span className="text-slate-400">Kurtosis Index</span>
              <div className="text-sm font-bold text-purple-400 mt-1 font-mono-numbers">
                {vibration.kurtosis.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: ISO 10816 Severity Meter & FFT Spectrum */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-4">
          {/* ISO 10816-3 Severity Bar */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 font-bold">ISO 10816-3 SEVERITY CLASSIFICATION</span>
              <span className="text-slate-400">Threshold: Alert &gt; 4.5 mm/s | Danger &gt; 7.1 mm/s</span>
            </div>

            {/* Gradient Bar with Zone Bands */}
            <div className="relative w-full h-8 rounded-lg overflow-hidden bg-slate-800 flex border border-slate-700">
              <div className="w-1/4 h-full bg-emerald-500/80 flex items-center justify-center text-[11px] font-bold font-mono text-slate-950 border-r border-slate-900/40">
                ZONE A (&lt;2.3)
              </div>
              <div className="w-1/4 h-full bg-cyan-500/80 flex items-center justify-center text-[11px] font-bold font-mono text-slate-950 border-r border-slate-900/40">
                ZONE B (2.3-4.5)
              </div>
              <div className="w-1/4 h-full bg-amber-500/80 flex items-center justify-center text-[11px] font-bold font-mono text-slate-950 border-r border-slate-900/40">
                ZONE C (4.5-7.1)
              </div>
              <div className="w-1/4 h-full bg-rose-500/90 flex items-center justify-center text-[11px] font-bold font-mono text-white">
                ZONE D (&gt;7.1)
              </div>

              {/* Indicator Needle */}
              <div
                className="absolute top-0 bottom-0 w-2.5 bg-white border-2 border-black rounded shadow-lg transition-all duration-300 -ml-1"
                style={{ left: `${gaugePercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
              <span>0.0 mm/s (Ideal)</span>
              <span>2.3 mm/s</span>
              <span>4.5 mm/s (Alert)</span>
              <span>7.1 mm/s (Trip Limit)</span>
              <span>10.0+ mm/s</span>
            </div>
          </div>

          {/* Real-Time 32-Band FFT Frequency Spectrum */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-bold">FFT VIBRATION FREQUENCY SPECTRUM (10 - 1000 Hz)</span>
                {hoveredBin && (
                  <span className="text-cyan-400">
                    Cursor: {hoveredBin.hz} Hz ({hoveredBin.amp} mm/s)
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">32-Bin FFT Real-Time Window</span>
            </div>

            {/* FFT Bar Chart Container */}
            <div className="w-full h-32 flex items-end gap-1 pt-2 pb-1 px-1 bg-slate-900/60 rounded-lg border border-slate-800/80">
              {vibration.fftSpectrum.map((amp, idx) => {
                const hz = 15 + idx * 31;
                const maxDisplayAmp = isZoneD ? 6.0 : 2.5;
                const heightPercent = Math.min(100, Math.max(4, (amp / maxDisplayAmp) * 100));
                const isHarmonic = Math.abs(hz - vibration.dominantFrequencyHz) < 25;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredBin({ hz, amp })}
                    onMouseLeave={() => setHoveredBin(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t transition-all duration-300 ${
                        isZoneD && isHarmonic
                          ? 'bg-rose-500 glow-rose'
                          : isHarmonic
                          ? 'bg-amber-400 glow-amber'
                          : isZoneD
                          ? 'bg-rose-400/50 hover:bg-rose-400'
                          : 'bg-cyan-500/60 hover:bg-cyan-400'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Frequency Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>10 Hz</span>
              <span>120 Hz (Aero Flow)</span>
              <span>240 Hz</span>
              <span className="text-rose-400 font-bold">480 Hz (Trim Flutter)</span>
              <span>720 Hz</span>
              <span>1000 Hz</span>
            </div>
          </div>
        </div>
      </div>

      {/* Predictive Diagnostic Advisory Banner */}
      <div
        className={`mt-4 p-3.5 rounded-lg border flex items-start gap-3 text-xs ${
          isZoneD
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-200'
            : isZoneC
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
            : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}
      >
        <div className="mt-0.5">
          {isZoneD ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 animate-bounce" />
          ) : isZoneC ? (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          ) : (
            <Cpu className="w-5 h-5 text-cyan-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-bold uppercase tracking-wider text-[11px]">
            {isZoneD
              ? 'CRITICAL ADVISORY: SEVERE REGULATOR CAVITATION & TRIM INSTABILITY'
              : isZoneC
              ? 'PREVENTATIVE ADVISORY: ACOUSTIC RESONANCE / PILOT OSCILLATION'
              : 'MECHANICAL INTEGRITY DIAGNOSTIC: NOMINAL STEADY-STATE'}
          </div>
          <p className="mt-0.5 text-slate-400 leading-relaxed">
            {isZoneD
              ? `Vibration amplitude (${vibration.overallRms} mm/s) has entered ISO 10816 Zone D. A strong resonance peak at ${vibration.dominantFrequencyHz} Hz indicates severe aerodynamic trim flutter and acoustic cavitation across the PCV-101 cage seat. Recommended Action: Execute hot switchover to Standby Stream B immediately and inspect the actuator guide bushings.`
              : isZoneC
              ? `Elevated vibration amplitude (${vibration.overallRms} mm/s) in Zone C indicates mild pilot hunting or turbulence induced fatigue. Monitor FFT 480 Hz energy band.`
              : `Vibration levels remain safely inside ISO Zone A (< 2.3 mm/s). Valve plug stability and sleeve guide clearance are well within design tolerances.`}
          </p>
        </div>
      </div>
    </div>
  );
};
