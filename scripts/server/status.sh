#!/bin/bash

# Connect Platform - Check Server Status
# This script checks the status of all services on the production server
# Version: 1.0.0
# Last updated: October 11, 2025

set -e  # Exit on any error

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# ============================================
# Main Script
# ============================================

echo "=========================================="
echo "Connect - Server Status"
echo "=========================================="
echo ""

# Check SSH connection
if ! check_ssh_connection; then
    error_exit "Cannot connect to ${SSH_HOST}. Please run setup-ssh.sh first."
fi

# ============================================
# Check Next.js
# ============================================

echo -n "Next.js (port ${PORT_NEXTJS}): "
if ssh "$SSH_HOST" "lsof -Pi :${PORT_NEXTJS} -sTCP:LISTEN -t >/dev/null 2>&1"; then
    PID=$(ssh "$SSH_HOST" "lsof -Pi :${PORT_NEXTJS} -sTCP:LISTEN -t 2>/dev/null" || echo "unknown")
    success_msg "RUNNING (PID: $PID)"

    # Check if it's PM2
    if ssh "$SSH_HOST" "pm2 describe ${SERVICE_NEXTJS} >/dev/null 2>&1"; then
        PM2_STATUS=$(ssh "$SSH_HOST" "pm2 describe ${SERVICE_NEXTJS}" | grep -E 'status|uptime|cpu|memory' | head -4 | sed 's/^/  /')
        echo "$PM2_STATUS"
    fi
else
    echo -e "${RED}STOPPED${NC}"
fi

echo ""

# ============================================
# Check Nginx
# ============================================

echo -n "Nginx (ports ${PORT_NGINX_HTTP}/${PORT_NGINX_HTTPS}): "
if ssh "$SSH_HOST" "systemctl is-active --quiet nginx 2>/dev/null"; then
    success_msg "RUNNING"

    # Check if listening on expected ports
    HTTP_OK=$(ssh "$SSH_HOST" "lsof -Pi :${PORT_NGINX_HTTP} -sTCP:LISTEN -t >/dev/null 2>&1" && echo "yes" || echo "no")
    HTTPS_OK=$(ssh "$SSH_HOST" "lsof -Pi :${PORT_NGINX_HTTPS} -sTCP:LISTEN -t >/dev/null 2>&1" && echo "yes" || echo "no")

    if [[ "$HTTP_OK" == "yes" && "$HTTPS_OK" == "yes" ]]; then
        echo -e "  ${GREEN}✓${NC} HTTP (80) and HTTPS (443) listening"
    else
        echo -e "  ${YELLOW}⚠${NC} HTTP: $HTTP_OK, HTTPS: $HTTPS_OK"
    fi
else
    echo -e "${RED}STOPPED${NC}"
fi

echo ""

# ============================================
# Check PostgreSQL
# ============================================

echo -n "PostgreSQL (port ${PORT_POSTGRES}): "
if ssh "$SSH_HOST" "lsof -Pi :${PORT_POSTGRES} -sTCP:LISTEN -t >/dev/null 2>&1"; then
    success_msg "RUNNING"

    # Check version
    PG_VERSION=$(ssh "$SSH_HOST" "psql --version 2>/dev/null | awk '{print \$3}'" || echo "unknown")
    echo "  Version: $PG_VERSION"
else
    echo -e "${YELLOW}STOPPED or not installed${NC}"
fi

echo ""

# ============================================
# Check Redis Cache
# ============================================

echo -n "Redis Cache (port ${PORT_REDIS_CACHE}): "
if ssh "$SSH_HOST" "lsof -Pi :${PORT_REDIS_CACHE} -sTCP:LISTEN -t >/dev/null 2>&1"; then
    success_msg "RUNNING"

    # Check memory usage
    REDIS_MEM=$(ssh "$SSH_HOST" "redis-cli -p ${PORT_REDIS_CACHE} INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r'" || echo "unknown")
    if [[ "$REDIS_MEM" != "unknown" ]]; then
        echo "  Memory: $REDIS_MEM"
    fi
else
    echo -e "${YELLOW}STOPPED or not installed${NC}"
fi

echo ""

# ============================================
# Check Redis Queue
# ============================================

