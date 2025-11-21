#!/bin/bash
# ============================================
# Test Health Endpoint Response Format
# Shows what the new health check will return
# ============================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║         📊 NEW HEALTH ENDPOINT RESPONSE FORMAT          ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}After deploying the fix, your health endpoint will return:${NC}"
echo ""

echo -e "${GREEN}Example Response (All Services Healthy):${NC}"
cat << 'EOF'
{
  "status": "ok",
  "timestamp": "2025-10-14T10:30:00.000Z",
  "service": "Connect Platform",
  "version": "1.0.0",
  "instance": "app1",
  "uptime": 46847.23,
  "latency": 45,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 23
    },
    "redis_cache": {
      "status": "healthy",
      "latency": 12
    },
    "redis_queue": {
      "status": "healthy",
      "latency": 8
    }
  }
}
EOF

echo ""
echo -e "${GREEN}Example Response (Degraded - Redis Cache Issue):${NC}"
cat << 'EOF'
{
  "status": "degraded",
  "timestamp": "2025-10-14T10:35:00.000Z",
  "service": "Connect Platform",
  "version": "1.0.0",
  "instance": "app1",
  "uptime": 47147.89,
  "latency": 1234,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 25
    },
    "redis_cache": {
      "status": "unhealthy",
      "error": "Connection timeout"
    },
    "redis_queue": {
      "status": "healthy",
      "latency": 9
    }
  }
}
EOF

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Key Features:${NC}"
echo "  ✅ Individual service status (database, redis_cache, redis_queue)"
echo "  ✅ Latency measurements in milliseconds"
echo "  ✅ Process uptime in seconds"
echo "  ✅ Detailed error messages when services fail"
echo "  ✅ Overall status: 'ok', 'degraded', or 'error'"
echo "  ✅ HTTP status codes: 200 (ok), 503 (degraded/error)"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}How the Health Check Script Uses This:${NC}"
echo ""
echo '  1. Curls: http://localhost:3001/api/health (app1)'
echo '  2. Checks for: "status":"ok" in response'
echo '  3. If found: ✅ app1: Healthy'
echo '  4. If not found: ❌ app1: Unhealthy'
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Test Commands (after deployment):${NC}"
echo ""
echo '  # Test app1 (pretty printed)'
echo '  curl -k https://59.21.170.6/api/health | jq'
echo ""
echo '  # Test from inside container'
echo '  ssh user@59.21.170.6 "docker exec connect_app1 curl http://localhost:3001/api/health" | jq'
echo ""
echo '  # Run full health check'
echo '  ./scripts/check-health.sh'
echo ""

echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║        🚀 Ready to deploy? Run:                         ║${NC}"
echo -e "${CYAN}║        ./scripts/deploy-health-fix.sh                   ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

