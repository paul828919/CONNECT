# Connect Platform: 12-Week Execution Plan (Master)
## January 1, 2026 Launch Target

**Start Date**: October 9, 2025
**Launch Date**: January 1, 2026
**Duration**: 12 weeks (84 days)
**Development Environment**: MacBook Pro M4 Max + Claude Code + Claude Desktop
**Project Root**: `/Users/paulkim/Downloads/connect`

---

## 📊 Current Status Snapshot

**What's Complete** ✅:
- Phase 1A: Infrastructure Foundation (Next.js, PostgreSQL, Prisma, OAuth, Encryption, Docker)
- Phase 2A: Enhanced Matching Algorithm with Korean NLP
- Phase 3A: Email Notification System
- Phase 3B: Advanced Keyword Matching & Taxonomy
- Phase 3C: Partner Discovery & Consortium Builder
- NTIS API: Integration code (awaiting production key Oct 14)
- Playwright Scraping: 4-agency infrastructure ready

**Critical Gaps** ❌:
- Hot Standby Infrastructure (Week 1-2 priority)
- AI Integration with Claude Sonnet 4.5 (Week 3-4 priority)
- Comprehensive Load Testing (Week 5)
- 4-Week Beta Testing Pipeline (Week 7-12)

---

## 🎯 Success Criteria (Launch Readiness)

**Technical Metrics**:
- ✅ Uptime: 99.9%+ during beta
- ✅ Failover: <30 seconds, zero data loss
- ✅ Load test: 10x traffic with <2s P95 response time
- ✅ AI explanation helpfulness: >70%
- ✅ Error rate: <0.1%
- ✅ Security: Zero critical vulnerabilities

**Business Metrics**:
- Week 1: 50+ user registrations
- Month 1: 200+ users, 150+ active
- Peak Season (Jan-Mar): 1,000+ users, ₩40-50M revenue

---

## 📅 12-Week Timeline Overview

| Week | Dates | Focus | Status | Risk |
|------|-------|-------|--------|------|
| 1-2 | Oct 9-22 | Hot Standby Infrastructure | 🔵 TODO | 🔴 CRITICAL |
| 3-4 | Oct 23-Nov 5 | AI Integration (Claude Sonnet 4.5) | 🔵 TODO | 🟡 HIGH |
| 5 | Nov 6-12 | Comprehensive Load Testing | 🔵 TODO | 🟡 HIGH |
| 6 | Nov 13-19 | Security Hardening & Bug Fixes | 🔵 TODO | 🟢 MEDIUM |
| 7 | Nov 20-26 | Beta Infrastructure + Internal Testing | 🔵 TODO | 🟢 MEDIUM |
| 8 | Nov 27-Dec 3 | Beta Week 1 (5-10 companies) | 🔵 TODO | 🟢 MEDIUM |
| 9 | Dec 4-10 | Beta Week 2 (20-30 companies) | 🔵 TODO | 🟢 MEDIUM |
| 10 | Dec 11-17 | Beta Week 3 + Code Freeze | 🔵 TODO | 🟢 MEDIUM |
| 11 | Dec 18-24 | Final Testing + Launch Prep | 🔵 TODO | 🟢 LOW |
| 12 | Dec 25-31 | Launch Week | 🔵 TODO | 🟢 LOW |

---

# WEEK 1: Hot Standby Infrastructure (Part 1)
## Dates: October 9-15, 2025

### 🎯 Week 1 Objectives
- Configure PostgreSQL streaming replication (primary → standby)
- Achieve <1 second replication lag
- Set up PgBouncer connection pooling optimization
- Establish monitoring infrastructure

### 📋 DAY 1 (Oct 9): PostgreSQL Primary Server Configuration

#### Task 1.1: Create Primary PostgreSQL Configuration
**Time**: 2 hours
**Priority**: 🔴 CRITICAL

**Files to Create**:
```bash
config/postgresql/primary.conf
```

