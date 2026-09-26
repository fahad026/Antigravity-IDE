import { useEffect, useState } from 'react';
import type {
  StationConfig,
  TelemetryPoint,
  AlarmItem,
  UnitPreferences,
} from './types/telemetry';
import { api, FALLBACK_STATIONS } from './services/api';
import { DEFAULT_UNITS } from './utils/units';
import { Header } from './components/Header';
import { StationOverviewBanner } from './components/StationOverviewBanner';
import { KPISection } from './components/KPISection';
import { PIDSynopticSchematic } from './components/PIDSynopticSchematic';
import { VibrationHealthAnalyzer } from './components/VibrationHealthAnalyzer';
import { ThermalThermodynamicsWidget } from './components/ThermalThermodynamicsWidget';
import { TelemetryOscilloscope } from './components/TelemetryOscilloscope';
import { ControlConsoleModal } from './components/ControlConsoleModal';
import { SCADAAlarmCenter } from './components/SCADAAlarmCenter';
import { IoTSignalFlowPanel } from './components/IoTSignalFlowPanel';
import { ShieldAlert } from 'lucide-react';

export function App() {
  const [stations, setStations] = useState<StationConfig[]>(FALLBACK_STATIONS);
  const [currentStation, setCurrentStation] = useState<StationConfig>(FALLBACK_STATIONS[0]);
  const [telemetry, setTelemetry] = useState<TelemetryPoint | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [units, setUnits] = useState<UnitPreferences>(DEFAULT_UNITS);

  // Modals
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isAlarmsOpen, setIsAlarmsOpen] = useState(false);
  const [isIoTFlowOpen, setIsIoTFlowOpen] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(false);

  // Load initial stations and historical buffer
  useEffect(() => {
    let isMounted = true;

    async function initData() {
      const stList = await api.fetchStations();
      if (isMounted && stList.length > 0) {
        setStations(stList);
        setCurrentStation(stList[0]);
      }
      const initialAlarms = await api.fetchAlarms(stList[0]?.id || 'RMS-01');
      if (isMounted) {
        setAlarms(initialAlarms);
      }
      const hist = await api.fetchTelemetryHistory(stList[0]?.id || 'RMS-01');
      if (isMounted && hist.length > 0) {
        setHistory(hist);
        setTelemetry(hist[hist.length - 1]);
      }
      setIsServerOnline(api.getIsServerOnline());
    }

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Subscribe to live telemetry stream for selected station
  useEffect(() => {
    let isMounted = true;

    const unsubscribe = api.subscribeTelemetry(currentStation.id, (point) => {
      if (!isMounted) return;
      setTelemetry(point);
      setHistory((prev) => {
        const next = [...prev, point];
        return next.slice(-120); // Keep last 120 points
      });
      setIsServerOnline(api.getIsServerOnline());

      // If there are anomalies, refresh alarms
      if (point.anomalies.length > 0) {
        api.fetchAlarms(currentStation.id).then((alms) => {
          if (isMounted) setAlarms(alms);
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [currentStation.id]);

  // Handle station change
  const handleSelectStation = async (stationId: string) => {
    const found = stations.find((s) => s.id === stationId);
    if (found) {
      setCurrentStation(found);
      const hist = await api.fetchTelemetryHistory(stationId);
      setHistory(hist);
      if (hist.length > 0) {
        setTelemetry(hist[hist.length - 1]);
      }
      const alms = await api.fetchAlarms(stationId);
      setAlarms(alms);
    }
  };

  // Toggle Units
  const handleToggleUnits = () => {
    setUnits((prev) => ({
      pressure: prev.pressure === 'BAR' ? 'PSI' : 'BAR',
      temperature: prev.temperature === 'C' ? 'F' : 'C',
      flow: prev.flow === 'SM3H' ? 'MMSCFD' : 'SM3H',
      vibration: prev.vibration === 'MMS' ? 'IPS' : 'MMS',
    }));
  };

  // Operator Actions
  const handleUpdateSetpoint = async (newSetpoint: number) => {
    await api.sendControlCommand({
      action: 'SET_OUTLET_SETPOINT',
      stationId: currentStation.id,
      setpointBar: newSetpoint,
    });
  };

  const handleSwitchStream = async (targetStream: 'STREAM_A' | 'STREAM_B') => {
    await api.sendControlCommand({
      action: 'SWITCH_STREAM',
      stationId: currentStation.id,
      targetStream,
    });
  };

  const handleTriggerESD = async () => {
    await api.sendControlCommand({
      action: 'TRIGGER_ESD',
      stationId: currentStation.id,
    });
    const updated = await api.fetchAlarms(currentStation.id);
    setAlarms(updated);
  };

  const handleResetESD = async () => {
    await api.sendControlCommand({
      action: 'RESET_ESD',
      stationId: currentStation.id,
    });
  };

  const handleInjectFault = async (
    faultType: 'PIPELINE_DROP' | 'VALVE_CHATTER' | 'CAVITATION_VIBRATION' | 'PREHEATER_FLAMEOUT' | 'FILTER_CLOGGED' | 'PRESSURE_SURGE' | 'NORMAL'
  ) => {
    await api.sendControlCommand({
      action: faultType === 'NORMAL' ? 'CLEAR_FAULT' : 'INJECT_FAULT',
      stationId: currentStation.id,
      faultType,
    });
    const updated = await api.fetchAlarms(currentStation.id);
    setAlarms(updated);
  };

  const handleAcknowledgeAlarm = async (id: string, operator: string, note?: string) => {
    await api.acknowledgeAlarm(id, operator, note);
    const updated = await api.fetchAlarms(currentStation.id);
    setAlarms(updated);
  };

  const unacknowledgedAlarms = alarms.filter((a) => !a.acknowledged);
  const criticalAlarms = unacknowledgedAlarms.filter((a) => a.severity === 'CRITICAL');
  const esdTripped = telemetry?.esdStatus === 'TRIPPED';
  const isPipelineDrop = telemetry?.anomalyFlag === 'CRITICAL PIPELINE DROP';
  const isValveChatter = telemetry?.anomalyFlag === 'VALVE CHATTER DETECTED';
  const hasActiveHazard = criticalAlarms.length > 0 || esdTripped || isPipelineDrop || isValveChatter;

  return (
    <div className="min-h-screen bg-[#080c15] text-slate-100 flex flex-col font-sans scada-grid-bg">
      {/* SCADA Global Header */}
      <Header
        stations={stations}
        currentStation={currentStation}
        onSelectStation={handleSelectStation}
        units={units}
        onToggleUnits={handleToggleUnits}
        onOpenControls={() => setIsControlsOpen(true)}
        onOpenAlarms={() => setIsAlarmsOpen(true)}
        onOpenIoTFlow={() => setIsIoTFlowOpen(true)}
        telemetry={telemetry}
        isServerOnline={isServerOnline}
        esdTripped={esdTripped}
        activeAlarmsCount={unacknowledgedAlarms.length}
      />

      {/* Critical Hazard Alert Banner (Displays if ESD tripped, critical alarm active, or anomaly triggered) */}
      {hasActiveHazard && (
        <div className="bg-rose-600/90 text-white px-4 py-2.5 shadow-lg border-b border-rose-500 animate-pulse">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold font-mono">
              <ShieldAlert className="w-4 h-4 text-white shrink-0" />
              <span>
                {esdTripped
                  ? 'CRITICAL ALERT: EMERGENCY SLAM-SHUT VALVE (SSV-101) IS TRIPPED! STATION ISOLATED.'
                  : isPipelineDrop
                  ? 'CRITICAL PIPELINE DROP DETECTED! Yokogawa inlet pressure dropped below safe threshold (Line breach suspected).'
                  : isValveChatter
                  ? 'VALVE CHATTER DETECTED! ADXL345 accelerometer registers severe high-frequency valve seat flutter.'
                  : `ACTIVE PROCESS HAZARD: ${criticalAlarms[0].title} (${criticalAlarms[0].message})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsIoTFlowOpen(true)}
                className="px-3 py-1 bg-cyan-900 text-cyan-200 hover:bg-cyan-800 rounded text-xs font-bold font-mono cursor-pointer"
              >
                VIEW IOT FLOW
              </button>
              <button
                onClick={() => setIsAlarmsOpen(true)}
                className="px-3 py-1 bg-white text-rose-700 hover:bg-slate-100 rounded text-xs font-bold font-mono cursor-pointer"
              >
                VIEW ALARM ANNUNCIATOR
              </button>
              <button
                onClick={() => setIsControlsOpen(true)}
                className="px-3 py-1 bg-slate-900 text-white hover:bg-slate-800 rounded text-xs font-bold font-mono cursor-pointer"
              >
                INTERVENE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Station Overview Banner */}
        <StationOverviewBanner
          station={currentStation}
          telemetry={telemetry}
          units={units}
        />

        {/* 4 Main SCADA KPI Cards */}
        {telemetry && (
          <KPISection
            telemetry={telemetry}
            station={currentStation}
            units={units}
          />
        )}

        {/* Interactive P&ID Flow Schematic Mimic */}
        {telemetry && (
          <PIDSynopticSchematic
            telemetry={telemetry}
            station={currentStation}
            units={units}
            onOpenControls={() => setIsControlsOpen(true)}
          />
        )}

        {/* Deep Analysis Grid: Regulator Valve Vibration & Thermodynamic J-T Balance */}
        {telemetry && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Regulator Valve Vibration & Acoustic Spectrum */}
            <div className="lg:col-span-7">
              <VibrationHealthAnalyzer
                vibration={telemetry.vibration}
                units={units}
                onInjectVibrationFault={() => handleInjectFault('CAVITATION_VIBRATION')}
              />
            </div>

            {/* Right 5 Columns: Thermodynamics & Hydrate Freeze Guard */}
            <div className="lg:col-span-5">
              <ThermalThermodynamicsWidget
                telemetry={telemetry}
                units={units}
              />
            </div>
          </div>
        )}

        {/* High-Speed Multi-Channel Oscilloscope */}
        {telemetry && (
          <TelemetryOscilloscope
            history={history}
            currentPoint={telemetry}
            station={currentStation}
            units={units}
          />
        )}
      </main>

      {/* Operator Control Console Modal */}
      {telemetry && (
        <ControlConsoleModal
          isOpen={isControlsOpen}
          onClose={() => setIsControlsOpen(false)}
          telemetry={telemetry}
          station={currentStation}
          units={units}
          onUpdateSetpoint={handleUpdateSetpoint}
          onSwitchStream={handleSwitchStream}
          onTriggerESD={handleTriggerESD}
          onResetESD={handleResetESD}
          onInjectFault={handleInjectFault}
        />
      )}

      {/* SCADA Alarm Annunciator Modal */}
      <SCADAAlarmCenter
        isOpen={isAlarmsOpen}
        onClose={() => setIsAlarmsOpen(false)}
        alarms={alarms}
        onAcknowledgeAlarm={handleAcknowledgeAlarm}
        stationName={currentStation.name}
      />

      {/* 4-Stage IoT Architecture Flow Inspector Modal */}
      {telemetry && (
        <IoTSignalFlowPanel
          isOpen={isIoTFlowOpen}
          onClose={() => setIsIoTFlowOpen(false)}
          telemetry={telemetry}
          station={currentStation}
          onTriggerFault={handleInjectFault}
        />
      )}

      {/* Industrial Footer */}
      <footer className="border-t border-slate-800/80 bg-[#090d17] py-4 px-6 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="font-bold text-slate-300">GasRMS-Telemetry-Monitor</span>
            <span>• ANSI / ISA-5.1 Instrumentation & SCADA Standard</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <span>ASME B31.8 Gas Piping</span>
            <span>•</span>
            <span>ISO 10816-3 Vibration Severity</span>
            <span>•</span>
            <span>AGA-9 Custody Flow</span>
            <span>•</span>
            <span>SIL-3 Safety Loop</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
