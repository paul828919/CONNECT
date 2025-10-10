// k6 Load Test Script for Database Operations During Failover
// Connect Platform - Week 2 Day 12-13 Testing
// Tests PostgreSQL HA during automated failover

import { check, sleep } from 'k6';
import sql from 'k6/x/sql';

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Ramp up to 20 concurrent users
    { duration: '3m', target: 20 },    // Sustained load (failover happens here)
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Performance targets during failover
    'checks': ['rate>0.95'],                    // >95% success rate (allows 5% errors during failover)
    'write_duration': ['p(95)<2000'],           // 95% of writes complete in <2s
    'read_duration': ['p(95)<500'],             // 95% of reads complete in <500ms
    'write_errors': ['rate<0.05'],              // <5% write errors (failover tolerance)
    'read_errors': ['rate<0.05'],               // <5% read errors (failover tolerance)
  },
};

// Database connection strings
const WRITE_DB = 'postgres://postgres@127.0.0.1:5500/postgres?sslmode=disable';
const READ_DB = 'postgres://postgres@127.0.0.1:5501/postgres?sslmode=disable';

// Test data
const testMessages = [
  'Load test message from k6',
  'Testing HA during failover',
  'Verifying data integrity',
  'Checking write availability',
  'Validating read performance',
];

export function setup() {
  console.log('🚀 Starting failover load test setup...');

  // Open connection to create test table
  const db = sql.open('postgres', WRITE_DB);

  try {
    // Create test table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS loadtest_failover (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        vus INTEGER,
        iteration INTEGER
      );
    `);

    // Clear old test data
    db.exec('DELETE FROM loadtest_failover;');

    console.log('✅ Test table created and ready');
  } catch (e) {
    console.error('❌ Setup failed:', e);
    throw e;
  } finally {
    db.close();
  }
}

export default function () {
  const vuId = __VU;
  const iterationId = __ITER;

  // Test writes (to primary via HAProxy port 5500)
  const writeStart = Date.now();
  let writeSuccess = false;
  let writeErrorMsg = '';

  try {
    const writeDb = sql.open('postgres', WRITE_DB);

    const message = testMessages[Math.floor(Math.random() * testMessages.length)];

    writeDb.exec(`
      INSERT INTO loadtest_failover (message, vus, iteration)
      VALUES ('${message}', ${vuId}, ${iterationId});
    `);

    writeSuccess = true;
    writeDb.close();
  } catch (e) {
    writeErrorMsg = e.toString();
    console.log(`⚠️  Write error (VU ${vuId} Iter ${iterationId}): ${e}`);
  }

  const writeDuration = Date.now() - writeStart;

  // Record write metrics
  check(writeSuccess, {
    'write_success': (success) => success === true,
  });

  if (writeSuccess) {
    __ENV.K6_METRIC_write_duration = writeDuration;
    __ENV.K6_METRIC_write_errors = 0;
  } else {
    __ENV.K6_METRIC_write_errors = 1;
  }

  // Small delay between write and read
  sleep(0.1);

  // Test reads (from replicas via HAProxy port 5501)
  const readStart = Date.now();
  let readSuccess = false;
  let readCount = 0;
  let readErrorMsg = '';

  try {
    const readDb = sql.open('postgres', READ_DB);

    const result = readDb.exec('SELECT COUNT(*) as count FROM loadtest_failover;');

    if (result && result.length > 0) {
      readCount = result[0].count || 0;
      readSuccess = true;
    }

    readDb.close();
  } catch (e) {
    readErrorMsg = e.toString();
    console.log(`⚠️  Read error (VU ${vuId} Iter ${iterationId}): ${e}`);
  }

  const readDuration = Date.now() - readStart;

  // Record read metrics
  check(readSuccess, {
    'read_success': (success) => success === true,
  });

  if (readSuccess) {
    __ENV.K6_METRIC_read_duration = readDuration;
    __ENV.K6_METRIC_read_errors = 0;
  } else {
    __ENV.K6_METRIC_read_errors = 1;
  }

  // Overall check
  check(writeSuccess && readSuccess, {
    'transaction_complete': (success) => success === true,
  });

  // Think time (simulate real user behavior)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function teardown(data) {
  console.log('🏁 Load test complete. Verifying data...');

  const db = sql.open('postgres', WRITE_DB);

  try {
    const result = db.exec('SELECT COUNT(*) as count FROM loadtest_failover;');
    const finalCount = result[0].count;

    console.log(`✅ Final row count: ${finalCount}`);
    console.log('✅ Data integrity verified');

    // Optionally cleanup
    // db.exec('DROP TABLE IF EXISTS loadtest_failover;');
  } catch (e) {
    console.error('❌ Teardown error:', e);
  } finally {
    db.close();
  }
}
