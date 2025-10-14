#!/bin/bash
# ============================================
# Connect Platform - Quick Health Check
# Server: 221.164.102.253
# Run anytime: ./scripts/check-health.sh
# ============================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
REMOTE_SERVER="${CONNECT_REMOTE_SERVER:-connect-prod}"
SERVER_PASSWORD="${CONNECT_SERVER_PASSWORD:-}"

# SSH wrapper - supports both SSH keys and password
ssh_exec() {
    if [ -n "$SERVER_PASSWORD" ]; then
        sshpass -p "$SERVER_PASSWORD" ssh "$REMOTE_SERVER" "$@" 2>/dev/null
    else
        # Use SSH key (via config alias or direct connection)
        ssh "$REMOTE_SERVER" "$@" 2>/dev/null
    fi
}

# Status icons
OK="✅"
WARN="⚠️ "
FAIL="❌"

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}║         🏥 Connect Platform Health Check         ║${NC}"
echo -e "${BLUE}║                                                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check containers
echo -e "${GREEN}📦 Container Status:${NC}"
containers=$(ssh_exec "docker ps --format '{{.Names}}\t{{.Status}}' | grep connect")

while IFS=$'\t' read -r name status; do
    if echo "$status" | grep -q "Up"; then
        if echo "$status" | grep -q "healthy"; then
            echo "  ${OK} ${name}: ${status}"
        else
            echo "  ${WARN} ${name}: ${status}"
        fi
    else
        echo "  ${FAIL} ${name}: ${status}"
    fi
done <<< "$containers"

echo ""

# Check application health
echo -e "${GREEN}🌐 Application Health:${NC}"

app1_health=$(ssh_exec "docker exec connect_app1 curl -sf http://172.25.0.21:3001/api/health" || echo "FAIL")
if echo "$app1_health" | grep -q "\"status\":\"ok\""; then
    echo "  ${OK} app1: Healthy"
else
    echo "  ${FAIL} app1: Unhealthy or not responding"
fi

app2_health=$(ssh_exec "docker exec connect_app2 curl -sf http://172.25.0.22:3002/api/health" || echo "FAIL")
if echo "$app2_health" | grep -q "\"status\":\"ok\""; then
    echo "  ${OK} app2: Healthy"
else
    echo "  ${FAIL} app2: Unhealthy or not responding"
fi

public_health=$(ssh_exec "curl -skf https://221.164.102.253/api/health" || echo "FAIL")
if echo "$public_health" | grep -q "\"status\":\"ok\""; then
    echo "  ${OK} Public endpoint: Healthy"
else
    echo "  ${FAIL} Public endpoint: Unhealthy or not responding"
fi

echo ""

# Check database
echo -e "${GREEN}💾 Database Status:${NC}"

db_status=$(ssh_exec "docker exec connect_postgres pg_isready -U connect" || echo "FAIL")
if echo "$db_status" | grep -q "accepting connections"; then
    echo "  ${OK} PostgreSQL: Accepting connections"
    
    # Get connection count
    conn_count=$(ssh_exec "docker exec connect_postgres psql -U connect -d connect -t -c 'SELECT count(*) FROM pg_stat_activity;'" | xargs)
    echo "  ${OK} Active connections: ${conn_count}"
    
    # Get database size
    db_size=$(ssh_exec "docker exec connect_postgres psql -U connect -d connect -t -c \"SELECT pg_size_pretty(pg_database_size('connect'));\"" | xargs)
    echo "  ${OK} Database size: ${db_size}"
else
    echo "  ${FAIL} PostgreSQL: Not responding"
fi

echo ""

# Check Redis
echo -e "${GREEN}🔴 Redis Status:${NC}"

redis_cache_status=$(ssh_exec "docker exec connect_redis_cache redis-cli ping" || echo "FAIL")
redis_queue_status=$(ssh_exec "docker exec connect_redis_queue redis-cli ping" || echo "FAIL")

if [ "$redis_cache_status" = "PONG" ]; then
    echo "  ${OK} Redis Cache: Responding"
    redis_cache_mem=$(ssh_exec "docker exec connect_redis_cache redis-cli INFO memory | grep used_memory_human | cut -d: -f2" | tr -d '\r')
    echo "  ${OK} Cache memory: ${redis_cache_mem}"
else
    echo "  ${FAIL} Redis Cache: Not responding"
fi

