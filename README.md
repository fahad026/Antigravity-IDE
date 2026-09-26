# GasRMS-Telemetry-Monitor
## Gas Transmission Telemetry & Pipeline Health Dashboard

A production-grade, real-time industrial SCADA telemetry and predictive pipeline health monitoring dashboard for **Industrial Gas Regulating & Metering Stations (RMS)**. It monitors high-pressure transmission inlet/outlet pressures, pipeline temperature dynamics (Joule-Thomson cooling & methane hydrate freeze guard), filter strainer differential pressure, and regulator valve vibration anomalies under ISO 10816-3 standards.

---

## 🚀 Key Features

1. **SCADA Transmission Telemetry Overview**:
   - Multi-station selector supporting **St. Clair North City Gate (RMS-01)**, **Bayview Petrochem Terminal (RMS-02)**, and **Highland CCGT Peaking Power RMS (RMS-03)**.
   - Real-time pressure monitoring ($P_{in}$ vs $P_{out}$) with Maximum Allowable Operating Pressure (MAOP) and Over-Pressure Slam-Shut (OPSO) safety proximity tracking.
   - Dual-unit toggle: **Metric** (Bar, °C, Sm³/h, mm/s) $\leftrightarrow$ **Imperial** (PSI, °F, MMSCFD, in/s).

2. **Interactive P&ID (Piping and Instrumentation Diagram) Flow Schematic**:
   - ANSI/ISA-5.1 compliant SVG synoptic mimic of the gas reduction process.
   - Real-time animated gas particle flow lines whose speed corresponds to measured pipeline velocity.
   - Animated **Emergency Slam-Shut Valve (SSV-101)** with armed/tripped neon indicator.
   - **Dual Basket Cartridge Filter (FLT-101)** with live differential pressure badge ($\Delta P$).
   - **Indirect Water Bath Gas Pre-Heater (HE-101)** with firetube burner status.
   - **Dual Redundant Regulating Runs**: Stream A (Duty) with pilot regulator PCV-101 and Stream B (Standby) with PCV-102.
   - Click-to-inspect sensor bubbles (**PIT-101, PDT-101, TIT-101, VIT-101, FIT-101, PIT-102**) with instant diagnostic telemetry drawer.

3. **Regulator Valve Vibration & Acoustic Spectrum Analyzer**:
   - Tri-axial vibration monitoring ($V_x, V_y, V_z$ in mm/s RMS) with vector summation $V_{overall}$.
   - **ISO 10816-3 Mechanical Severity Standard** visual gauge:
     - **Zone A** ($<2.3$ mm/s): Rigid, pristine condition (Good)
     - **Zone B** ($2.3 - 4.5$ mm/s): Unrestricted operation (Satisfactory)
     - **Zone C** ($4.5 - 7.1$ mm/s): Long-term fatigue damage (Alert)
     - **Zone D** ($>7.1$ mm/s): Immediate trip danger / Severe Cavitation & Trim Flutter
   - 32-band real-time FFT frequency spectrum bar visualizer with cursor inspection (10 Hz to 1000 Hz).
   - Real-time statistical indicators: Peak acceleration ($g$), Kurtosis, and Crest Factor.
   - Predictive diagnostic advisory box explaining trim wear index and cavitation risks.

4. **Thermodynamics & Joule-Thomson Freeze Guard**:
   - Real-time Joule-Thomson cooling calculation: $\Delta T_{JT} = \mu_{JT} \times (P_{in} - P_{out})$ where $\mu_{JT} \approx 0.48^\circ\text{C/bar}$.
   - Water bath heat reserve monitoring to offset rapid expansion temperature drop.
   - **Methane Clathrate Hydrate Formation Risk Meter**: Calculates thermodynamic hydrate stability curve ($T_h \approx 8.9 \ln P - 16.5$) and alerts operators before ice crystals plug pilot orifices.

5. **High-Speed Multi-Channel Telemetry Oscilloscope**:
   - Dual-channel scrolling strip chart tracking $P_{in}$ (Amber) and $P_{out}$ (Cyan) over 30s, 60s, or 90s time windows.
   - Guideline overlays: OPSO Trip Limit, Target Setpoint, and UPSO Shutoff Limit.
   - Pause / Resume freeze-frame toggle with crosshair cursor readout.

6. **Operator Control Console & Diagnostic Fault Simulator**:
   - Regulated outlet pressure setpoint calibration slider with safe interlock limits.
   - Hot stream switchover (Stream A $\leftrightarrow$ Stream B) with zero supply interruption.
   - Manual Emergency Slam-Shut Valve (SSV-101 / ESD) trip with double-confirmation safety logic and reset protocol.
   - **Fault Injection Playground**:
     - ⚡ *Trim Cavitation & Flutter* (Forces vibration into Zone D at 480 Hz resonance)
     - ❄️ *Preheater Burner Flameout* (Drops bath temperature, triggering hydrate freeze hazard)
     - 🛢️ *Strainer Differential Surge* (Simulates particulate clogging $>1.0$ Bar DP)
     - 📈 *Pipeline Inflow Surge* (Tests OPSO slam-shut limits)
     - 🟢 *Restore Nominal Steady-State Operation*

