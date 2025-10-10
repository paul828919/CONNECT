#!/bin/bash
# Simple Load Test Script for Failover Testing
# Connect Platform - Week 2 Day 12-13
# Tests PostgreSQL write availability during automated failover

set -e

WRITE_HOST="127.0.0.1"
WRITE_PORT="5500"
READ_HOST="127.0.0.1"
READ_PORT="5501"
DB_NAME="postgres"
DB_USER="postgres"
DURATION=180  # 3 minutes total test duration
INTERVAL=1    # Insert every 1 second

echo "=========================================="
echo "FAILOVER LOAD TEST - Database Operations"
echo "=========================================="
echo "Start Time: $(date)"
echo "Duration: ${DURATION} seconds"
echo "Write Port: ${WRITE_PORT} (HAProxy → Primary)"
echo "Read Port: ${READ_PORT} (HAProxy → Load Balanced)"
echo ""

# Create test table
echo "1. Creating test table..."
/opt/homebrew/opt/postgresql@15/bin/psql -h $WRITE_HOST -p $WRITE_PORT -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS loadtest_failover_simple (
  id SERIAL PRIMARY KEY,
  test_time TIMESTAMP DEFAULT NOW(),
  message TEXT,
  write_successful BOOLEAN DEFAULT TRUE
);
" 2>&1

echo "✅ Test table created"
echo ""

# Clear old data
/opt/homebrew/opt/postgresql@15/bin/psql -h $WRITE_HOST -p $WRITE_PORT -U $DB_USER -d $DB_NAME -c "
DELETE FROM loadtest_failover_simple;
" 2>&1 > /dev/null

echo "2. Starting load test (${DURATION} seconds)..."
echo "   - Insert 1 row every ${INTERVAL} second(s)"
echo "   - Track write success/failure"
echo "   - ** TRIGGER FAILOVER MANUALLY during this test **"
echo ""

# Track metrics
SUCCESS_COUNT=0
FAILURE_COUNT=0
TOTAL_ATTEMPTS=0
START_TIME=$(date +%s)

# Run load test loop
for i in $(seq 1 $DURATION); do
  CURRENT_TIME=$(date +%s)
  ELAPSED=$((CURRENT_TIME - START_TIME))

  # Attempt write operation
  TOTAL_ATTEMPTS=$((TOTAL_ATTEMPTS + 1))

  if /opt/homebrew/opt/postgresql@15/bin/psql -h $WRITE_HOST -p $WRITE_PORT -U $DB_USER -d $DB_NAME -c "
    INSERT INTO loadtest_failover_simple (message)
    VALUES ('Test at ${ELAPSED}s - Iteration ${i}');
  " 2>&1 > /dev/null; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "$(date +%T) [${i}/${DURATION}] ✅ Write SUCCESS | Total: ${SUCCESS_COUNT} success, ${FAILURE_COUNT} failures"
  else
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
    echo "$(date +%T) [${i}/${DURATION}] ❌ Write FAILED  | Total: ${SUCCESS_COUNT} success, ${FAILURE_COUNT} failures"
  fi

  # Sleep for interval (unless last iteration)
  if [ $i -lt $DURATION ]; then
    sleep $INTERVAL
  fi
done

END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
echo "LOAD TEST COMPLETE"
echo "=========================================="
echo "End Time: $(date)"
echo ""

# Calculate metrics
SUCCESS_RATE=$(echo "scale=2; $SUCCESS_COUNT * 100 / $TOTAL_ATTEMPTS" | bc)
FAILURE_RATE=$(echo "scale=2; $FAILURE_COUNT * 100 / $TOTAL_ATTEMPTS" | bc)

echo "📊 METRICS:"
echo "   Total Duration: ${TOTAL_DURATION} seconds"
echo "   Total Attempts: ${TOTAL_ATTEMPTS}"
echo "   Successful Writes: ${SUCCESS_COUNT} (${SUCCESS_RATE}%)"
echo "   Failed Writes: ${FAILURE_COUNT} (${FAILURE_RATE}%)"
echo ""

# Verify data integrity
echo "3. Verifying data integrity..."
FINAL_COUNT=$(/opt/homebrew/opt/postgresql@15/bin/psql -t -h $WRITE_HOST -p $WRITE_PORT -U $DB_USER -d $DB_NAME -c "
SELECT COUNT(*) FROM loadtest_failover_simple;
" | tr -d ' ')

echo "   Expected writes: ${SUCCESS_COUNT}"
echo "   Actual rows in DB: ${FINAL_COUNT}"

if [ "$FINAL_COUNT" -eq "$SUCCESS_COUNT" ]; then
  echo "   ✅ Data integrity verified!"
else
  echo "   ⚠️  Data count mismatch (expected: ${SUCCESS_COUNT}, actual: ${FINAL_COUNT})"
fi

echo ""

# Success criteria check
if [ "$FAILURE_COUNT" -eq 0 ]; then
  echo "🎯 SUCCESS: Zero failures detected!"
  echo "   This means failover was seamless (<2s as tested before)"
elif (( $(echo "$FAILURE_RATE <= 5" | bc -l) )); then
  echo "✅ PASS: Failure rate ${FAILURE_RATE}% is within <5% threshold"
  echo "   Failover likely occurred during test window"
else
  echo "❌ FAIL: Failure rate ${FAILURE_RATE}% exceeds 5% threshold"
  echo "   Investigation needed"
fi

echo ""
echo "=========================================="
echo "Test data available in: loadtest_failover_simple table"
echo "To inspect: psql -h 127.0.0.1 -p 5500 -U postgres -d postgres"
echo "To cleanup: DROP TABLE loadtest_failover_simple;"
echo "=========================================="