if [ "$redis_queue_status" = "PONG" ]; then
    echo "  ${OK} Redis Queue: Responding"
    redis_queue_mem=$(ssh_exec "docker exec connect_redis_queue redis-cli INFO memory | grep used_memory_human | cut -d: -f2" | tr -d '\r')
    echo "  ${OK} Queue memory: ${redis_queue_mem}"
else
    echo "  ${FAIL} Redis Queue: Not responding"
fi

echo ""

# Check system resources
echo -e "${GREEN}💻 System Resources:${NC}"

cpu_usage=$(ssh_exec "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | awk -F'%' '{print \$1}'")
mem_usage=$(ssh_exec "free | grep Mem | awk '{printf(\"%.0f\", \$3/\$2 * 100.0)}'")
disk_usage=$(ssh_exec "df / | tail -1 | awk '{print \$5}' | sed 's/%//'")

if [ "${cpu_usage%.*}" -lt 70 ]; then
    echo "  ${OK} CPU usage: ${cpu_usage}%"
else
    echo "  ${WARN} CPU usage: ${cpu_usage}% (high)"
fi

if [ "$mem_usage" -lt 80 ]; then
    echo "  ${OK} Memory usage: ${mem_usage}%"
else
    echo "  ${WARN} Memory usage: ${mem_usage}% (high)"
fi

if [ "$disk_usage" -lt 80 ]; then
    echo "  ${OK} Disk usage: ${disk_usage}%"
else
    echo "  ${WARN} Disk usage: ${disk_usage}% (high)"
fi

echo ""

# Check recent errors
echo -e "${GREEN}📋 Recent Errors (last 5 minutes):${NC}"

app1_errors=$(ssh_exec "docker logs connect_app1 --since 5m 2>&1 | grep -i error | wc -l")
app2_errors=$(ssh_exec "docker logs connect_app2 --since 5m 2>&1 | grep -i error | wc -l")

if [ "$app1_errors" -eq 0 ]; then
    echo "  ${OK} app1: No errors"
else
    echo "  ${WARN} app1: ${app1_errors} errors found"
fi

if [ "$app2_errors" -eq 0 ]; then
    echo "  ${OK} app2: No errors"
else
    echo "  ${WARN} app2: ${app2_errors} errors found"
fi

echo ""

# Traffic distribution (if HAProxy exists)
haproxy_running=$(ssh_exec "docker ps | grep haproxy" || echo "")
if [ -n "$haproxy_running" ]; then
    echo -e "${GREEN}🔀 Traffic Distribution:${NC}"
    
    haproxy_config=$(ssh_exec "docker exec haproxy cat /etc/haproxy/haproxy.cfg | grep 'server app'")
    
    if echo "$haproxy_config" | grep -q "app1.*backup"; then
        echo "  ${OK} Primary: app2 (GREEN)"
        echo "  ${OK} Backup: app1 (BLUE)"
    elif echo "$haproxy_config" | grep -q "app2.*backup"; then
        echo "  ${OK} Primary: app1 (BLUE)"
        echo "  ${OK} Backup: app2 (GREEN)"
    else
        echo "  ${OK} Balanced: Both containers active"
    fi
    
    echo ""
fi

# Overall status
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"

# Determine overall health
overall_healthy=true

if echo "$app1_health" | grep -q "FAIL"; then overall_healthy=false; fi
if echo "$app2_health" | grep -q "FAIL"; then overall_healthy=false; fi
if echo "$db_status" | grep -q "FAIL"; then overall_healthy=false; fi
if [ "$redis_cache_status" != "PONG" ]; then overall_healthy=false; fi
if [ "$redis_queue_status" != "PONG" ]; then overall_healthy=false; fi

if [ "$overall_healthy" = true ]; then
    echo -e "${BLUE}║${NC}                                                    ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}      ${GREEN}✅ ALL SYSTEMS OPERATIONAL ✅${NC}              ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}                                                    ${BLUE}║${NC}"
else
    echo -e "${BLUE}║${NC}                                                    ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}      ${RED}⚠️  ISSUES DETECTED ⚠️${NC}                     ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}                                                    ${BLUE}║${NC}"
fi

echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}🔗 Quick Links:${NC}"
echo "  • Grafana: http://221.164.102.253:3100"
echo "  • Health API: https://221.164.102.253/api/health"
echo "  • View Logs: ssh ${REMOTE_SERVER} 'docker logs -f connect_app1'"
echo ""

