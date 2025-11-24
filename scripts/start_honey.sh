#!/bin/bash
# 🍯 Start all honey-making services

set -e

cd /workspaces/AUREON-QUANTUM-TRADING-SYSTEM-AQTS-

# Kill any existing processes
pkill -f "python.*lion_scan" 2>/dev/null || true
pkill -f "python.*metrics_watcher" 2>/dev/null || true
pkill -f "python.*autopilot" 2>/dev/null || true
sleep 2

# Set environment
export BINANCE_API_KEY="AYRlzXwKsAPgN40gfQ1D5tuDceNA2AUvz5fzTYUJkg0CUXnosDCqraF0lRT1zoor"
export BINANCE_API_SECRET="c8eINSLwLDdFKFQvyWLDaARBhoBbOiFEd9Qk2dCVSjn6cmuAWh20h2CzY4XoiVQY"
export BINANCE_TESTNET=false
export LION_SYMBOLS="BNBBTC,ETHBTC,BNBUSDT,ETHUSDT"
export CONFIRM_AUTOPILOT=YES
export AUTOPILOT_DAYS=1
export AUTOPILOT_SYMBOL="BNBBTC"
export AUTOPILOT_SYMBOLS="BNBBTC"
export LIGHTHOUSE_L_MIN=0.0
export LIGHTHOUSE_Q_MAX=1.0
export LIGHTHOUSE_G_MAX=1.0

# Create directories
mkdir -p logs metrics

# Start Lion Scan
python3 -u scripts/lion_scan.py > logs/lion_scan.out 2>&1 &
LION_PID=$!
echo $LION_PID > lion_scan.pid
echo "🦁 Lion scan started (PID: $LION_PID)"

# Start Lighthouse
python3 -u scripts/metrics_watcher.py > logs/metrics_watcher.out 2>&1 &
LIGHTHOUSE_PID=$!
echo $LIGHTHOUSE_PID > metrics/metrics_watcher.pid
echo "🔦 Lighthouse started (PID: $LIGHTHOUSE_PID)"

# Wait for metrics to initialize
sleep 3

# Start Autopilot
python3 -u scripts/autopilot.py > logs/autopilot.out 2>&1 &
AUTOPILOT_PID=$!
echo $AUTOPILOT_PID > autopilot.pid
echo "🍯 Autopilot started (PID: $AUTOPILOT_PID)"

echo ""
echo "✅ All services running!"
echo ""
echo "Monitor with:"
echo "  tail -f logs/autopilot.out"
echo ""
echo "Stop with:"
echo "  pkill -P $LION_PID; pkill -P $LIGHTHOUSE_PID; pkill -P $AUTOPILOT_PID"
