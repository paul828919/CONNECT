#!/bin/bash
# Automated Failover Trigger Script
# Connect Platform - Week 2 Day 12-13
# Triggers failover by stopping current Leader

set -e

export PATH="/Users/paulkim/Library/Python/3.9/bin:/opt/homebrew/opt/postgresql@15/bin:$PATH"

echo "=========================================="
echo "FAILOVER TRIGGER SCRIPT"
echo "=========================================="
echo "Timestamp: $(date)"
echo ""

# Step 1: Identify current Leader
echo "1. Identifying current Leader..."
LEADER_INFO=$(patronictl -c /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml list | grep Leader)

if echo "$LEADER_INFO" | grep -q "postgresql1"; then
  LEADER_NAME="postgresql1"
  LEADER_PORT="5432"
  LEADER_CONFIG="/Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml"
elif echo "$LEADER_INFO" | grep -q "postgresql2"; then
  LEADER_NAME="postgresql2"
  LEADER_PORT="5433"
  LEADER_CONFIG="/Users/paulkim/Downloads/connect/config/patroni/patroni-standby.yml"
else
  echo "❌ ERROR: Could not identify Leader"
  exit 1
fi

echo "   Current Leader: ${LEADER_NAME} (port ${LEADER_PORT})"
echo ""

# Step 2: Show cluster status before failover
echo "2. Cluster status BEFORE failover:"
patronictl -c /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml list
echo ""

# Step 3: Trigger failover by stopping Leader
echo "3. Triggering failover by stopping ${LEADER_NAME}..."
START_TIME=$(date +%s)

# Stop Patroni process (will gracefully stop PostgreSQL)
pkill -f "patroni.*${LEADER_NAME}"

echo "   ⏳ Leader stopped at $(date +%T)"
echo "   ⏳ Waiting for automatic failover..."
echo ""

# Step 4: Wait for new Leader election (max 60 seconds)
echo "4. Monitoring Leader election..."
NEW_LEADER=""
FAILOVER_COMPLETE=false

for i in {1..60}; do
  sleep 1

  # Check if new Leader exists
  if patronictl -c /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml list 2>/dev/null | grep -q "Leader"; then
    NEW_LEADER_INFO=$(patronictl -c /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml list | grep Leader)

    if echo "$NEW_LEADER_INFO" | grep -q "postgresql1"; then
      NEW_LEADER="postgresql1"
    elif echo "$NEW_LEADER_INFO" | grep -q "postgresql2"; then
      NEW_LEADER="postgresql2"
    fi

    # Verify new Leader is different from old Leader
    if [ "$NEW_LEADER" != "$LEADER_NAME" ] && [ -n "$NEW_LEADER" ]; then
      END_TIME=$(date +%s)
      FAILOVER_DURATION=$((END_TIME - START_TIME))
      FAILOVER_COMPLETE=true
      break
    fi
  fi

  echo -n "."
done

echo ""
echo ""

# Step 5: Report results
if [ "$FAILOVER_COMPLETE" = true ]; then
  echo "✅ FAILOVER COMPLETE!"
  echo "   Old Leader: ${LEADER_NAME}"
  echo "   New Leader: ${NEW_LEADER}"
  echo "   Failover Duration: ${FAILOVER_DURATION} seconds"
  echo ""

  if [ $FAILOVER_DURATION -le 30 ]; then
    echo "   ✅ SUCCESS: Failover within 30-second target"
  else
    echo "   ⚠️  WARNING: Failover exceeded 30-second target"
  fi
else
  echo "❌ FAILOVER FAILED or TIMED OUT"
  echo "   No new Leader elected within 60 seconds"
  exit 1
fi

echo ""

# Step 6: Show final cluster status
echo "5. Cluster status AFTER failover:"
patronictl -c /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml list
echo ""

# Step 7: Verify new Leader is accepting writes
echo "6. Verifying new Leader accepts writes..."
if /opt/homebrew/opt/postgresql@15/bin/psql -h 127.0.0.1 -p 5500 -U postgres -d postgres -c "
  SELECT pg_is_in_recovery();
" 2>&1 | grep -q "f"; then
  echo "   ✅ New Leader accepting writes through HAProxy"
else
  echo "   ❌ ERROR: New Leader not accepting writes"
  exit 1
fi

echo ""
echo "=========================================="
echo "FAILOVER TEST COMPLETE"
echo "Results:"
echo "  - Old Leader: ${LEADER_NAME}"
echo "  - New Leader: ${NEW_LEADER}"
echo "  - Duration: ${FAILOVER_DURATION} seconds"
echo "  - Target: <30 seconds"
echo "  - Status: $([ $FAILOVER_DURATION -le 30 ] && echo '✅ PASS' || echo '⚠️ SLOW')"
echo "=========================================="