**Content**:
```ini
# PostgreSQL Primary Server Configuration for Streaming Replication
# Connect Platform - Production HA Setup

# Connection Settings
listen_addresses = '*'
port = 5432
max_connections = 200

# Memory Settings (128GB RAM server)
shared_buffers = 32GB                    # 25% of RAM
effective_cache_size = 64GB              # 50% of RAM
work_mem = 128MB                         # For sorting/hashing
maintenance_work_mem = 2GB               # For VACUUM, CREATE INDEX

# WAL Settings (Write-Ahead Logging for Replication)
wal_level = replica                      # Enable replication
max_wal_senders = 10                     # Max replication connections
wal_keep_size = 1GB                      # Keep 1GB of WAL files
max_replication_slots = 10               # Replication slot limit

# Checkpoint Settings
checkpoint_timeout = 15min
checkpoint_completion_target = 0.9
max_wal_size = 4GB
min_wal_size = 1GB

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%m [%p] %u@%d '
log_min_duration_statement = 1000        # Log slow queries (>1s)
log_replication_commands = on

# Performance
random_page_cost = 1.1                   # SSD-optimized
effective_io_concurrency = 200           # SSD parallel I/O

# Replication
hot_standby = on                         # Allow reads on standby
hot_standby_feedback = on                # Prevent query conflicts
```

**Commands to Run**:
```bash
# 1. Backup existing PostgreSQL config
cp /opt/homebrew/var/postgresql@15/postgresql.conf /opt/homebrew/var/postgresql@15/postgresql.conf.backup

# 2. Create replication user
psql -d connect -c "CREATE ROLE replicator WITH REPLICATION PASSWORD 'CHANGE_ME_IN_PRODUCTION' LOGIN;"

# 3. Grant privileges
psql -d connect -c "GRANT CONNECT ON DATABASE connect TO replicator;"

# 4. Create replication slot
psql -d connect -c "SELECT * FROM pg_create_physical_replication_slot('standby_slot');"

# 5. Apply new configuration
cp config/postgresql/primary.conf /opt/homebrew/var/postgresql@15/postgresql.conf

# 6. Restart PostgreSQL
brew services restart postgresql@15

# 7. Verify configuration
psql -d connect -c "SHOW wal_level;"
psql -d connect -c "SELECT * FROM pg_replication_slots;"
```

**Success Criteria**:
- [ ] `wal_level` shows `replica`
- [ ] Replication user `replicator` exists
- [ ] Replication slot `standby_slot` created
- [ ] PostgreSQL restarts successfully
- [ ] No errors in logs: `tail -f /opt/homebrew/var/postgresql@15/log/postgresql-*.log`

---

#### Task 1.2: Configure pg_hba.conf for Replication
**Time**: 30 minutes
**Priority**: 🔴 CRITICAL

**Files to Modify**:
```bash
/opt/homebrew/var/postgresql@15/pg_hba.conf
```

**Add these lines**:
```conf
# Replication connections
host    replication     replicator      127.0.0.1/32            md5
host    replication     replicator      172.25.0.0/16           md5
host    replication     replicator      standby-server-ip/32    md5
```

**Commands to Run**:
```bash
# 1. Backup pg_hba.conf
cp /opt/homebrew/var/postgresql@15/pg_hba.conf /opt/homebrew/var/postgresql@15/pg_hba.conf.backup

# 2. Edit pg_hba.conf (add replication lines)
nano /opt/homebrew/var/postgresql@15/pg_hba.conf

# 3. Reload PostgreSQL
psql -d connect -c "SELECT pg_reload_conf();"

# 4. Verify replication connections allowed
psql -U replicator -d replication -h localhost -c "SELECT 1;"
# Should connect successfully
```

**Success Criteria**:
- [ ] Replication user can connect via `psql -U replicator`
- [ ] No authentication errors in logs

---

### 📋 DAY 2 (Oct 10): Standby Server Setup

#### Task 2.1: Prepare Standby Server Environment
**Time**: 1 hour
**Priority**: 🔴 CRITICAL

**For Testing** (local standby on different port):
```bash
# 1. Create standby data directory
mkdir -p /opt/homebrew/var/postgresql@15-standby

# 2. Stop standby if running
pg_ctl -D /opt/homebrew/var/postgresql@15-standby stop

# 3. Remove old data
rm -rf /opt/homebrew/var/postgresql@15-standby/*
```

**For Production** (separate server):
```bash
# On standby server:
# 1. Install PostgreSQL 15
brew install postgresql@15

# 2. Initialize (will be replaced by base backup)
initdb /opt/homebrew/var/postgresql@15-standby

# 3. Stop PostgreSQL
brew services stop postgresql@15
```

---

#### Task 2.2: Create Base Backup from Primary
**Time**: 1-2 hours (depends on database size)
**Priority**: 🔴 CRITICAL

