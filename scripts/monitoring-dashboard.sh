#!/bin/bash
# Real-time PostgreSQL HA Monitoring Dashboard
# Connect Platform - Week 1 Day 6-7
# Press Ctrl+C to exit

# PostgreSQL binary path for macOS Homebrew
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
PRIMARY_PORT=5432
STANDBY_PORT=5433
PGBOUNCER_PORT=6432
DB_NAME="connect"
DB_USER="connect"
REFRESH_INTERVAL=5

# Function to get PostgreSQL connection count
get_pg_connections() {
  local port=$1
  psql -p $port -d $DB_NAME -t -c "
    SELECT count(*) FROM pg_stat_activity WHERE datname = '$DB_NAME';
  " 2>/dev/null | tr -d ' ' || echo "N/A"
}

# Function to get replication lag
get_replication_lag() {
  psql -p $PRIMARY_PORT -d $DB_NAME -t -c "
    SELECT COALESCE(replay_lag::text, 'N/A')
    FROM pg_stat_replication
    LIMIT 1;
  " 2>/dev/null | tr -d ' ' || echo "N/A"
}

# Function to get replication lag in bytes
get_replication_lag_bytes() {
  psql -p $PRIMARY_PORT -d $DB_NAME -t -c "
    SELECT COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::text, '0')
    FROM pg_stat_replication
    LIMIT 1;
  " 2>/dev/null | tr -d ' ' || echo "0"
}

# Function to check if server is standby
is_standby() {
  local port=$1
  local result=$(psql -p $port -d $DB_NAME -t -c "SELECT pg_is_in_recovery();" 2>/dev/null | tr -d ' ')
  echo "$result"
}

# Function to get PgBouncer stats
get_pgbouncer_stats() {
  # Note: PgBouncer admin console requires special setup
  # For now, we'll check if the process is running
  if pgrep -f "pgbouncer" > /dev/null; then
    echo "Running"
  else
    echo "Stopped"
  fi
}

# Function to get PgBouncer active connections (from logs)
get_pgbouncer_connections() {
  # Count PostgreSQL connections from PgBouncer
  psql -p $PRIMARY_PORT -d $DB_NAME -t -c "
    SELECT count(*)
    FROM pg_stat_activity
    WHERE application_name LIKE '%pgbouncer%';
  " 2>/dev/null | tr -d ' ' || echo "N/A"
}

