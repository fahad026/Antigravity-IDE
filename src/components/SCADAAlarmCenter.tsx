import { useState } from 'react';
import type { FormEvent } from 'react';
import {
  Radio,
  X,
  CheckCircle2,
  FileDown,
  FileSpreadsheet,
  Filter,
  Check,
  Clock,
  UserCheck
} from 'lucide-react';
import type { AlarmItem } from '../types/telemetry';

interface SCADAAlarmCenterProps {
  isOpen: boolean;
  onClose: () => void;
  alarms: AlarmItem[];
  onAcknowledgeAlarm: (id: string, operator: string, note?: string) => Promise<void>;
  stationName: string;
}

export const SCADAAlarmCenter: React.FC<SCADAAlarmCenterProps> = ({
  isOpen,
  onClose,
  alarms,
  onAcknowledgeAlarm,
  stationName,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'ACTIVE_ONLY' | 'CRITICAL' | 'WARNING'>('ACTIVE_ONLY');
  const [ackModalAlarm, setAckModalAlarm] = useState<AlarmItem | null>(null);
  const [operatorName, setOperatorName] = useState('Operator-447 [Control Room]');
  const [operatorNote, setOperatorNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter alarms
  const filteredAlarms = alarms.filter((a) => {
    if (filterSeverity === 'ACTIVE_ONLY') return !a.acknowledged;
    if (filterSeverity === 'CRITICAL') return a.severity === 'CRITICAL';
    if (filterSeverity === 'WARNING') return a.severity === 'WARNING';
    return true;
  });

  const handleAcknowledgeSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ackModalAlarm) return;
    setIsSubmitting(true);
    try {
      await onAcknowledgeAlarm(ackModalAlarm.id, operatorName, operatorNote);
      setAckModalAlarm(null);
      setOperatorNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Alarm ID', 'Station', 'Timestamp', 'Severity', 'Tag', 'Title', 'Message', 'Measured Value', 'Threshold', 'Acknowledged', 'Acknowledged By', 'Acknowledged At'];
    const rows = alarms.map((a) => [
      `"${a.id}"`,
      `"${a.stationId}"`,
      `"${a.timestamp}"`,
      `"${a.severity}"`,
      `"${a.tag}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.message.replace(/"/g, '""')}"`,
      `"${a.value}"`,
      `"${a.threshold}"`,
      `"${a.acknowledged ? 'YES' : 'NO'}"`,
      `"${a.acknowledgedBy || ''}"`,
      `"${a.acknowledgedAt || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GasRMS_Alarms_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify({ exportedAt: new Date().toISOString(), station: stationName, totalAlarms: alarms.length, alarms }, null, 2)
    )}`;
    const link = document.createElement('a');
    link.setAttribute('href', jsonString);
    link.setAttribute('download', `GasRMS_Telemetry_Report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-rose-400 tracking-wider">
                SCADA ANNUNCIATOR PANEL
              </span>
              <h2 className="text-lg font-bold text-white">
                Station Alarm Log & Event Journal ({stationName})
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition-colors cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>JSON REPORT</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-800/80 bg-slate-950/40 text-xs font-mono">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">FILTER BY:</span>
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(
                [
                  { id: 'ACTIVE_ONLY', label: 'Unacknowledged' },
                  { id: 'CRITICAL', label: 'Critical' },
                  { id: 'WARNING', label: 'Warnings' },
                  { id: 'ALL', label: 'All Records' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterSeverity(tab.id)}
                  className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                    filterSeverity === tab.id
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-slate-400">
            Showing <strong className="text-white">{filteredAlarms.length}</strong> of{' '}
            <strong className="text-white">{alarms.length}</strong> total alarms
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredAlarms.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50" />
              <div className="text-sm font-medium text-slate-300">No matching alarm records found</div>
              <div className="text-xs">All industrial safety loops within calibrated parameters.</div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAlarms.map((alarm) => {
                const isCrit = alarm.severity === 'CRITICAL';
                const isWarn = alarm.severity === 'WARNING';

                return (
                  <div
                    key={alarm.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      alarm.acknowledged
                        ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                        : isCrit
                        ? 'bg-rose-950/30 border-rose-500/50 text-slate-200 glow-rose'
                        : isWarn
                        ? 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                        : 'bg-slate-950/80 border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {/* Severity LED badge */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider ${
                            isCrit
                              ? 'bg-rose-500 text-white animate-pulse'
                              : isWarn
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-blue-500 text-white'
                          }`}
                        >
                          {alarm.severity}
                        </span>

                        <span className="text-xs font-mono font-bold text-cyan-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {alarm.tag}
                        </span>

                        <span className="font-bold text-sm text-white">{alarm.title}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {new Date(alarm.timestamp).toLocaleTimeString()}
                        </span>

                        {!alarm.acknowledged ? (
                          <button
                            onClick={() => setAckModalAlarm(alarm)}
                            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors cursor-pointer shadow"
                          >
                            ACKNOWLEDGE
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            ACK by {alarm.acknowledgedBy}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">{alarm.message}</p>

                    <div className="flex flex-wrap items-center gap-4 mt-2.5 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                      <span>
                        Measured: <strong className="text-white">{alarm.value}</strong>
                      </span>
                      <span>
                        Trip Envelope: <strong className="text-rose-400">{alarm.threshold}</strong>
                      </span>
                      {alarm.operatorNote && (
                        <span className="text-cyan-300 italic">
                          Note: "{alarm.operatorNote}"
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            CLOSE ALARMS PANEL
          </button>
        </div>
      </div>

      {/* Operator Signature Acknowledge Sub-Modal */}
      {ackModalAlarm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Operator Alarm Acknowledgment
              </h3>
              <button
                onClick={() => setAckModalAlarm(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAcknowledgeSubmit} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Operator Signature / Call-Sign
                </label>
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">
                  Action Note / Log Comments (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified pilot feed, dispatched field technician to inspect trim."
                  value={operatorNote}
                  onChange={(e) => setOperatorNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setAckModalAlarm(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-500 cursor-pointer"
                >
                  SIGN & ACKNOWLEDGE
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