**Commands**:
```bash
# On primary server (or local for testing):
pg_basebackup -h localhost -p 5432 -U replicator \
  -D /opt/homebrew/var/postgresql@15-standby \
  -Fp -Xs -P -R

# Parameters:
# -h: Primary server host
# -U: Replication user
# -D: Standby data directory
# -Fp: Plain format
# -Xs: Stream WAL during backup
# -P: Show progress
# -R: Create standby.signal and configure recovery
```

**Success Criteria**:
- [ ] Base backup completes without errors
- [ ] Standby directory contains data files
- [ ] `standby.signal` file exists in standby directory
- [ ] `postgresql.auto.conf` contains `primary_conninfo`

---

#### Task 2.3: Configure Standby Server
**Time**: 1 hour
**Priority**: 🔴 CRITICAL

**Files to Create**:
```bash
config/postgresql/standby.conf
```

**Content**:
```ini
# PostgreSQL Standby Server Configuration
# Connect Platform - Hot Standby for High Availability

# Port (different for local testing, same for production)
port = 5433                              # 5432 for production standby

# Connection Settings
listen_addresses = '*'
max_connections = 200

# Memory (same as primary)
shared_buffers = 32GB
effective_cache_size = 64GB
work_mem = 128MB
maintenance_work_mem = 2GB

# Hot Standby Settings
hot_standby = on                         # Allow read queries
hot_standby_feedback = on                # Prevent query conflicts
max_standby_streaming_delay = 30s        # Max lag before canceling queries

# Replication Settings
primary_conninfo = 'host=localhost port=5432 user=replicator password=CHANGE_ME application_name=standby1'
primary_slot_name = 'standby_slot'
promote_trigger_file = '/tmp/postgresql.trigger.5433'

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-standby-%Y-%m-%d_%H%M%S.log'
log_line_prefix = '%m [%p] STANDBY %u@%d '
log_min_duration_statement = 1000
```

**Commands**:
```bash
# 1. Copy standby config
cp config/postgresql/standby.conf /opt/homebrew/var/postgresql@15-standby/postgresql.conf

# 2. Start standby server
pg_ctl -D /opt/homebrew/var/postgresql@15-standby -l /opt/homebrew/var/postgresql@15-standby/log/standby.log start

# 3. Verify standby is running
psql -p 5433 -d connect -c "SELECT pg_is_in_recovery();"
# Should return 't' (true)

# 4. Check replication status on primary
psql -p 5432 -d connect -c "SELECT * FROM pg_stat_replication;"
# Should show standby connected
```

**Success Criteria**:
- [ ] Standby server starts successfully
- [ ] `pg_is_in_recovery()` returns `true` on standby
- [ ] Primary shows active replication connection in `pg_stat_replication`
- [ ] No errors in standby logs

---

### 📋 DAY 3 (Oct 11): Replication Monitoring & Validation

#### Task 3.1: Create Replication Lag Monitoring Script
**Time**: 1 hour
**Priority**: 🟡 HIGH

**Files to Create**:
```bash
scripts/check-replication-lag.sh
```

**Content**:
```bash
#!/bin/bash
# Replication Lag Monitoring Script
# Connect Platform - PostgreSQL HA

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
WHERE application_name = 'standby1';
" | tr -d ' ')

if [ "$LAG_BYTES" -gt "$ALERT_THRESHOLD_BYTES" ]; then
  echo ""
  echo "⚠️  ALERT: Replication lag exceeds threshold!"
  echo "   Current lag: $LAG_BYTES bytes ($(($LAG_BYTES / 1024 / 1024)) MB)"
  echo "   Threshold: $ALERT_THRESHOLD_BYTES bytes ($(($ALERT_THRESHOLD_BYTES / 1024 / 1024)) MB)"
fi

echo "========================================"
```

**Commands**:
```bash
# Make script executable
chmod +x scripts/check-replication-lag.sh

# Run monitoring script
./scripts/check-replication-lag.sh

# Set up cron job for continuous monitoring (every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * /Users/paulkim/Downloads/connect/scripts/check-replication-lag.sh >> /Users/paulkim/Downloads/connect/logs/replication-monitor.log 2>&1") | crontab -
```

**Success Criteria**:
- [ ] Script runs without errors
- [ ] Shows replication lag in bytes and seconds
- [ ] Lag is <10MB (ideally <1MB)
- [ ] Lag duration is <5 seconds (ideally <1 second)

---

#### Task 3.2: Test Replication with Data Changes
**Time**: 30 minutes
**Priority**: 🟡 HIGH

