import { useState } from 'react';
import {
  Activity,
  Play,
  Pause,
} from 'lucide-react';
import type { TelemetryPoint, StationConfig, UnitPreferences } from '../types/telemetry';
import { formatPressure } from '../utils/units';

interface TelemetryOscilloscopeProps {
  history: TelemetryPoint[];
  currentPoint: TelemetryPoint;
  station: StationConfig;
  units: UnitPreferences;
}

export const TelemetryOscilloscope: React.FC<TelemetryOscilloscopeProps> = ({
  history,
  currentPoint,
  station,
  units,
}) => {
  const [timeWindow, setTimeWindow] = useState<30 | 60 | 90>(60);
  const [isPaused, setIsPaused] = useState(false);
  const [frozenHistory, setFrozenHistory] = useState<TelemetryPoint[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Toggle freeze
  const handleTogglePause = () => {
    if (!isPaused) {
      setFrozenHistory([...history]);
      setIsPaused(true);
    } else {
      setIsPaused(false);
    }
  };

  const activePoints = (isPaused ? frozenHistory : history).slice(-timeWindow);

  // Compute dynamic scale for Y-axis (Pressure)
  const maxP = Math.max(
    station.maopBar,
    ...activePoints.map((p) => p.inletPressure),
    station.opsoLimitBar + 5
  );
  const minP = 0;

  // SVG dimensions
  const svgWidth = 900;
  const svgHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getX = (idx: number, total: number) => {
    if (total <= 1) return paddingLeft;
    return paddingLeft + (idx / (total - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const clamped = Math.max(minP, Math.min(maxP, val));
    return paddingTop + (1 - (clamped - minP) / (maxP - minP)) * plotHeight;
  };

  // Generate SVG path for Inlet Pressure
  const inletPath = activePoints
    .map((p, idx) => {
      const x = getX(idx, activePoints.length);
      const y = getY(p.inletPressure);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Generate SVG path for Outlet Pressure
  const outletPath = activePoints
    .map((p, idx) => {
      const x = getX(idx, activePoints.length);
      const y = getY(p.outletPressure);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  // Guide lines
  const opsoY = getY(station.opsoLimitBar);
  const setpointY = getY(currentPoint.outletPressureSetpoint);
  const upsoY = getY(station.upsoLimitBar);

  const hoveredPoint = hoverIndex !== null && activePoints[hoverIndex] ? activePoints[hoverIndex] : null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
                CH-1 / CH-2 TELEMETRY TRACE
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isPaused ? '⏸ FREEZE-FRAME PAUSED' : '● REAL-TIME STREAMING (1 Hz)'}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              High-Speed Multi-Channel Pressure & Valve Trajectory Oscilloscope
            </h2>
          </div>
        </div>

        {/* Oscilloscope controls */}
        <div className="flex items-center gap-2 text-xs font-mono">
          {/* Pause / Resume */}
          <button
            onClick={handleTogglePause}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'RESUME' : 'FREEZE'}</span>
          </button>

          {/* Time window selector */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
            {([30, 60, 90] as const).map((w) => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  timeWindow === w
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {w}s
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend & Channel Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono py-2 px-1 text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-bold">CH1: Inlet (P₁)</span>
            <span className="text-amber-400 font-mono-numbers">
              {formatPressure(currentPoint.inletPressure, units.pressure)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-bold">CH2: Outlet (P₂)</span>
            <span className="text-cyan-400 font-mono-numbers">
              {formatPressure(currentPoint.outletPressure, units.pressure)}
            </span>
          </div>

          <div className="flex items-center gap-1.5 hidden md:flex">
            <span className="w-2.5 h-0.5 border-b border-dashed border-rose-500" />
            <span className="text-rose-400">OPSO Trip: {formatPressure(station.opsoLimitBar, units.pressure, 1)}</span>
          </div>

          <div className="flex items-center gap-1.5 hidden md:flex">
            <span className="w-2.5 h-0.5 border-b border-dotted border-emerald-400" />
            <span className="text-emerald-400">Setpoint: {formatPressure(currentPoint.outletPressureSetpoint, units.pressure, 1)}</span>
          </div>
        </div>

        {hoveredPoint && (
          <div className="text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/30">
            Cursor @ {new Date(hoveredPoint.timestamp).toLocaleTimeString()}: P₁={formatPressure(hoveredPoint.inletPressure, units.pressure)} | P₂={formatPressure(hoveredPoint.outletPressure, units.pressure)}
          </div>
        )}
      </div>

      {/* SVG Canvas Oscilloscope Screen */}
      <div className="w-full bg-[#070b14] rounded-xl border border-slate-800/90 p-2 overflow-hidden shadow-inner relative">
        {/* CRT Scanline styling effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none" />

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="inletGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="outletGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
            const y = paddingTop + frac * plotHeight;
            const pressVal = maxP - frac * (maxP - minP);
            return (
              <g key={`h-grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {formatPressure(pressVal, units.pressure, 0)}
                </text>
              </g>
            );
          })}

          {/* Grid lines (vertical time slices) */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((frac, idx) => {
            const x = paddingLeft + frac * plotWidth;
            const secAgo = Math.round((1 - frac) * timeWindow);
            return (
              <g key={`v-grid-${idx}`}>
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={svgHeight - paddingBottom}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text
                  x={x}
                  y={svgHeight - paddingBottom + 16}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  -{secAgo}s
                </text>
              </g>
            );
          })}

          {/* Safety guideline: OPSO limit */}
          <line
            x1={paddingLeft}
            y1={opsoY}
            x2={svgWidth - paddingRight}
            y2={opsoY}
            stroke="#ef4444"
            strokeWidth="1.5"
            strokeDasharray="5 3"
          />
          <text
            x={svgWidth - paddingRight - 4}
            y={opsoY - 4}
            textAnchor="end"
            fill="#ef4444"
            fontSize="8"
            fontFamily="monospace"
          >
            OPSO SLAM LIMIT
          </text>

          {/* Safety guideline: Setpoint */}
          <line
            x1={paddingLeft}
            y1={setpointY}
            x2={svgWidth - paddingRight}
            y2={setpointY}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="2 2"
          />
          <text
            x={svgWidth - paddingRight - 4}
            y={setpointY - 4}
            textAnchor="end"
            fill="#10b981"
            fontSize="8"
            fontFamily="monospace"
          >
            TARGET SETPOINT
          </text>

          {/* Safety guideline: UPSO limit */}
          <line
            x1={paddingLeft}
            y1={upsoY}
            x2={svgWidth - paddingRight}
            y2={upsoY}
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={svgWidth - paddingRight - 4}
            y={upsoY - 4}
            textAnchor="end"
            fill="#3b82f6"
            fontSize="8"
            fontFamily="monospace"
          >
            UPSO SHUTOFF LIMIT
          </text>

          {/* CH1: Inlet Pressure Waveform */}
          {activePoints.length > 1 && (
            <path
              d={inletPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* CH2: Outlet Pressure Waveform */}
          {activePoints.length > 1 && (
            <path
              d={outletPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Mouse Hover Tracking Columns */}
          {activePoints.map((_, idx) => {
            const x = getX(idx, activePoints.length);
            const w = plotWidth / Math.max(1, activePoints.length);
            return (
              <rect
                key={idx}
                x={x - w / 2}
                y={paddingTop}
                width={w}
                height={plotHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(idx)}
              />
            );
          })}

          {/* Hover Crosshair vertical bar */}
          {hoverIndex !== null && activePoints[hoverIndex] && (
            <g>
              <line
                x1={getX(hoverIndex, activePoints.length)}
                y1={paddingTop}
                x2={getX(hoverIndex, activePoints.length)}
                y2={svgHeight - paddingBottom}
                stroke="#38bdf8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(hoverIndex, activePoints.length)}
                cy={getY(activePoints[hoverIndex].inletPressure)}
                r="4"
                fill="#f59e0b"
                stroke="#fff"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoverIndex, activePoints.length)}
                cy={getY(activePoints[hoverIndex].outletPressure)}
                r="4"
                fill="#06b6d4"
                stroke="#fff"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
