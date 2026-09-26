import {
  Gauge,
  Sliders,
  Filter,
  Thermometer,
  Snowflake
} from 'lucide-react';
import type { TelemetryPoint, StationConfig, UnitPreferences } from '../types/telemetry';
import {
  formatPressure,
  formatTemperature,
} from '../utils/units';

interface KPISectionProps {
  telemetry: TelemetryPoint;
  station: StationConfig;
  units: UnitPreferences;
}

export const KPISection: React.FC<KPISectionProps> = ({ telemetry, station, units }) => {
  // Pressure calculations
  const inletPressFormatted = formatPressure(telemetry.inletPressure, units.pressure);
  const outletPressFormatted = formatPressure(telemetry.outletPressure, units.pressure);
  const outletSetpointFormatted = formatPressure(telemetry.outletPressureSetpoint, units.pressure);

  const deltaPToSetpoint = Number(
    (telemetry.outletPressure - telemetry.outletPressureSetpoint).toFixed(2)
  );

  // Pressure percentages relative to MAOP & OPSO
  const inletPercentOfMaop = Math.min(
    100,
    Math.round((telemetry.inletPressure / station.maopBar) * 100)
  );

  const outletPercentOfOpso = Math.min(
    100,
    Math.round((telemetry.outletPressure / station.opsoLimitBar) * 100)
  );

  // Filter DP calculations
  const filterDpPercent = Math.min(
    100,
    Math.round((telemetry.filterDiffPressure / 1.0) * 100)
  );

  // Temperature calculations
  const outletTempFormatted = formatTemperature(telemetry.outletTemp, units.temperature);
  const inletTempFormatted = formatTemperature(telemetry.inletTemp, units.temperature);
  const waterBathFormatted = formatTemperature(telemetry.waterBathTemp, units.temperature);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* CARD 1: INLET TRANSMISSION PRESSURE (P_IN) */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 shadow-lg transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/5 rounded-bl-full pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400 tracking-wider">TAG: PIT-101</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-tight">Inlet Pressure (P₁)</h3>
            </div>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-cyan-400">
            TRANSMISSION
          </span>
        </div>

        {/* Main Metric Value */}
        <div className="my-2">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono-numbers flex items-baseline gap-2">
            <span>{inletPressFormatted}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>Nominal: {formatPressure(station.nominalInletBar, units.pressure, 1)}</span>
            <span>•</span>
            <span className="text-slate-400">MAOP: {formatPressure(station.maopBar, units.pressure, 1)}</span>
          </div>
        </div>

        {/* Bar progress */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-[11px] font-mono mb-1.5">
            <span className="text-slate-400">Pipe Line-Pack Load</span>
            <span className="text-cyan-400 font-bold">{inletPercentOfMaop}% MAOP</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                inletPercentOfMaop > 90
                  ? 'bg-rose-500 glow-rose'
                  : inletPercentOfMaop > 75
                  ? 'bg-amber-400 glow-amber'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${inletPercentOfMaop}%` }}
            />
          </div>
        </div>
      </div>

      {/* CARD 2: REGULATED OUTLET PRESSURE (P_OUT) */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 shadow-lg transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400 tracking-wider">TAG: PIT-102</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-tight">Regulated Outlet (P₂)</h3>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
              Math.abs(deltaPToSetpoint) <= 0.3
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}
          >
            {Math.abs(deltaPToSetpoint) <= 0.3 ? 'ON TARGET' : 'DEVIATING'}
          </span>
        </div>

        {/* Main Metric Value */}
        <div className="my-2">
          <div className="text-3xl font-extrabold text-cyan-300 tracking-tight font-mono-numbers flex items-baseline gap-2">
            <span>{outletPressFormatted}</span>
            <span
              className={`text-xs font-mono font-normal ${
                deltaPToSetpoint >= 0 ? 'text-amber-400' : 'text-blue-400'
              }`}
            >
              ({deltaPToSetpoint >= 0 ? `+${deltaPToSetpoint}` : deltaPToSetpoint} Bar)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>Setpoint: {outletSetpointFormatted}</span>
            <span>•</span>
            <span className="text-rose-400">OPSO: {formatPressure(station.opsoLimitBar, units.pressure, 1)}</span>
          </div>
        </div>

        {/* OPSO Safety Margin Bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-[11px] font-mono mb-1.5">
            <span className="text-slate-400">OPSO Slam-Shut Proximity</span>
            <span className="text-slate-300 font-bold">{outletPercentOfOpso}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                outletPercentOfOpso > 92
                  ? 'bg-rose-500 glow-rose animate-pulse'
                  : outletPercentOfOpso > 80
                  ? 'bg-amber-400 glow-amber'
                  : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
              }`}
              style={{ width: `${outletPercentOfOpso}%` }}
            />
          </div>
        </div>
      </div>

      {/* CARD 3: FILTER DIFFERENTIAL PRESSURE (DELTA P) */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 shadow-lg transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-bl-full pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400 tracking-wider">TAG: PDT-101</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-tight">Filter Coarse ΔP</h3>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
              telemetry.filterStatus === 'CLEAN'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                : telemetry.filterStatus === 'NORMAL'
                ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400'
                : telemetry.filterStatus === 'WARNING'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-rose-500/20 border border-rose-500 text-rose-400 animate-pulse'
            }`}
          >
            {telemetry.filterStatus}
          </span>
        </div>

        {/* Main Metric Value */}
        <div className="my-2">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono-numbers flex items-baseline gap-2">
            <span>{telemetry.filterDiffPressure.toFixed(3)} Bar</span>
            <span className="text-xs text-slate-400 font-normal">({(telemetry.filterDiffPressure * 1000).toFixed(0)} mbar)</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>Clean Limit: &lt; 0.35 Bar</span>
            <span>•</span>
            <span className="text-amber-400">Alert: &gt; 0.70 Bar</span>
          </div>
        </div>

        {/* Saturation progress bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-[11px] font-mono mb-1.5">
            <span className="text-slate-400">Cartridge Saturation</span>
            <span className="text-slate-300 font-bold">{filterDpPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                filterDpPercent > 80
                  ? 'bg-rose-500 glow-rose'
                  : filterDpPercent > 55
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${filterDpPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* CARD 4: PIPELINE TEMPERATURE & JOULE-THOMSON COOLING */}
      <div className="relative overflow-hidden bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 rounded-xl p-5 shadow-lg transition-all duration-300">
        <div className="absolute top-0 right-0 w-28 h-28 bg-purple-500/5 rounded-bl-full pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-mono text-slate-400 tracking-wider">TAG: TIT-102</span>
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-tight">Gas Temp & J-T Drop</h3>
            </div>
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${
              telemetry.hydrateRiskPercent > 65
                ? 'bg-rose-500/20 border border-rose-500 text-rose-400 animate-pulse'
                : telemetry.hydrateRiskPercent > 35
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
            }`}
          >
            {telemetry.hydrateRiskPercent > 65 && <Snowflake className="w-3 h-3" />}
            HYDRATE: {telemetry.hydrateRiskPercent}%
          </span>
        </div>

        {/* Main Metric Value */}
        <div className="my-2">
          <div className="text-3xl font-extrabold text-white tracking-tight font-mono-numbers flex items-baseline gap-2">
            <span>{outletTempFormatted}</span>
            <span className="text-xs text-purple-400 font-mono font-normal">
              (JT: -{telemetry.jouleThomsonDrop}°C)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>Inlet: {inletTempFormatted}</span>
            <span>•</span>
            <span className="text-cyan-400">Pre-Heater: {waterBathFormatted}</span>
          </div>
        </div>

        {/* Freezing margin bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="flex justify-between text-[11px] font-mono mb-1.5">
            <span className="text-slate-400">Hydrate Freeze Risk Envelope</span>
            <span
              className={`font-bold ${
                telemetry.hydrateRiskPercent > 60 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {telemetry.hydrateRiskPercent > 60 ? 'FREEZE HAZARD' : 'SAFE'}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                telemetry.hydrateRiskPercent > 60
                  ? 'bg-rose-500 glow-rose'
                  : telemetry.hydrateRiskPercent > 30
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-blue-500 to-cyan-400'
              }`}
              style={{ width: `${Math.max(5, telemetry.hydrateRiskPercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