**Commands**:
```bash
# 1. Create test table on primary
psql -p 5432 -d connect -c "
CREATE TABLE replication_test (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW(),
  data TEXT
);
"

# 2. Insert test data on primary
psql -p 5432 -d connect -c "
INSERT INTO replication_test (data)
SELECT 'Test data ' || generate_series(1, 1000);
"

# 3. Wait 2 seconds
sleep 2

# 4. Verify data on standby
psql -p 5433 -d connect -c "SELECT COUNT(*) FROM replication_test;"
# Should show 1000 rows

# 5. Update data on primary
psql -p 5432 -d connect -c "UPDATE replication_test SET data = data || ' updated';"

# 6. Wait and verify on standby
sleep 2
psql -p 5433 -d connect -c "SELECT * FROM replication_test WHERE data LIKE '%updated%' LIMIT 5;"

# 7. Clean up
psql -p 5432 -d connect -c "DROP TABLE replication_test;"
```

**Success Criteria**:
- [ ] Inserts replicate to standby within 2 seconds
- [ ] Updates replicate to standby within 2 seconds
- [ ] Count matches between primary and standby
- [ ] No replication errors in logs

---

### 📋 DAY 4-5 (Oct 12-13): PgBouncer Connection Pooling

#### Task 4.1: Install and Configure PgBouncer
**Time**: 2 hours
**Priority**: 🟡 HIGH

**Installation**:
```bash
# Install PgBouncer
brew install pgbouncer

# Create config directory
mkdir -p /opt/homebrew/etc/pgbouncer
```

**Files to Create**:
```bash
config/pgbouncer/pgbouncer.ini
```

**Content**:
```ini
[databases]
connect = host=localhost port=5432 dbname=connect pool_size=25
connect_standby = host=localhost port=5433 dbname=connect pool_size=25

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /opt/homebrew/etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
server_idle_timeout = 600
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
```

**Create userlist.txt**:
```bash
# Generate password hash
echo -n "passwordconnect" | md5sum  # Use actual password

# Create userlist.txt
echo '"connect" "md5<hash_from_above>"' > /opt/homebrew/etc/pgbouncer/userlist.txt
```

**Start PgBouncer**:
```bash
# Start PgBouncer
pgbouncer -d /opt/homebrew/etc/pgbouncer/pgbouncer.ini

# Test connection through PgBouncer
psql -h localhost -p 6432 -U connect -d connect -c "SELECT 1;"

# Show PgBouncer stats
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

**Success Criteria**:
- [ ] PgBouncer starts successfully
- [ ] Can connect through PgBouncer (port 6432)
- [ ] `SHOW POOLS` shows active pools
- [ ] Connection pooling working (multiple clients use same server connection)

---

#### Task 4.2: Update Prisma Configuration for PgBouncer
**Time**: 30 minutes
**Priority**: 🟡 HIGH

**Files to Modify**:
```bash
.env
```

**Update**:
```env
# Old (direct connection)
# DATABASE_URL="postgresql://connect:password@localhost:5432/connect?schema=public"

# New (through PgBouncer)
DATABASE_URL="postgresql://connect:password@localhost:6432/connect?schema=public&pgbouncer=true&pool_timeout=30&connection_limit=50"
```

**Test**:
```bash
# Test Prisma connection
npx prisma db pull

# Test query
npx tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log('✅ Found', users.length, 'users');
  prisma.\$disconnect();
});
"
```

**Success Criteria**:
- [ ] Prisma connects through PgBouncer successfully
- [ ] Queries execute without errors
- [ ] Connection pooling reduces database load

---

### 📋 DAY 6-7 (Oct 14-15): Monitoring Dashboard & Week 1 Validation

#### Task 6.1: Create Monitoring Dashboard Script
**Time**: 2 hours
**Priority**: 🟢 MEDIUM

**Files to Create**:
```bash
scripts/monitoring-dashboard.sh
```

**Content**:
```bash
#!/bin/bash
# Real-time PostgreSQL HA Monitoring Dashboard
# Press Ctrl+C to exit

