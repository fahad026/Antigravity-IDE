#!/usr/bin/env bash

# ==============================================================================
# GasRMS-Telemetry-Monitor: Local Server Runner
# Gas Transmission Telemetry & Pipeline Health Dashboard
# ==============================================================================

set -e

echo "=========================================================="
echo "⚡ Starting GasRMS-Telemetry-Monitor SCADA Server"
echo "=========================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js (v18+ recommended)."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm."
    exit 1
fi

echo "✔ Node.js $(node -v) detected"
echo "✔ npm $(npm -v) detected"

# Install dependencies if node_modules does not exist
if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
else
    echo "✔ Dependencies already installed"
fi

echo ""
echo "🚀 Launching Full-Stack Services (Backend API + Frontend Dashboard)..."
echo "   - Backend SCADA Core : http://localhost:3001"
echo "   - Frontend Dashboard  : http://localhost:5173"
echo ""
echo "Press Ctrl+C at any time to gracefully stop all services."
echo "=========================================================="
echo ""

# Run both backend and frontend concurrently
npm run dev