7. **SCADA Alarm Annunciator & Reporting**:
   - Real-time alarm table with severity LEDs (CRITICAL, WARNING, INFO).
   - Operator digital acknowledgment modal with signature sign-off and custom audit notes.
   - One-click export to **CSV log** and **JSON diagnostic report**.
   - Built-in Web Audio API synthesizer for acoustic SCADA alarm chimes (with mute/unmute control).

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Icons**: Lucide React
- **Audio**: Web Audio API (Synthesized SCADA alert chimes without external audio dependencies)
- **Backend**: Node.js + Express + Server-Sent Events (SSE)
- **Data Persistence**: Structured JSON store with atomic file journaling (`./data/rms_telemetry_store.json`)
- **Resilience**: Hybrid dual-engine client service — automatically connects to the backend live stream (1 Hz SSE), and gracefully falls back to local client-side physics simulation if standalone.

---

## 📂 Project Directory Structure

```text
├── data/
│   └── rms_telemetry_store.json   # Persistent SCADA alarms, station profiles, audit logs
├── server/
│   ├── db.ts                      # Database service with file-backed JSON persistence
│   ├── telemetryEngine.ts         # Physics-based gas dynamics, JT cooling & ISO 10816 vibration simulation
│   └── index.ts                   # Express server with REST API & SSE live streaming
├── src/
│   ├── components/
│   │   ├── ControlConsoleModal.tsx       # Operator calibration, stream switchover & fault injector
│   │   ├── Header.tsx                    # SCADA header, station selector, ESD indicator & sound toggle
│   │   ├── KPISection.tsx                # 4 core metric cards (Inlet, Outlet, Filter DP, Temperature)
│   │   ├── PIDSynopticSchematic.tsx      # ANSI/ISA-5.1 SVG animated P&ID schematic with sensor inspection
│   │   ├── SCADAAlarmCenter.tsx          # Real-time alarm table, acknowledgment modal & CSV/JSON export
│   │   ├── StationOverviewBanner.tsx     # Station ratings, MAOP, flow throughput & run stream status
│   │   ├── TelemetryOscilloscope.tsx     # Multi-channel scrolling oscilloscope with threshold guides
│   │   ├── ThermalThermodynamicsWidget.tsx # Joule-Thomson cooling & methane hydrate freeze guard
│   │   └── VibrationHealthAnalyzer.tsx   # Tri-axial vibration, ISO 10816 meter & 32-band FFT spectrum
│   ├── services/
│   │   ├── api.ts                        # Unified API client with SSE subscription & client fallback
│   │   └── audioAlerts.ts                # Web Audio API sound synthesizer for SCADA chimes
│   ├── types/
│   │   └── telemetry.ts                  # TypeScript definitions for stations, telemetry, alarms & controls
│   ├── utils/
│   │   └── units.ts                      # Unit conversions (Metric Bar/°C vs Imperial PSI/°F)
│   ├── App.tsx                           # Main application layout and real-time state orchestration
│   ├── index.css                         # SCADA dark theme, glowing pipe conduits & flow animations
│   └── main.tsx                          # React entrypoint
├── index.html                            # SEO tags, viewport configuration, and fonts
├── package.json                          # Dependencies and NPM scripts
├── tsconfig.json                         # TypeScript configuration
└── vite.config.ts                        # Vite configuration with Tailwind CSS v4 & backend proxy
```

---

## ⚡ Quick Start & Run Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Full-Stack Application (Backend + Frontend concurrently)
```bash
npm run dev
```

This starts:
- **Backend SCADA Telemetry Server** on `http://localhost:3001`
- **Frontend Dashboard** on `http://localhost:5173` with automatic API proxying

Open your browser at:
👉 **[http://localhost:5173/](http://localhost:5173/)**

### 3. Alternative Independent Commands
- Run backend only:
  ```bash
  npm run dev:server
  ```
- Run frontend only:
  ```bash
  npm run dev:client
  ```
- Build production bundle:
  ```bash
  npm run build
  ```
- Preview production build:
  ```bash
  npm run preview
  ```

---

## 🛡️ Industrial Standards Compliance
- **ISO 10816-3**: Mechanical vibration evaluation of industrial machines.
- **ANSI / ISA-5.1**: Instrumentation symbols and identification in P&ID drawings.
- **ASME B31.8**: Gas Transmission and Distribution Piping Systems.
- **AGA Report No. 9**: Measurement of Gas by Multipath Ultrasonic Meters.