while true; do
  clear
  echo "=========================================="
  echo "CONNECT PLATFORM - HA MONITORING"
  echo "=========================================="
  echo "Timestamp: $(date)"
  echo ""

  # Primary server status
  echo "PRIMARY SERVER (localhost:5432)"
  echo "----------------------------------------"
  psql -p 5432 -d connect -t -c "
  SELECT
    'Connections: ' || count(*) || ' / ' || (SELECT setting FROM pg_settings WHERE name = 'max_connections')
  FROM pg_stat_activity;
  "

  # Standby server status
  echo ""
  echo "STANDBY SERVER (localhost:5433)"
  echo "----------------------------------------"
  echo "Status: $(psql -t -p 5433 -d connect -c "SELECT CASE WHEN pg_is_in_recovery() THEN 'STANDBY (Read-Only)' ELSE 'PRIMARY (Read-Write)' END;")"

  # Replication lag
  echo ""
  echo "REPLICATION STATUS"
  echo "----------------------------------------"
  psql -p 5432 -d connect -t -c "
  SELECT
    'Lag: ' || COALESCE(replay_lag::text, 'N/A') || ' | ' ||
    'Lag Bytes: ' || COALESCE(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::text, '0') || ' bytes'
  FROM pg_stat_replication
  WHERE application_name = 'standby1';
  "

  # PgBouncer pools
  echo ""
  echo "PGBOUNCER CONNECTION POOLS (port 6432)"
  echo "----------------------------------------"
  psql -h localhost -p 6432 -U pgbouncer pgbouncer -t -c "
  SELECT
    database || ': ' || cl_active || ' active / ' || cl_waiting || ' waiting / ' || sv_active || ' server'
  FROM pg_pools
  WHERE database != 'pgbouncer';
  "

  echo ""
  echo "=========================================="
  echo "Press Ctrl+C to exit | Refresh: 5 seconds"
  echo "=========================================="

  sleep 5
done
```

**Usage**:
```bash
chmod +x scripts/monitoring-dashboard.sh
./scripts/monitoring-dashboard.sh
```

---

#### Task 6.2: Week 1 Validation & Documentation
**Time**: 2 hours
**Priority**: 🔴 CRITICAL

**Validation Checklist**:
```bash
# 1. Primary server check
psql -p 5432 -d connect -c "SELECT version();"
psql -p 5432 -d connect -c "SHOW wal_level;"
psql -p 5432 -d connect -c "SELECT * FROM pg_replication_slots;"

# 2. Standby server check
psql -p 5433 -d connect -c "SELECT pg_is_in_recovery();"  # Must be 't'

# 3. Replication status
psql -p 5432 -d connect -c "SELECT * FROM pg_stat_replication;"

# 4. PgBouncer check
psql -h localhost -p 6432 -U connect -d connect -c "SELECT 1;"
psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"

# 5. Run full validation
./scripts/check-replication-lag.sh
```

**Create Week 1 Progress Report**:
```bash
docs/plans/progress/week01-complete.md
```

**Success Criteria** (Week 1 Complete):
- [ ] PostgreSQL streaming replication working
- [ ] Replication lag <1 second consistently
- [ ] Standby server can accept read queries
- [ ] PgBouncer connection pooling operational
- [ ] Monitoring scripts functional
- [ ] All validation tests passing

---

# WEEK 2: Hot Standby Infrastructure (Part 2)
## Dates: October 16-22, 2025

### 🎯 Week 2 Objectives
- Implement Patroni + etcd for automated failover
- Configure HAProxy for database load balancing
- Test failover scenarios (<30s RTO target)
- Update Prisma client for HA configuration
- Complete hot standby infrastructure

### 📋 DAY 8-9 (Oct 16-17): Patroni + etcd Setup

#### Task 8.1: Install etcd Cluster
**Time**: 2 hours
**Priority**: 🔴 CRITICAL

**Installation**:
```bash
# Install etcd
brew install etcd

# Create etcd data directory
mkdir -p /opt/homebrew/var/etcd
```

**Files to Create**:
```bash
config/etcd/etcd.conf.yaml
```

**Content**:
```yaml
# etcd Configuration for Patroni
name: 'etcd1'
data-dir: '/opt/homebrew/var/etcd/data'
listen-client-urls: 'http://localhost:2379'
advertise-client-urls: 'http://localhost:2379'
listen-peer-urls: 'http://localhost:2380'
initial-advertise-peer-urls: 'http://localhost:2380'
initial-cluster: 'etcd1=http://localhost:2380'
initial-cluster-state: 'new'
initial-cluster-token: 'connect-etcd-cluster'
```

**Start etcd**:
```bash
# Start etcd
etcd --config-file /Users/paulkim/Downloads/connect/config/etcd/etcd.conf.yaml &

