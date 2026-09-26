import {
  Thermometer,
  Snowflake,
  Flame,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import type { TelemetryPoint, UnitPreferences } from '../types/telemetry';
import { formatTemperature } from '../utils/units';

interface ThermalThermodynamicsWidgetProps {
  telemetry: TelemetryPoint;
  units: UnitPreferences;
}

export const ThermalThermodynamicsWidget: React.FC<ThermalThermodynamicsWidgetProps> = ({
  telemetry,
  units,
}) => {
  const isHydrateHazard = telemetry.hydrateRiskPercent > 60;
  const isWarning = telemetry.hydrateRiskPercent > 30 && !isHydrateHazard;

  // Hydrate curve threshold: T_hydrate = 8.9 * ln(P_out) - 16.5
  const hydrateThresholdC = Number((8.9 * Math.log(Math.max(1, telemetry.outletPressure)) - 16.5).toFixed(1));
  const safetyMarginC = Number((telemetry.outletTemp - hydrateThresholdC).toFixed(1));

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                THERMODYNAMICS & J-T BALANCE
              </span>
              <span className="text-xs text-slate-400 font-mono">TAG: TIT-101 / TIT-102</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              Joule-Thomson Refrigeration & Methane Hydrate Freeze Guard
            </h2>
          </div>
        </div>

        {/* Hazard Pill */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${
            isHydrateHazard
              ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-pulse'
              : isWarning
              ? 'bg-amber-500/20 text-amber-300 border-amber-500'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
          }`}
        >
          {isHydrateHazard ? (
            <Snowflake className="w-4 h-4 text-rose-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
          {isHydrateHazard
            ? 'CRITICAL FREEZE HAZARD'
            : isWarning
            ? 'HYDRATE ENVELOPE PROXIMITY'
            : 'FREEZE SAFE'}
        </span>
      </div>

      {/* Thermodynamic Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Metric 1: Joule-Thomson Refrigeration Drop */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            JOULE-THOMSON DROP (ΔT_JT)
          </span>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono-numbers mt-1">
            -{telemetry.jouleThomsonDrop}°C
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            μ_JT ≈ 0.48 °C/Bar × {(telemetry.inletPressure - telemetry.outletPressure).toFixed(1)} Bar drop
          </p>
        </div>

        {/* Metric 2: Pre-Heater Duty Reserve */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            WATER BATH RESERVE (HE-101)
          </span>
          <div className="text-2xl font-extrabold text-amber-300 font-mono-numbers mt-1">
            {formatTemperature(telemetry.waterBathTemp, units.temperature)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Target: 55°C - 65°C | Inflow: {formatTemperature(telemetry.inletTemp, units.temperature)}
          </p>
        </div>

        {/* Metric 3: Hydrate Formation Threshold */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            HYDRATE STABILITY POINT
          </span>
          <div className="text-2xl font-extrabold text-purple-300 font-mono-numbers mt-1">
            {hydrateThresholdC}°C
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">
            Safety Margin: {safetyMarginC > 0 ? `+${safetyMarginC}` : safetyMarginC}°C
          </p>
        </div>
      </div>

      {/* Hydrate Risk Meter Bar */}
      <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
        <div className="flex justify-between items-center text-xs font-mono mb-2">
          <span className="text-slate-400 font-bold">METHANE CLATHRATE HYDRATE FORMATION PROBABILITY</span>
          <span
            className={`font-bold font-mono-numbers ${
              isHydrateHazard ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {telemetry.hydrateRiskPercent}% RISK INDEX
          </span>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className={`h-full transition-all duration-500 ${
              isHydrateHazard
                ? 'bg-rose-500 glow-rose animate-pulse'
                : isWarning
                ? 'bg-amber-400 glow-amber'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.max(5, telemetry.hydrateRiskPercent)}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5">
          <span>0% (Optimal Superheat)</span>
          <span>35% (Preheat Required)</span>
          <span>65% (Freezing Risk Alert)</span>
          <span>100% (Solid Hydrate Blockage)</span>
        </div>
      </div>

      {/* Operational Protocol Hint */}
      {isHydrateHazard && (
        <div className="mt-3 p-3 rounded-lg bg-rose-500/20 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>EMERGENCY FREEZE PROTOCOL ACTIVE:</strong> Gas temperature is insufficient to prevent hydrate ice crystals in pilot orifices. Verify burner ignition on Water Bath Preheater HE-101 immediately.
          </span>
        </div>
      )}
    </div>
  );
};