# Main monitoring loop
while true; do
  clear

  # Header
  echo -e "${CYAN}=========================================="
  echo -e "CONNECT PLATFORM - HA MONITORING DASHBOARD"
  echo -e "==========================================${NC}"
  echo -e "Timestamp: ${BLUE}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e ""

  # PostgreSQL Primary Server
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}PRIMARY SERVER${NC} (localhost:$PRIMARY_PORT)"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  PRIMARY_CONNECTIONS=$(get_pg_connections $PRIMARY_PORT)
  PRIMARY_IS_STANDBY=$(is_standby $PRIMARY_PORT)

  if [ "$PRIMARY_IS_STANDBY" == "f" ]; then
    echo -e "  ${GREEN}●${NC} Status: ${GREEN}PRIMARY (Read-Write)${NC}"
  else
    echo -e "  ${RED}●${NC} Status: ${RED}UNEXPECTED STANDBY STATE!${NC}"
  fi

  echo -e "  Connections: ${YELLOW}$PRIMARY_CONNECTIONS${NC}"

  # Max connections
  MAX_CONN=$(psql -p $PRIMARY_PORT -d $DB_NAME -t -c "SHOW max_connections;" 2>/dev/null | tr -d ' ')
  if [ ! -z "$MAX_CONN" ]; then
    echo -e "  Max Connections: ${CYAN}$MAX_CONN${NC}"
  fi

  echo ""

  # PostgreSQL Standby Server
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}STANDBY SERVER${NC} (localhost:$STANDBY_PORT)"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  STANDBY_CONNECTIONS=$(get_pg_connections $STANDBY_PORT)
  STANDBY_IS_STANDBY=$(is_standby $STANDBY_PORT)

  if [ "$STANDBY_IS_STANDBY" == "t" ]; then
    echo -e "  ${BLUE}●${NC} Status: ${BLUE}STANDBY (Read-Only)${NC}"
  else
    echo -e "  ${RED}●${NC} Status: ${RED}UNEXPECTED PRIMARY STATE!${NC}"
  fi

  echo -e "  Connections: ${YELLOW}$STANDBY_CONNECTIONS${NC}"

  echo ""

  # Replication Status
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}STREAMING REPLICATION${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  REPLICATION_LAG=$(get_replication_lag)
  REPLICATION_LAG_BYTES=$(get_replication_lag_bytes)

  # Check if replication is active
  REPLICATION_STATE=$(psql -p $PRIMARY_PORT -d $DB_NAME -t -c "
    SELECT COALESCE(state, 'N/A')
    FROM pg_stat_replication
    LIMIT 1;
  " 2>/dev/null | tr -d ' ')

  if [ "$REPLICATION_STATE" == "streaming" ]; then
    echo -e "  ${GREEN}●${NC} State: ${GREEN}$REPLICATION_STATE${NC}"
  elif [ "$REPLICATION_STATE" == "N/A" ]; then
    echo -e "  ${RED}●${NC} State: ${RED}NOT CONNECTED${NC}"
  else
    echo -e "  ${YELLOW}●${NC} State: ${YELLOW}$REPLICATION_STATE${NC}"
  fi

  # Format lag display
  if [ "$REPLICATION_LAG_BYTES" == "0" ] || [ "$REPLICATION_LAG_BYTES" == "N/A" ] || [ -z "$REPLICATION_LAG_BYTES" ]; then
    echo -e "  Lag: ${GREEN}0 bytes (No lag)${NC}"
  elif [ "$REPLICATION_LAG_BYTES" -gt 0 ] 2>/dev/null && [ "$REPLICATION_LAG_BYTES" -lt 10485760 ]; then
    # Less than 10MB - good
    LAG_MB=$(awk "BEGIN {printf \"%.2f\", $REPLICATION_LAG_BYTES / 1024 / 1024}")
    echo -e "  Lag: ${GREEN}${REPLICATION_LAG_BYTES} bytes (${LAG_MB} MB)${NC}"
  elif [ "$REPLICATION_LAG_BYTES" -gt 0 ] 2>/dev/null; then
    # More than 10MB - warning
    LAG_MB=$(awk "BEGIN {printf \"%.2f\", $REPLICATION_LAG_BYTES / 1024 / 1024}")
    echo -e "  Lag: ${RED}${REPLICATION_LAG_BYTES} bytes (${LAG_MB} MB) ⚠️${NC}"
  fi

  # Time-based lag
  if [ "$REPLICATION_LAG" != "N/A" ]; then
    echo -e "  Time Lag: ${CYAN}$REPLICATION_LAG${NC}"
  fi

  echo ""

  # PgBouncer Connection Pooling
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${CYAN}PGBOUNCER CONNECTION POOLING${NC} (port $PGBOUNCER_PORT)"
  echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  PGBOUNCER_STATUS=$(get_pgbouncer_stats)
  PGBOUNCER_CONNECTIONS=$(get_pgbouncer_connections)

  if [ "$PGBOUNCER_STATUS" == "Running" ]; then
    echo -e "  ${GREEN}●${NC} Status: ${GREEN}Running${NC}"
  else
    echo -e "  ${RED}●${NC} Status: ${RED}Stopped${NC}"
  fi

  echo -e "  Server Connections: ${YELLOW}$PGBOUNCER_CONNECTIONS${NC}"

  # Test PgBouncer connectivity
  if psql -h localhost -p $PGBOUNCER_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "  Connectivity: ${GREEN}✓ Connected${NC}"
  else
    echo -e "  Connectivity: ${RED}✗ Connection Failed${NC}"
  fi

  # Show PID if running
  PGBOUNCER_PID=$(pgrep -f "pgbouncer" | head -1)
  if [ ! -z "$PGBOUNCER_PID" ]; then
    echo -e "  PID: ${CYAN}$PGBOUNCER_PID${NC}"
  fi

  echo ""

  # System Summary
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}SYSTEM SUMMARY${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

  # Calculate total connections
  TOTAL_CONNECTIONS=$(($PRIMARY_CONNECTIONS + $STANDBY_CONNECTIONS))
  echo -e "  Total PostgreSQL Connections: ${YELLOW}$TOTAL_CONNECTIONS${NC}"

  # Health status
  HEALTH_STATUS="${GREEN}✓ ALL SYSTEMS OPERATIONAL${NC}"

  if [ "$REPLICATION_STATE" != "streaming" ]; then
    HEALTH_STATUS="${RED}✗ REPLICATION DISCONNECTED${NC}"
  elif [ "$PGBOUNCER_STATUS" != "Running" ]; then
    HEALTH_STATUS="${YELLOW}⚠ PGBOUNCER STOPPED${NC}"
  elif [ "$REPLICATION_LAG_BYTES" -gt 10485760 ]; then
    HEALTH_STATUS="${YELLOW}⚠ HIGH REPLICATION LAG${NC}"
  fi

  echo -e "  Health Status: $HEALTH_STATUS"

  echo ""

  # Footer
  echo -e "${CYAN}==========================================${NC}"
  echo -e "${CYAN}Press Ctrl+C to exit | Refresh: ${REFRESH_INTERVAL} seconds${NC}"
  echo -e "${CYAN}==========================================${NC}"

  sleep $REFRESH_INTERVAL
done
