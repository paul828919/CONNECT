#!/bin/bash
# Replication Lag Monitoring Script
# Connect Platform - PostgreSQL HA
#
# This script monitors PostgreSQL streaming replication health
# and alerts when lag exceeds defined thresholds.

# PostgreSQL binary path
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"

PRIMARY_HOST="localhost"
PRIMARY_PORT="5432"
STANDBY_PORT="5433"
DB_NAME="connect"
ALERT_THRESHOLD_BYTES=10485760  # 10MB
ALERT_THRESHOLD_SECONDS=5

echo "========================================"
echo "PostgreSQL Replication Status"
echo "========================================"
echo "Timestamp: $(date)"
echo ""

# Check replication status on primary
echo "Primary Server Replication Status:"
psql -h $PRIMARY_HOST -p $PRIMARY_PORT -d $DB_NAME -c "
SELECT
  application_name,
  state,
  sync_state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS pending_bytes,
  pg_wal_lsn_diff(pg_current_wal_lsn(), write_lsn) AS write_lag_bytes,
  pg_wal_lsn_diff(pg_current_wal_lsn(), flush_lsn) AS flush_lag_bytes,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS replay_lag_bytes,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication;
"

echo ""
echo "Standby Server Status:"
psql -p $STANDBY_PORT -d $DB_NAME -c "
SELECT
  pg_is_in_recovery() AS is_standby,
  pg_last_wal_receive_lsn() AS receive_lsn,
  pg_last_wal_replay_lsn() AS replay_lsn,
  pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS replay_lag_bytes;
"

# Alert if lag exceeds threshold
LAG_BYTES=$(psql -t -h $PRIMARY_HOST -p $PRIMARY_PORT -d $DB_NAME -c "
SELECT COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn), 0)
FROM pg_stat_replication
LIMIT 1;
" | tr -d ' ')

# Default to 0 if empty
LAG_BYTES=${LAG_BYTES:-0}

if [ "$LAG_BYTES" -gt "$ALERT_THRESHOLD_BYTES" ]; then
  echo ""
  echo "⚠️  ALERT: Replication lag exceeds threshold!"
  echo "   Current lag: $LAG_BYTES bytes ($(($LAG_BYTES / 1024 / 1024)) MB)"
  echo "   Threshold: $ALERT_THRESHOLD_BYTES bytes ($(($ALERT_THRESHOLD_BYTES / 1024 / 1024)) MB)"
else
  echo ""
  echo "✅ Replication lag: $LAG_BYTES bytes (within threshold)"
fi

echo "========================================"