# Verify etcd is running
etcdctl --endpoints=http://localhost:2379 member list
etcdctl --endpoints=http://localhost:2379 endpoint health
```

**Success Criteria**:
- [ ] etcd starts successfully
- [ ] `member list` shows etcd1
- [ ] `endpoint health` shows healthy

---

#### Task 8.2: Install and Configure Patroni
**Time**: 3 hours
**Priority**: 🔴 CRITICAL

**Installation**:
```bash
pip3 install patroni[etcd]
pip3 install python-etcd
```

**Files to Create**:
```bash
config/patroni/patroni-primary.yml
config/patroni/patroni-standby.yml
```

**Content (patroni-primary.yml)**:
```yaml
scope: connect-cluster
namespace: /db/
name: postgresql1

restapi:
  listen: 127.0.0.1:8008
  connect_address: 127.0.0.1:8008

etcd:
  host: 127.0.0.1:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB
    postgresql:
      use_pg_rewind: true
      parameters:
        wal_level: replica
        hot_standby: on
        max_wal_senders: 10
        max_replication_slots: 10
        wal_keep_size: 1GB

  initdb:
    - encoding: UTF8
    - locale: en_US.UTF-8
    - data-checksums

postgresql:
  listen: 127.0.0.1:5432
  connect_address: 127.0.0.1:5432
  data_dir: /opt/homebrew/var/postgresql@15
  bin_dir: /opt/homebrew/opt/postgresql@15/bin
  authentication:
    replication:
      username: replicator
      password: CHANGE_ME
    superuser:
      username: postgres
      password: CHANGE_ME
  parameters:
    unix_socket_directories: '/tmp'

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

**Start Patroni**:
```bash
# Start Patroni for primary
patroni /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml &

# Check status
patronictl -c /Users/paulkim/Downloads/connect/config/patroni/patroni-primary.yml list
```

**Success Criteria**:
- [ ] Patroni starts successfully
- [ ] `patronictl list` shows cluster members
- [ ] Leader election successful

---

### 📋 DAY 10-11 (Oct 18-19): HAProxy Load Balancing

#### Task 10.1: Install and Configure HAProxy
**Time**: 2 hours
**Priority**: 🟡 HIGH

**Installation**:
```bash
brew install haproxy
```

**Files to Create**:
```bash
config/haproxy/haproxy.cfg
```

**Content**:
```cfg
global
    maxconn 1000
    log 127.0.0.1 local0 info

defaults
    log global
    mode tcp
    option tcplog
    option dontlognull
    retries 3
    timeout connect 5s
    timeout client 30s
    timeout server 30s

# PostgreSQL Write Traffic (Primary Only)
listen postgres_write
    bind *:5000
    mode tcp
    option httpchk
    http-check expect status 200
    default-server inter 3s fall 3 rise 2 on-marked-down shutdown-sessions
    server postgresql1 127.0.0.1:5432 maxconn 100 check port 8008
    server postgresql2 127.0.0.1:5433 maxconn 100 check port 8009 backup

# PostgreSQL Read Traffic (Load Balanced)
listen postgres_read
    bind *:5001
    mode tcp
    balance leastconn
    option httpchk
    http-check expect status 200
    default-server inter 3s fall 3 rise 2
    server postgresql1 127.0.0.1:5432 maxconn 100 check port 8008
    server postgresql2 127.0.0.1:5433 maxconn 100 check port 8009

# HAProxy Stats
listen stats
    bind *:7000
    mode http
    stats enable
    stats uri /stats
    stats refresh 5s
    stats show-legends
```

**Start HAProxy**:
```bash
# Test configuration
haproxy -c -f /Users/paulkim/Downloads/connect/config/haproxy/haproxy.cfg

# Start HAProxy
haproxy -f /Users/paulkim/Downloads/connect/config/haproxy/haproxy.cfg &

# Check stats page
open http://localhost:7000/stats
```

**Success Criteria**:
- [ ] HAProxy starts successfully
- [ ] Stats page accessible at http://localhost:7000/stats
- [ ] Write port (5000) routes to primary
- [ ] Read port (5001) balances across both servers

---

#### Task 10.2: Update Application for HAProxy
**Time**: 1 hour
**Priority**: 🟡 HIGH

**Files to Modify**:
```bash
.env
```

**Update**:
```env
# Write operations (through HAProxy to primary)
DATABASE_URL="postgresql://connect:password@localhost:5000/connect?schema=public&connection_limit=50"

# Read operations (through HAProxy, load balanced)
DATABASE_READ_URL="postgresql://connect:password@localhost:5001/connect?schema=public&connection_limit=100"
```

