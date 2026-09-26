import fs from 'node:fs';
import path from 'node:path';
import type { StationConfig, AlarmItem } from '../src/types/telemetry';

export const INITIAL_STATIONS: StationConfig[] = [
  {
    id: 'RMS-Station-04',
    name: 'RMS-Station-04 City Distribution Header',
    code: 'RMS-04-IOT',
    location: 'District 4 Gas Regulating Terminal',
    ansiClass: 'Class 600 (Yokogawa / PT100 / ADXL345 Sensing)',
    maopBar: 70.0,
    designFlowCapacity: 50000,
    nominalInletBar: 65.4,
    nominalOutletBar: 12.1,
    opsoLimitBar: 16.5,
    upsoLimitBar: 8.5,
    maxVibrationMmS: 4.5,
    minPreheatTempC: 45.0,
    gatewayType: 'ESP32-S3',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-Station-04',
  },
  {
    id: 'RMS-01',
    name: 'St. Clair North City Gate RMS',
    code: 'SC-RMS-01',
    location: 'Sector 4B Transmission Junction',
    ansiClass: 'Class 600 (ANSI 100 Bar Rating)',
    maopBar: 75.0,
    designFlowCapacity: 45000,
    nominalInletBar: 64.5,
    nominalOutletBar: 19.5,
    opsoLimitBar: 22.0,
    upsoLimitBar: 16.5,
    maxVibrationMmS: 4.5,
    minPreheatTempC: 45.0,
    gatewayType: 'Raspberry Pi CM4',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-01',
  },
  {
    id: 'RMS-02',
    name: 'Bayview Petrochem Industrial Feeder',
    code: 'BV-RMS-02',
    location: 'Bayview Chemical Corridor Pier 8',
    ansiClass: 'Class 900 (High Pressure Header)',
    maopBar: 88.0,
    designFlowCapacity: 80000,
    nominalInletBar: 74.0,
    nominalOutletBar: 28.0,
    opsoLimitBar: 31.5,
    upsoLimitBar: 24.0,
    maxVibrationMmS: 5.0,
    minPreheatTempC: 50.0,
    gatewayType: 'ESP32-S3',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-02',
  },
  {
    id: 'RMS-03',
    name: 'Highland CCGT Peaking Power RMS',
    code: 'HL-RMS-03',
    location: 'Highland Turbine Substation Enclosure',
    ansiClass: 'Class 300 / 600 Dual Stream',
    maopBar: 55.0,
    designFlowCapacity: 62000,
    nominalInletBar: 48.0,
    nominalOutletBar: 14.5,
    opsoLimitBar: 17.0,
    upsoLimitBar: 12.0,
    maxVibrationMmS: 4.0,
    minPreheatTempC: 42.0,
    gatewayType: 'Raspberry Pi CM4',
    mqttBrokerTopic: 'gasrms/telemetry/RMS-03',
  }
];

export interface DataStore {
  stations: StationConfig[];
  alarms: AlarmItem[];
  auditLogs: {
    id: string;
    timestamp: string;
    stationId: string;
    operator: string;
    action: string;
    details: string;
  }[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'rms_telemetry_store.json');

class DatabaseService {
  private data: DataStore;

  constructor() {
    this.data = {
      stations: INITIAL_STATIONS,
      alarms: this.generateInitialAlarms(),
      auditLogs: [
        {
          id: 'log-001',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          stationId: 'RMS-01',
          operator: 'Lead SCADA Dispatcher [OP-774]',
          action: 'ROUTINE_INSPECTION',
          details: 'Shift change handover; Stream A in Duty, Stream B in Standby.'
        }
      ]
    };
    this.init();
  }

  private generateInitialAlarms(): AlarmItem[] {
    const now = Date.now();
    return [
      {
        id: 'ALM-101',
        stationId: 'RMS-01',
        timestamp: new Date(now - 1200000).toISOString(),
        severity: 'INFO',
        tag: 'FIT-101',
        title: 'Ultrasonic Flow Range Verification',
        message: 'Flow velocity within nominal calibrated envelope (18,420 Sm3/h).',
        value: '18,420 Sm3/h',
        threshold: 'Nominal 45,000 max',
        acknowledged: true,
        acknowledgedBy: 'System Auto-Log',
        acknowledgedAt: new Date(now - 1100000).toISOString(),
      },
      {
        id: 'ALM-102',
        stationId: 'RMS-01',
        timestamp: new Date(now - 300000).toISOString(),
        severity: 'WARNING',
        tag: 'PDT-101',
        title: 'Filter Coarse Differential Pressure Advisory',
        message: 'Cartridge strainer differential pressure approaching service threshold (0.42 bar).',
        value: '0.42 Bar',
        threshold: '> 0.70 Bar (Clean Recommended)',
        acknowledged: false,
      }
    ];
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed.stations && parsed.alarms) {
          const hasRms04 = parsed.stations.some((s: any) => s.id === 'RMS-Station-04');
          if (!hasRms04) {
            parsed.stations = [INITIAL_STATIONS[0], ...parsed.stations];
          }
          this.data = parsed;
          this.save();
          return;
        }
      }
      this.save();
    } catch (err) {
      console.error('Error initializing database file, using in-memory store:', err);
    }
  }

  public save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  public getStations(): StationConfig[] {
    return this.data.stations;
  }

  public getStation(id: string): StationConfig | undefined {
    return this.data.stations.find((s) => s.id === id);
  }

  public updateStationConfig(id: string, updates: Partial<StationConfig>): StationConfig | null {
    const station = this.data.stations.find((s) => s.id === id);
    if (!station) return null;
    Object.assign(station, updates);
    this.save();
    return station;
  }

  public getAlarms(stationId?: string): AlarmItem[] {
    if (stationId) {
      return this.data.alarms.filter((a) => a.stationId === stationId);
    }
    return this.data.alarms;
  }

  public addAlarm(alarm: Omit<AlarmItem, 'id'>): AlarmItem {
    const newAlarm: AlarmItem = {
      ...alarm,
      id: `ALM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
    };
    // Prepend to list
    this.data.alarms.unshift(newAlarm);
    // Keep max 200 alarms
    if (this.data.alarms.length > 200) {
      this.data.alarms = this.data.alarms.slice(0, 200);
    }
    this.save();
    return newAlarm;
  }

  public acknowledgeAlarm(id: string, operator: string, note?: string): AlarmItem | null {
    const alarm = this.data.alarms.find((a) => a.id === id);
    if (!alarm) return null;
    alarm.acknowledged = true;
    alarm.acknowledgedBy = operator || 'SCADA Operator';
    alarm.acknowledgedAt = new Date().toISOString();
    if (note) {
      alarm.operatorNote = note;
    }
    this.save();
    return alarm;
  }

  public addAuditLog(stationId: string, operator: string, action: string, details: string) {
    this.data.auditLogs.unshift({
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      stationId,
      operator,
      action,
      details,
    });
    if (this.data.auditLogs.length > 100) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 100);
    }
    this.save();
  }

  public getAuditLogs(stationId?: string) {
    if (stationId) {
      return this.data.auditLogs.filter((l) => l.stationId === stationId);
    }
    return this.data.auditLogs;
  }
}

export const db = new DatabaseService();
