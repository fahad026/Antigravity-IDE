import { useState, useEffect } from 'react';
import {
  Activity,
  Sliders,
  Volume2,
  VolumeX,
  Radio,
  Power,
  Layers,
  Clock,
  MapPin,
  Cpu,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import type { StationConfig, UnitPreferences, TelemetryPoint } from '../types/telemetry';
import { scadaAudio } from '../services/audioAlerts';

interface HeaderProps {
  stations: StationConfig[];
  currentStation: StationConfig;
  onSelectStation: (stationId: string) => void;
  units: UnitPreferences;
  onToggleUnits: () => void;
  onOpenControls: () => void;
  onOpenAlarms: () => void;
  onOpenIoTFlow: () => void;
  telemetry: TelemetryPoint | null;
  isServerOnline: boolean;
  esdTripped: boolean;
  activeAlarmsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  stations,
  currentStation,
  onSelectStation,
  units,
  onToggleUnits,
  onOpenControls,
  onOpenAlarms,
  onOpenIoTFlow,
  telemetry,
  isServerOnline,
  esdTripped,
  activeAlarmsCount,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleToggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    scadaAudio.setMuted(next);
    if (!next) {
      scadaAudio.playTelemetryChirp();
    }
  };

  return (
    <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo & Application Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-transparent border border-cyan-500/40 shadow-inner glow-cyan">
              <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-400 border-2 border-[#090d16]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                  SCADA TELEMETRY
                </span>
                <span className="text-xs text-slate-500 font-mono">v2.4.0</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                GasRMS Telemetry & Pipeline Health
              </h1>
            </div>
          </div>

          {/* Mobile Station Selector */}
          <div className="md:hidden">
            <select
              value={currentStation.id}
              onChange={(e) => onSelectStation(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-cyan-400 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-cyan-500"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}: {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Station Switcher & Status */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-1">
            <span className="text-xs text-slate-400 font-mono px-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" /> RMS GATE:
            </span>
            <select
              value={currentStation.id}
              onChange={(e) => onSelectStation(e.target.value)}
              className="bg-slate-950 border border-slate-700 hover:border-cyan-500 text-white font-medium text-xs rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors cursor-pointer"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} • {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          {/* Connection status badge */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900/80 border border-slate-800 text-xs">
            <div className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-mono">
              {isServerOnline ? 'SSE LINK: 1 Hz' : 'LOCAL SIMULATOR'}
            </span>
          </div>

          {/* ESD Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono font-bold ${
              esdTripped
                ? 'bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            ESD: {esdTripped ? 'TRIPPED (SHUT)' : 'ARMED'}
          </div>

          {/* Dynamic Anomaly Flag Badge (Automated Green -> Red transition as per 4-step IoT prompt) */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-mono font-bold transition-all ${
              telemetry?.anomalyFlag === 'CRITICAL PIPELINE DROP'
                ? 'bg-rose-600/30 border-rose-500 text-rose-200 animate-pulse ring-2 ring-rose-500'
                : telemetry?.anomalyFlag === 'VALVE CHATTER DETECTED'
                ? 'bg-amber-600/30 border-amber-500 text-amber-200 animate-pulse ring-2 ring-amber-500'
                : telemetry?.anomalyFlag && telemetry.anomalyFlag !== 'NORMAL'
                ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {telemetry?.anomalyFlag && telemetry.anomalyFlag !== 'NORMAL' ? (
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span className="truncate max-w-[170px]">
              {telemetry?.anomalyFlag || 'NORMAL'}
            </span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime.toLocaleTimeString()} UTC</span>
          </div>

          {/* Unit Toggle Button */}
          <button
            onClick={onToggleUnits}
            title="Toggle Metric (Bar, °C) / Imperial (PSI, °F)"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 hover:border-cyan-500 text-xs font-mono text-cyan-300 hover:text-white transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>{units.pressure === 'BAR' ? 'METRIC' : 'IMPERIAL'}</span>
          </button>

          {/* Audio toggle button */}
          <button
            onClick={handleToggleSound}
            title={isMuted ? 'Unmute SCADA Acoustic Alerts' : 'Mute SCADA Audio'}
            className={`p-1.5 rounded-md border text-xs transition-all cursor-pointer ${
              isMuted
                ? 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                : 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Alarms center trigger */}
          <button
            onClick={onOpenAlarms}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-all cursor-pointer ${
              activeAlarmsCount > 0
                ? 'bg-rose-500/20 border-rose-500 text-rose-300 hover:bg-rose-500/30'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span>ALARMS</span>
            {activeAlarmsCount > 0 && (
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono animate-bounce">
                {activeAlarmsCount}
              </span>
            )}
          </button>

          {/* 4-Step IoT Architecture Inspector Trigger */}
          <button
            onClick={onOpenIoTFlow}
            title="Inspect 4-Stage IoT Pipeline: Sensing -> Edge Gateway -> MQTT/Database -> Antigravity UI"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-cyan-950/80 border border-cyan-500/50 hover:border-cyan-400 text-xs font-mono text-cyan-300 hover:text-white transition-all cursor-pointer shadow-sm group"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-45 transition-transform" />
            <span className="font-bold">IOT FLOW</span>
            <span className="text-[10px] text-cyan-300 bg-cyan-500/20 px-1 py-0.2 rounded font-mono font-bold">4-STEP</span>
          </button>

          {/* Operator Controls Button */}
          <button
            onClick={onOpenControls}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-md hover:shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>OPERATOR PANEL</span>
          </button>
        </div>
      </div>
    </header>
  );
};
