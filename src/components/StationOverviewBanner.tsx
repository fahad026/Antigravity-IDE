import React from 'react';
import {
  Shield,
  Gauge,
  Wind,
  Flame,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Building2,
  CheckCircle2
} from 'lucide-react';
import type { StationConfig, TelemetryPoint, UnitPreferences } from '../types/telemetry';
import { formatFlow, formatPressure } from '../utils/units';

interface StationOverviewBannerProps {
  station: StationConfig;
  telemetry: TelemetryPoint | null;
  units: UnitPreferences;
}

export const StationOverviewBanner: React.FC<StationOverviewBannerProps> = ({
  station,
  telemetry,
  units,
}) => {
  if (!telemetry) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 animate-pulse text-slate-400 text-sm">
        Initializing Station Telemetry Bus...
      </div>
    );
  }

  const isStreamA = telemetry.activeStream === 'STREAM_A';
  const isEsdTripped = telemetry.esdStatus === 'TRIPPED';

  return (
    <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
        {/* Station Identity & Location */}
        <div className="pt-2 md:pt-0 pr-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>STATION PROFILE</span>
          </div>
          <div className="font-bold text-white text-sm truncate" title={station.name}>
            {station.name}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">{station.location}</div>
        </div>

        {/* Rating & MAOP Limit */}
        <div className="pt-2 md:pt-0 px-0 md:px-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>SAFETY CLASS & MAOP</span>
          </div>
          <div className="font-bold text-white text-sm font-mono-numbers">
            {formatPressure(station.maopBar, units.pressure, 1)}
          </div>
          <div className="text-[11px] text-slate-400 truncate mt-0.5">{station.ansiClass}</div>
        </div>

        {/* Stream Redundancy Status */}
        <div className="pt-2 md:pt-0 px-0 md:px-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>ACTIVE RUN STREAM</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                isEsdTripped
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isEsdTripped ? 'ISOLATED' : isStreamA ? 'STREAM A (DUTY)' : 'STREAM B (DUTY)'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
            {isStreamA ? 'Run B: Hot Standby' : 'Run A: Hot Standby'}
          </div>
        </div>

        {/* Instantaneous Flow Rate */}
        <div className="pt-2 md:pt-0 px-0 md:px-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
            <span>GAS FLOW VELOCITY</span>
          </div>
          <div className="font-bold text-cyan-300 text-sm font-mono font-mono-numbers">
            {formatFlow(telemetry.flowRate, units.flow)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
            {telemetry.flowRateMMSCFD} MMSCFD
          </div>
        </div>

        {/* 24-Hour Cumulative Throughput */}
        <div className="pt-2 md:pt-0 px-0 md:px-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <Gauge className="w-3.5 h-3.5 text-purple-400" />
            <span>24H ACCUMULATED</span>
          </div>
          <div className="font-bold text-slate-200 text-sm font-mono font-mono-numbers">
            {telemetry.dailyCumulativeSm3.toLocaleString()} Sm³
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Custody Fiscal Batching</div>
        </div>

        {/* Filter & Preheater Health summary */}
        <div className="pt-2 md:pt-0 pl-0 md:pl-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>SUB-SYSTEM HEALTH</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono ${
                telemetry.filterStatus === 'CLEAN' || telemetry.filterStatus === 'NORMAL'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-amber-400 bg-amber-500/10'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              FLT: {telemetry.filterStatus}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono ${
                telemetry.hydrateRiskPercent > 60
                  ? 'text-rose-400 bg-rose-500/10'
                  : 'text-cyan-400 bg-cyan-500/10'
              }`}
            >
              {telemetry.hydrateRiskPercent > 60 ? (
                <AlertTriangle className="w-3 h-3" />
              ) : (
                <CheckCircle className="w-3 h-3" />
              )}
              HYD: {telemetry.hydrateRiskPercent}%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">
            Bath: {telemetry.waterBathTemp.toFixed(1)}°C
          </div>
        </div>
      </div>
    </div>
  );
};