**Test**:
```bash
# Test write connection
psql -h localhost -p 5000 -U connect -d connect -c "SELECT pg_is_in_recovery();"
# Should return 'f' (false = primary)

# Test read connection
psql -h localhost -p 5001 -U connect -d connect -c "SELECT pg_is_in_recovery();"
# May return 'f' or 't' depending on which server answers
```

---

### 📋 DAY 12-13 (Oct 20-21): Failover Testing

#### Task 12.1: Manual Failover Test
**Time**: 2 hours
**Priority**: 🔴 CRITICAL

**Files to Create**:
```bash
scripts/test-failover.sh
```

**Content**:
```bash
#!/bin/bash
# Automated Failover Testing Script
# Connect Platform - PostgreSQL HA

set -e

echo "=========================================="
echo "FAILOVER TEST - Connect Platform"
echo "=========================================="
echo ""

# Pre-failover checks
echo "1. Pre-Failover Status Check..."
echo "Primary status:"
psql -h localhost -p 5000 -d connect -c "SELECT pg_is_in_recovery();"

echo ""
echo "Standby status:"
psql -h localhost -p 5001 -d connect -c "SELECT pg_is_in_recovery();"

echo ""
echo "2. Creating test data on primary..."
psql -h localhost -p 5000 -d connect -c "
CREATE TABLE IF NOT EXISTS failover_test (
  id SERIAL PRIMARY KEY,
  test_time TIMESTAMP DEFAULT NOW()
);
INSERT INTO failover_test (test_time) VALUES (NOW());
"

# Simulate primary failure
echo ""
echo "3. Simulating primary failure (stopping PostgreSQL on port 5432)..."
START_TIME=$(date +%s)
pg_ctl -D /opt/homebrew/var/postgresql@15 stop -m fast

echo "Waiting for failover (max 60 seconds)..."
FAILED_OVER=false
for i in {1..60}; do
  sleep 1
  if psql -h localhost -p 5000 -d connect -c "SELECT pg_is_in_recovery();" 2>/dev/null | grep -q "f"; then
    END_TIME=$(date +%s)
    FAILOVER_TIME=$((END_TIME - START_TIME))
    FAILED_OVER=true
    break
  fi
  echo -n "."
done

echo ""
if [ "$FAILED_OVER" = true ]; then
  echo "✅ Failover completed in $FAILOVER_TIME seconds"

  if [ $FAILOVER_TIME -le 30 ]; then
    echo "✅ SUCCESS: Failover time within 30-second target"
  else
    echo "⚠️  WARNING: Failover took longer than 30 seconds"
  fi
else
  echo "❌ FAILED: Failover did not complete within 60 seconds"
  exit 1
fi

# Verify data integrity
echo ""
echo "4. Verifying data integrity..."
COUNT=$(psql -t -h localhost -p 5000 -d connect -c "SELECT COUNT(*) FROM failover_test;")
echo "Records in failover_test: $COUNT"

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Data integrity verified"
else
  echo "❌ Data loss detected"
  exit 1
fi

# Cleanup
echo ""
echo "5. Cleaning up test data..."
psql -h localhost -p 5000 -d connect -c "DROP TABLE IF EXISTS failover_test;"

echo ""
echo "=========================================="
echo "FAILOVER TEST COMPLETE"
echo "Results:"
echo "  - Failover time: $FAILOVER_TIME seconds"
echo "  - Target: <30 seconds"
echo "  - Status: $([ $FAILOVER_TIME -le 30 ] && echo '✅ PASS' || echo '⚠️  SLOW')"
echo "=========================================="
```

**Run Test**:
```bash
chmod +x scripts/test-failover.sh
./scripts/test-failover.sh
```

**Success Criteria**:
- [ ] Failover completes in <30 seconds
- [ ] No data loss during failover
- [ ] New primary accepts write operations
- [ ] HAProxy routes traffic to new primary

---

#### Task 12.2: Load Testing During Failover
**Time**: 2 hours
**Priority**: 🟡 HIGH

**Files to Create**:
```bash
scripts/loadtest-failover.js
```

**Content**:
```javascript
// k6 load test during failover
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up
    { duration: '5m', target: 50 },   // Sustained load during failover
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.05'],    // <5% errors (allowing some during failover)
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
  });
  sleep(1);
}
```

