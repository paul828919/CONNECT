#!/bin/bash
# ============================================
# Connect Platform - Health Monitoring
# Run every 5 minutes via cron: */5 * * * * /path/to/health-monitor.sh
# ============================================

set -euo pipefail

# Configuration
ALERT_EMAIL="${ALERT_EMAIL:-admin@connect.kr}"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEM=85
ALERT_THRESHOLD_DISK=80
LOG_FILE="./logs/health/health_$(date +%Y%m%d).log"

# Ensure log directory exists
mkdir -p ./logs/health

# Check system resources
check_system_resources() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}' | awk '{print int($1)}')
    local mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

    echo "SYSTEM_RESOURCES|CPU:${cpu_usage}%|MEM:${mem_usage}%|DISK:${disk_usage}%"

    # Check thresholds
    if [ "$cpu_usage" -gt "$ALERT_THRESHOLD_CPU" ]; then
        send_alert "High CPU usage: ${cpu_usage}%"
    fi

    if [ "$mem_usage" -gt "$ALERT_THRESHOLD_MEM" ]; then
        send_alert "High memory usage: ${mem_usage}%"
    fi

    if [ "$disk_usage" -gt "$ALERT_THRESHOLD_DISK" ]; then
        send_alert "High disk usage: ${disk_usage}%"
    fi
}

# Check Docker containers
check_docker_health() {
    local unhealthy=$(docker ps --filter health=unhealthy --format "{{.Names}}" | wc -l)
    local stopped=$(docker ps -a --filter status=exited --filter name=connect_ --format "{{.Names}}" | wc -l)

    echo "DOCKER_HEALTH|UNHEALTHY:${unhealthy}|STOPPED:${stopped}"

    if [ "$unhealthy" -gt 0 ]; then
        local unhealthy_containers=$(docker ps --filter health=unhealthy --format "{{.Names}}" | tr '\n' ',')
        send_alert "Unhealthy containers: ${unhealthy_containers}"
    fi

    if [ "$stopped" -gt 0 ]; then
        local stopped_containers=$(docker ps -a --filter status=exited --filter name=connect_ --format "{{.Names}}" | tr '\n' ',')
        send_alert "Stopped containers: ${stopped_containers}"
    fi
}

# Check application endpoints
check_application() {
    local app1_status="UP"
    local app2_status="UP"
    local nginx_status="UP"

    if ! docker exec connect_app1 wget --quiet --tries=1 --spider http://localhost:3001/api/health 2>/dev/null; then
        app1_status="DOWN"
        send_alert "App1 health check failed"
    fi

    if ! docker exec connect_app2 wget --quiet --tries=1 --spider http://localhost:3002/api/health 2>/dev/null; then
        app2_status="DOWN"
        send_alert "App2 health check failed"
    fi

    if ! docker exec connect_nginx wget --quiet --tries=1 --spider http://localhost/health 2>/dev/null; then
        nginx_status="DOWN"
        send_alert "Nginx health check failed"
    fi

    echo "APPLICATION|APP1:${app1_status}|APP2:${app2_status}|NGINX:${nginx_status}"
}

# Check database
check_database() {
    local db_connections=$(docker exec connect_postgres psql -U connect -d connect -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs || echo "ERROR")
    local db_size=$(docker exec connect_postgres psql -U connect -d connect -t -c "SELECT pg_size_pretty(pg_database_size('connect'));" 2>/dev/null | xargs || echo "ERROR")

    echo "DATABASE|CONNECTIONS:${db_connections}|SIZE:${db_size}"

    if [ "$db_connections" = "ERROR" ]; then
        send_alert "Cannot connect to PostgreSQL"
    fi
}

# Check Redis
check_redis() {
    local cache_mem=$(docker exec connect_redis_cache redis-cli INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "ERROR")
    local queue_mem=$(docker exec connect_redis_queue redis-cli INFO memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r' || echo "ERROR")

    echo "REDIS|CACHE:${cache_mem}|QUEUE:${queue_mem}"

    if [ "$cache_mem" = "ERROR" ]; then
        send_alert "Cannot connect to Redis cache"
    fi

    if [ "$queue_mem" = "ERROR" ]; then
        send_alert "Cannot connect to Redis queue"
    fi
}

# Send alert (placeholder - implement actual alerting)
send_alert() {
    local message="$1"
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')

    echo "ALERT|${timestamp}|${message}" | tee -a "${LOG_FILE}"

    # TODO: Implement actual alerting (email, Slack, etc.)
    # Example: echo "$message" | mail -s "Connect Platform Alert" "$ALERT_EMAIL"
}

# Main monitoring loop
main() {
    local timestamp=$(date +'%Y-%m-%d %H:%M:%S')

    {
        echo "TIMESTAMP|${timestamp}"
        check_system_resources
        check_docker_health
        check_application
        check_database
        check_redis
        echo "---"
    } >> "${LOG_FILE}"
}

main "$@"