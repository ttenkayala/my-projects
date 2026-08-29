#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Starting Turo Integrator POC"

# 1. Start middleware
echo "--> Starting middleware on port 3001..."
cd "$SCRIPT_DIR/middleware"
npm start &
MIDDLEWARE_PID=$!
echo "    Middleware PID: $MIDDLEWARE_PID"

# 2. Install Grafana JSON plugin if not present
echo "--> Checking Grafana plugins..."
grafana cli plugins install marcusolsson-json-datasource 2>/dev/null || true

# 3. Start Grafana
echo "--> Starting Grafana..."
brew services start grafana

echo ""
echo "======================================"
echo "  Turo Integrator is running!"
echo "  Middleware:  http://localhost:3001"
echo "  Grafana:     http://localhost:3000  (admin/admin)"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop middleware (Grafana runs as a service)"

trap "kill $MIDDLEWARE_PID 2>/dev/null; brew services stop grafana" EXIT
wait $MIDDLEWARE_PID