**Run Test**:
```bash
# Terminal 1: Start load test
k6 run scripts/loadtest-failover.js

# Terminal 2: Trigger failover during test
sleep 60 && ./scripts/test-failover.sh

# Observe: Errors should spike during failover but recover quickly
```

**Success Criteria**:
- [ ] <5% request failures during entire test
- [ ] Recovery within 30 seconds of failover
- [ ] No crashes or hung connections

---

### 📋 DAY 14 (Oct 22): Week 2 Validation & Documentation

#### Task 14.1: Complete HA Infrastructure Validation
**Time**: 2 hours
**Priority**: 🔴 CRITICAL

**Comprehensive Validation Checklist**:
```bash
# 1. Component status checks
etcdctl endpoint health
patronictl -c config/patroni/patroni-primary.yml list
curl http://localhost:7000/stats

# 2. Replication status
./scripts/check-replication-lag.sh

# 3. Failover test
./scripts/test-failover.sh

# 4. Rollback test (promote old primary back)
# Manually restart old primary, let Patroni handle it

# 5. Split-brain prevention test
# Start both servers, verify only one becomes primary

# 6. Load test
k6 run scripts/loadtest/stress.js
```

**Create Week 2 Progress Report**:
```bash
docs/plans/progress/week02-complete.md
```

**Success Criteria** (Week 2 Complete):
- [ ] Patroni + etcd operational
- [ ] Automated failover <30 seconds
- [ ] HAProxy load balancing working
- [ ] Zero data loss in failover tests
- [ ] Load test during failover <5% errors
- [ ] All monitoring scripts functional
- [ ] Documentation complete

---

# WEEK 3-4: AI Integration (Claude Sonnet 4.5)
## Dates: October 23 - November 5, 2025

### 🎯 Week 3-4 Objectives
- Integrate Anthropic Claude Sonnet 4.5
- Implement AI-powered match explanations
- Build Q&A chat system with conversation memory
- Korean prompt engineering (professional 존댓말)
- Cost tracking and optimization

### 📋 DAY 15 (Oct 23): Anthropic SDK Setup

#### Task 15.1: Install Anthropic SDK
**Time**: 30 minutes
**Priority**: 🔴 CRITICAL

**Commands**:
```bash
# Install Anthropic SDK
npm install @anthropic-ai/sdk

# Install additional dependencies
npm install dotenv

# Update types
npm install --save-dev @types/node
```

**Files to Modify**:
```bash
.env
```

**Add**:
```env
# Anthropic API
ANTHROPIC_API_KEY="your_api_key_here"  # Get from https://console.anthropic.com/
ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"
ANTHROPIC_MAX_TOKENS=4096
ANTHROPIC_TEMPERATURE=0.7

# Rate limiting
AI_RATE_LIMIT_PER_MINUTE=50  # Tier 1 limit
AI_DAILY_BUDGET_KRW=50000    # 50,000 KRW/day budget
```

**Success Criteria**:
- [ ] @anthropic-ai/sdk installed successfully
- [ ] API key configured in `.env`
- [ ] No npm installation errors

---

#### Task 15.2: Create AI Client Wrapper
**Time**: 1 hour
**Priority**: 🔴 CRITICAL

**Files to Create**:
```bash
lib/ai/client.ts
```

**Content**: (This will be a comprehensive wrapper with error handling, rate limiting, and cost tracking)

*[Content truncated for length - full implementation would include complete client wrapper code]*

---

### 📋 Week 3-4 Daily Tasks Continue...

*[Due to length constraints, the master plan continues with detailed daily tasks for Weeks 3-12, following the same granular format]*

---

# PROGRESS TRACKING

## How to Use This Plan

1. **Daily**: Check current day's tasks
2. **Execute**: Follow step-by-step instructions
3. **Validate**: Run success criteria checks
4. **Document**: Update progress file in `docs/plans/progress/`
5. **Update Status**: Mark tasks complete in this file

## Progress Indicators

- 🔵 TODO: Not started
- 🟡 IN PROGRESS: Currently working
- 🟢 COMPLETE: Finished and validated
- 🔴 BLOCKED: Waiting on dependency or issue

## Risk Levels

- 🔴 CRITICAL: Must complete, blocks other work
- 🟡 HIGH: Important but not blocking
- 🟢 MEDIUM: Standard priority
- ⚪ LOW: Nice to have

---

**Last Updated**: October 9, 2025
**Current Task**: Week 1 Day 1 - PostgreSQL Primary Server Configuration
**Next Checkpoint**: Week 1 Complete (Oct 15, 2025)
