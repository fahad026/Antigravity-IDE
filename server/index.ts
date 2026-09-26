import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { db } from './db';
import { telemetryEngine } from './telemetryEngine';
import type { ControlPayload } from '../src/types/telemetry';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'GasRMS-Telemetry-Monitor-Core',
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
  });
});

// Stations list
app.get('/api/stations', (req, res) => {
  const stations = db.getStations();
  res.json({ success: true, data: stations });
});

// Station details
app.get('/api/stations/:id', (req, res) => {
  const station = db.getStation(req.params.id);
  if (!station) {
    return res.status(404).json({ success: false, message: 'Station not found' });
  }
  res.json({ success: true, data: station });
});

// Latest instantaneous telemetry snapshot
app.get('/api/telemetry/latest', (req, res) => {
  const stationId = (req.query.stationId as string) || 'RMS-01';
  const data = telemetryEngine.getLatestTelemetry(stationId);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Telemetry not found for station' });
  }
  res.json({ success: true, data });
});

// Historical buffer for charts
app.get('/api/telemetry/history', (req, res) => {
  const stationId = (req.query.stationId as string) || 'RMS-01';
  const limit = Math.min(120, Number(req.query.limit) || 60);
  const data = telemetryEngine.getTelemetryHistory(stationId, limit);
  res.json({ success: true, count: data.length, data });
});

// Alarms list
app.get('/api/alarms', (req, res) => {
  const stationId = req.query.stationId as string | undefined;
  const alarms = db.getAlarms(stationId);
  res.json({ success: true, count: alarms.length, data: alarms });
});

// Acknowledge alarm
app.post('/api/alarms/:id/acknowledge', (req, res) => {
  const { operator, note } = req.body;
  const alarm = db.acknowledgeAlarm(req.params.id, operator, note);
  if (!alarm) {
    return res.status(404).json({ success: false, message: 'Alarm not found' });
  }
  res.json({ success: true, data: alarm });
});

// Station Control Command (Setpoint, Stream switch, ESD)
app.post('/api/stations/:id/control', (req, res) => {
  const stationId = req.params.id;
  const payload: ControlPayload = {
    ...req.body,
    stationId,
  };
  const result = telemetryEngine.handleControlCommand(payload);
  if (!result.success) {
    return res.status(400).json(result);
  }
  res.json(result);
});

// Fault Injection / Clear
app.post('/api/stations/:id/inject-fault', (req, res) => {
  const stationId = req.params.id;
  const { faultType, operator } = req.body;
  const payload: ControlPayload = {
    action: faultType === 'NORMAL' ? 'CLEAR_FAULT' : 'INJECT_FAULT',
    stationId,
    faultType,
    operator: operator || 'SCADA Test Engineer',
  };
  const result = telemetryEngine.handleControlCommand(payload);
  res.json(result);
});

// Audit logs
app.get('/api/audit-logs', (req, res) => {
  const stationId = req.query.stationId as string | undefined;
  const logs = db.getAuditLogs(stationId);
  res.json({ success: true, count: logs.length, data: logs });
});

// Server-Sent Events (SSE) Live Telemetry Stream
app.get('/api/telemetry/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  const unregister = telemetryEngine.registerSSEClient((point) => {
    res.write(`data: ${JSON.stringify({ type: 'TELEMETRY', payload: point })}\n\n`);
  });

  req.on('close', () => {
    unregister();
  });
});

// Production Static Assets & SPA Fallback (Express 5 compatible)
const DIST_DIR = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[GasRMS Telemetry Core] SCADA Server listening on 0.0.0.0:${PORT}`);
  console.log(`  > Local:   http://localhost:${PORT}/`);
  console.log(`  > Network: http://192.168.0.115:${PORT}/`);
  console.log(`  > SSE:     http://localhost:${PORT}/api/telemetry/stream`);
});