echo -n "Redis Queue (port ${PORT_REDIS_QUEUE}): "
if ssh "$SSH_HOST" "lsof -Pi :${PORT_REDIS_QUEUE} -sTCP:LISTEN -t >/dev/null 2>&1"; then
    success_msg "RUNNING"

    # Check memory usage
    REDIS_MEM=$(ssh "$SSH_HOST" "redis-cli -p ${PORT_REDIS_QUEUE} INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r'" || echo "unknown")
    if [[ "$REDIS_MEM" != "unknown" ]]; then
        echo "  Memory: $REDIS_MEM"
    fi
else
    echo -e "${YELLOW}STOPPED or not installed${NC}"
fi

echo ""

# ============================================
# Check SSL Certificate
# ============================================

echo -n "SSL Certificate (Certbot): "
if ssh "$SSH_HOST" "systemctl is-active --quiet ${SERVICE_CERTBOT} 2>/dev/null"; then
    success_msg "Auto-renewal enabled"

    # Check certificate expiry
    CERT_EXPIRY=$(ssh "$SSH_HOST" "sudo certbot certificates 2>/dev/null | grep 'Expiry Date' | head -1 | cut -d: -f2- | xargs" || echo "unknown")
    if [[ "$CERT_EXPIRY" != "unknown" ]]; then
        echo "  Expiry: $CERT_EXPIRY"
    fi
else
    echo -e "${YELLOW}Not configured${NC}"
fi

echo ""

# ============================================
# System Resources
# ============================================

echo "System Resources:"
echo "----------------------------------------"

# CPU usage
CPU_USAGE=$(ssh "$SSH_HOST" "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - \$1}'" || echo "unknown")
echo -n "CPU Usage: "
if [[ "$CPU_USAGE" != "unknown" ]]; then
    CPU_INT=$(echo "$CPU_USAGE" | cut -d. -f1)
    if [[ "$CPU_INT" -lt 70 ]]; then
        echo -e "${GREEN}${CPU_USAGE}%${NC}"
    elif [[ "$CPU_INT" -lt 85 ]]; then
        echo -e "${YELLOW}${CPU_USAGE}%${NC}"
    else
        echo -e "${RED}${CPU_USAGE}%${NC}"
    fi
else
    echo "unknown"
fi

# Memory usage
MEM_USAGE=$(ssh "$SSH_HOST" "free -m | awk 'NR==2{printf \"%.0f%%\", \$3*100/\$2}'" || echo "unknown")
echo -n "Memory Usage: "
if [[ "$MEM_USAGE" != "unknown" ]]; then
    MEM_INT=$(echo "$MEM_USAGE" | sed 's/%//')
    if [[ "$MEM_INT" -lt 70 ]]; then
        echo -e "${GREEN}${MEM_USAGE}${NC}"
    elif [[ "$MEM_INT" -lt 85 ]]; then
        echo -e "${YELLOW}${MEM_USAGE}${NC}"
    else
        echo -e "${RED}${MEM_USAGE}${NC}"
    fi
else
    echo "unknown"
fi

# Disk usage
DISK_USAGE=$(ssh "$SSH_HOST" "df -h ${REMOTE_PROJECT_PATH} | awk 'NR==2{print \$5}'" || echo "unknown")
echo -n "Disk Usage (${REMOTE_PROJECT_PATH}): "
if [[ "$DISK_USAGE" != "unknown" ]]; then
    DISK_INT=$(echo "$DISK_USAGE" | sed 's/%//')
    if [[ "$DISK_INT" -lt 70 ]]; then
        echo -e "${GREEN}${DISK_USAGE}${NC}"
    elif [[ "$DISK_INT" -lt 85 ]]; then
        echo -e "${YELLOW}${DISK_USAGE}${NC}"
    else
        echo -e "${RED}${DISK_USAGE}${NC}"
    fi
else
    echo "unknown"
fi

# Uptime
UPTIME=$(ssh "$SSH_HOST" "uptime -p" || echo "unknown")
echo "Uptime: $UPTIME"

echo ""
echo "=========================================="
echo "Use './scripts/server/logs.sh <service>' to view logs"
echo "Use './scripts/server/restart-nextjs.sh' to restart Next.js"
echo "=========================================="
echo ""
