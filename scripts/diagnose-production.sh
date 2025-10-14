#!/bin/bash
# ============================================
# Production System Diagnostics
# Comprehensive troubleshooting script
# ============================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
REMOTE_SERVER="${CONNECT_REMOTE_SERVER:-connect-prod}"
SERVER_PASSWORD="${CONNECT_SERVER_PASSWORD:-}"

# SSH wrapper - supports both SSH keys and password
ssh_exec() {
    if [ -n "$SERVER_PASSWORD" ]; then
        sshpass -p "$SERVER_PASSWORD" ssh "$REMOTE_SERVER" "$@" 2>/dev/null || true
    else
        # Use SSH key (via config alias or direct connection)
        ssh "$REMOTE_SERVER" "$@" 2>/dev/null || true
    fi
}

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║     🔍 PRODUCTION SYSTEM DIAGNOSTIC REPORT 🔍           ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. CHECK APPLICATION LOGS
# ============================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 1. APPLICATION LOGS (Last 20 lines)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}App1 Recent Logs:${NC}"
ssh_exec "docker logs connect_app1 --tail 20 2>&1" || echo "Failed to fetch app1 logs"

echo -e "\n${YELLOW}App2 Recent Logs:${NC}"
ssh_exec "docker logs connect_app2 --tail 20 2>&1" || echo "Failed to fetch app2 logs"

# ============================================
# 2. VERIFY HEALTH ENDPOINT
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🏥 2. HEALTH ENDPOINT TESTING${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Testing app1 on port 3001:${NC}"
app1_health=$(ssh_exec "docker exec connect_app1 curl -s http://localhost:3001/api/health 2>&1" || echo "FAILED")
echo "$app1_health"

echo -e "\n${YELLOW}Testing app2 on port 3002:${NC}"
app2_health=$(ssh_exec "docker exec connect_app2 curl -s http://localhost:3002/api/health 2>&1" || echo "FAILED")
echo "$app2_health"

echo -e "\n${YELLOW}Testing public endpoint (HTTPS):${NC}"
public_health=$(ssh_exec "curl -sk https://221.164.102.253/api/health 2>&1" || echo "FAILED")
echo "$public_health"

# ============================================
# 3. TEST REDIS CONNECTIVITY
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔴 3. REDIS CONNECTIVITY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Redis Cache (port 6379):${NC}"
redis_cache=$(ssh_exec "docker exec connect_redis_cache redis-cli ping 2>&1" || echo "FAILED")
echo "Response: $redis_cache"

echo -e "\n${YELLOW}Redis Queue (port 6380):${NC}"
redis_queue=$(ssh_exec "docker exec connect_redis_queue redis-cli ping 2>&1" || echo "FAILED")
echo "Response: $redis_queue"

echo -e "\n${YELLOW}Test Redis from app1:${NC}"
redis_from_app1=$(ssh_exec "docker exec connect_app1 sh -c 'apk add --no-cache redis 2>/dev/null && redis-cli -h redis-cache ping' 2>&1" || echo "FAILED")
echo "Response: $redis_from_app1"

# ============================================
# 4. CHECK PORT BINDINGS
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔌 4. PORT BINDINGS & NETWORK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Container port mappings:${NC}"
ssh_exec "docker ps --format 'table {{.Names}}\t{{.Ports}}' | grep connect"

echo -e "\n${YELLOW}Listening ports on host:${NC}"
ssh_exec "netstat -tulpn | grep -E ':(3001|3002|3100|5432|6379|443|80)' 2>/dev/null || ss -tulpn | grep -E ':(3001|3002|3100|5432|6379|443|80)'"

echo -e "\n${YELLOW}Docker network inspect:${NC}"
ssh_exec "docker network inspect connect_net | jq -r '.[] | .Containers | to_entries[] | \"\\(.value.Name): \\(.value.IPv4Address)\"' 2>/dev/null || docker network inspect connect_net | grep -A2 Name"

# ============================================
# 5. CHECK ENVIRONMENT VARIABLES
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔧 5. ENVIRONMENT CONFIGURATION${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}App1 environment (sanitized):${NC}"
ssh_exec "docker exec connect_app1 env | grep -E '^(PORT|INSTANCE_ID|NODE_ENV|DATABASE_URL|REDIS_)' | sed 's/=.*@/=***@/g; s/password=[^&]*/password=***/g'"

echo -e "\n${YELLOW}App2 environment (sanitized):${NC}"
ssh_exec "docker exec connect_app2 env | grep -E '^(PORT|INSTANCE_ID|NODE_ENV|DATABASE_URL|REDIS_)' | sed 's/=.*@/=***@/g; s/password=[^&]*/password=***/g'"

# ============================================
# 6. CHECK NGINX/REVERSE PROXY
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 6. REVERSE PROXY STATUS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Nginx/HAProxy containers:${NC}"
ssh_exec "docker ps | grep -iE 'nginx|haproxy|caddy|traefik' || echo 'No reverse proxy container found'"

echo -e "\n${YELLOW}SSL Certificate status:${NC}"
ssh_exec "echo | openssl s_client -connect 221.164.102.253:443 -servername 221.164.102.253 2>/dev/null | openssl x509 -noout -subject -dates 2>/dev/null || echo 'SSL check failed'"

# ============================================
# 7. DATABASE CONNECTIVITY
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}💾 7. DATABASE CONNECTIVITY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}PostgreSQL status:${NC}"
ssh_exec "docker exec connect_postgres pg_isready -U connect"

echo -e "\n${YELLOW}Test DB connection from app1:${NC}"
ssh_exec "docker exec connect_app1 sh -c 'timeout 5 sh -c \"</dev/tcp/postgres/5432\" 2>&1 && echo \"Connection OK\" || echo \"Connection FAILED\"'"

# ============================================
# 8. PROCESS CHECK INSIDE CONTAINERS
# ============================================
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⚙️  8. PROCESS STATUS INSIDE CONTAINERS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}App1 processes:${NC}"
ssh_exec "docker exec connect_app1 ps aux | head -n 10"

echo -e "\n${YELLOW}App2 processes:${NC}"
ssh_exec "docker exec connect_app2 ps aux | head -n 10"

# ============================================
# SUMMARY
# ============================================
echo -e "\n${CYAN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}║                  📊 DIAGNOSTIC SUMMARY                   ║${NC}"
echo -e "${CYAN}║                                                          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Review application logs above for errors"
echo "  2. Verify health endpoints are returning correct responses"
echo "  3. Check if Redis connections are working from apps"
echo "  4. Ensure reverse proxy is correctly routing traffic"
echo ""
echo -e "${BLUE}💡 Tip: Run this script again after making fixes to verify${NC}"
echo ""

