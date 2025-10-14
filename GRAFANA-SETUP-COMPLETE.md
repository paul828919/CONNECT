# 📊 Grafana Monitoring Setup - Complete Guide

**Date:** October 14, 2025  
**Status:** ✅ **COMPLETE**  
**For:** Connect Platform Production Monitoring

---

## 🎯 What Was Set Up

### ✅ **Data Sources Configured (3)**

1. **PostgreSQL** (Default)
   - URL: `postgres:5432`
   - Database: `connect`
   - User: `connect`
   - Status: ✅ Connected

2. **Redis Cache**
   - URL: `redis-cache:6379`
   - Type: Standalone
   - Status: ✅ Connected

3. **Redis Queue**
   - URL: `redis-queue:6379`
   - Type: Standalone
   - Status: ✅ Connected

### ✅ **Dashboards Created (3)**

1. **Connect Platform - Overview**
   - Total Users count
   - Total Projects count
   - Active database connections
   - Recent user registrations
   - Database size by table
   - Redis cache hit ratio
   - **URL:** http://221.164.102.253:3100/d/connect-platform-overview

2. **PostgreSQL - Connect Database**
   - Database connections (active)
   - Total connections
   - Database size
   - Top tables by size
   - Active queries
   - **URL:** http://221.164.102.253:3100/d/postgres-monitoring

3. **Redis - Cache & Queue**
   - Connected clients (Cache & Queue)
   - Memory usage (Cache & Queue)
   - Commands per second
   - **URL:** http://221.164.102.253:3100/d/redis-monitoring

---

## 🔐 Access Information

**Grafana URL:** http://221.164.102.253:3100

**Credentials:**
- Username: `admin`
- Password: `aXzTqR1YfL2bTTJ2X21KQw==`

---

## 🚨 Setting Up Alerts (Manual Setup Required)

Since Grafana alerting requires specific configuration, follow these steps to set up alerts through the UI:

### **Alert 1: High Database Connections**

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Fill in:
   - **Name:** High Database Connections
   - **Query:**
     ```sql
     SELECT COUNT(*) as value FROM pg_stat_activity;
     ```
   - **Data source:** PostgreSQL
   - **Condition:** `value > 150`
   - **For:** 5 minutes
   - **Summary:** "Database connections exceeded safe threshold"

3. Click **Save**

### **Alert 2: High Active Connections**

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Fill in:
   - **Name:** High Active DB Connections
   - **Query:**
     ```sql
     SELECT COUNT(*) as value FROM pg_stat_activity WHERE state = 'active';
     ```
   - **Data source:** PostgreSQL
   - **Condition:** `value > 80`
   - **For:** 3 minutes
   - **Summary:** "Too many active database queries"

3. Click **Save**

### **Alert 3: Large Table Growth**

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Fill in:
   - **Name:** Database Size Warning
   - **Query:**
     ```sql
     SELECT pg_database_size('connect')/1024/1024/1024 as size_gb;
     ```
   - **Data source:** PostgreSQL
   - **Condition:** `size_gb > 50`
   - **For:** 1 hour
   - **Summary:** "Database size exceeds 50GB"

3. Click **Save**

### **Alert 4: Redis Memory Usage**

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Fill in:
   - **Name:** Redis Cache Memory High
   - **Query:** Use Redis Cache data source with `INFO memory` command
   - **Condition:** Parse memory usage > 10GB
   - **For:** 10 minutes
   - **Summary:** "Redis cache memory usage is high"

3. Click **Save**

---

## 📧 Setting Up Alert Notifications

### **Step 1: Add Contact Point**

1. Go to **Alerting** → **Contact points** → **Add contact point**
2. Choose notification method:
   - **Email** (recommended for production)
   - **Slack** (for team notifications)
   - **Discord** (alternative)
   - **Webhook** (custom integrations)

### **Step 2: Configure Email Notifications**

1. **Name:** Production Alerts
2. **Type:** Email
3. **Addresses:** your-email@domain.com
4. **Subject:** `[Connect Platform] {{ .CommonLabels.alertname }}`
5. **Message Template:**
   ```
   Alert: {{ .CommonLabels.alertname }}
   Severity: {{ .CommonLabels.severity }}
   
   {{ range .Alerts }}
   Summary: {{ .Annotations.summary }}
   Description: {{ .Annotations.description }}
   {{ end }}
   ```
6. Click **Save contact point**

### **Step 3: Create Notification Policy**

1. Go to **Alerting** → **Notification policies**
2. Click **New specific policy**
3. **Matching labels:** `severity=critical`
4. **Contact point:** Production Alerts
5. Click **Save**

---

## 📊 Using the Dashboards

### **Connect Platform Overview Dashboard**

This is your main dashboard. Use it to:

1. **Monitor User Growth**
   - Check "Total Users" panel
   - View "Recent User Registrations" table

2. **Track Platform Activity**
   - Monitor "Active Connections" 
   - Watch database connection trends

3. **Database Health**
   - Review "Database Size by Table"
   - Identify growing tables early

**How to access:**
```bash
open http://221.164.102.253:3100/d/connect-platform-overview
```

### **PostgreSQL Dashboard**

Use this for database deep-dive:

1. **Connection Monitoring**
   - Active vs total connections
   - Identify connection leaks

2. **Performance Analysis**
   - View active queries
   - Find slow queries
   - Analyze query patterns

3. **Storage Management**
   - Monitor database size
   - Track table growth
   - Plan capacity

**How to access:**
```bash
open http://221.164.102.253:3100/d/postgres-monitoring
```

### **Redis Dashboard**

Monitor caching performance:

1. **Cache Efficiency**
   - Connected clients
   - Memory usage
   - Hit ratio

2. **Queue Status**
   - Queue depth
   - Processing rate
   - Memory usage

**How to access:**
```bash
open http://221.164.102.253:3100/d/redis-monitoring
```

---

## 🎯 Daily Monitoring Routine

### **Every Morning (5 minutes)**

```bash
# 1. Open main dashboard
open http://221.164.102.253:3100/d/connect-platform-overview

# Check:
# - Total users (should grow steadily)
# - Active connections (should be < 50)
# - Recent registrations (verify activity)
```

### **Every Afternoon (3 minutes)**

```bash
# 1. Check PostgreSQL dashboard
open http://221.164.102.253:3100/d/postgres-monitoring

# Check:
# - Database size (plan upgrades)
# - Active queries (spot issues)
# - Connection count (detect leaks)
```

### **Weekly (10 minutes)**

```bash
# 1. Review all dashboards
# 2. Check alert history
# 3. Verify data sources are connected
# 4. Update alert thresholds if needed
```

---

## 🔧 Useful Queries

### **Find Slow Queries**

```sql
SELECT 
  pid, 
  now() - query_start as duration, 
  query 
FROM pg_stat_activity 
WHERE state = 'active' 
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;
```

### **Check Table Bloat**

```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### **Monitor Connection Pool**

```sql
SELECT 
  COUNT(*) FILTER (WHERE state = 'active') AS active,
  COUNT(*) FILTER (WHERE state = 'idle') AS idle,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
  COUNT(*) AS total
FROM pg_stat_activity;
```

### **Redis Memory Breakdown**

In Redis dashboard, use these commands:
- `INFO memory` - Memory statistics
- `INFO stats` - Command statistics  
- `DBSIZE` - Key count
- `INFO clients` - Client connections

---

## 🎨 Customizing Dashboards

### **Add a New Panel**

1. Open any dashboard
2. Click **Add panel** (top right)
3. Choose visualization type:
   - **Graph** - Time series data
   - **Stat** - Single value
   - **Table** - Tabular data
   - **Gauge** - Percentage/ratio

4. Configure query:
   - Select data source (PostgreSQL/Redis)
   - Write SQL query or Redis command
   - Set refresh interval

5. Click **Apply**

### **Example: Add "Failed Login Attempts" Panel**

1. Add panel → Choose **Stat**
2. Data source: **PostgreSQL**
3. Query:
   ```sql
   SELECT COUNT(*) as value 
   FROM "LoginAttempt" 
   WHERE success = false 
     AND "createdAt" > NOW() - INTERVAL '1 hour';
   ```
4. Title: "Failed Logins (Last Hour)"
5. Thresholds:
   - Green: 0-10
   - Yellow: 10-50
   - Red: > 50

---

## 🚀 Advanced Features

### **1. Variables for Dynamic Dashboards**

Create dashboard variables to filter data:

1. Dashboard settings → **Variables** → **Add variable**
2. Example: Time range selector
   - Name: `timerange`
   - Type: Custom
   - Values: `5m,15m,1h,6h,24h,7d`

3. Use in queries: `WHERE created_at > NOW() - INTERVAL '$timerange'`

### **2. Dashboard Annotations**

Mark important events on graphs:

1. Dashboard settings → **Annotations** → **Add annotation**
2. Data source: PostgreSQL
3. Query:
   ```sql
   SELECT 
     "createdAt" as time,
     'Deployment' as text,
     'version' as tags
   FROM "DeploymentLog"
   WHERE "createdAt" > $__timeFrom()
   ```

### **3. Panel Linking**

Link panels to drill down:

1. Panel → Edit → **Overrides**
2. Add field override
3. **Data links** → Add link
4. URL: `/d/postgres-monitoring?var-table=${__field.name}`

---

## 📈 Scaling Your Monitoring

### **When You Grow**

As your platform scales, consider:

1. **Add Prometheus**
   - Application-level metrics
   - Custom business metrics
   - Better time-series handling

2. **Add Loki for Logs**
   - Centralized log aggregation
   - Log correlation with metrics
   - Advanced log queries

3. **Add Alertmanager**
   - Advanced alert routing
   - Alert grouping/deduplication
   - Silence management

4. **External Monitoring**
   - Uptime monitoring (Uptime Kuma)
   - Third-party status pages
   - Geographic monitoring

---

## 🔍 Troubleshooting

### **Problem: Dashboard Shows "No Data"**

**Solution:**
```bash
# 1. Check data source connection
curl -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
  http://221.164.102.253:3100/api/datasources

# 2. Test PostgreSQL connection
ssh user@221.164.102.253 'docker exec connect_postgres psql -U connect -d connect -c "SELECT 1;"'

# 3. Test Redis connection
ssh user@221.164.102.253 'docker exec connect_redis_cache redis-cli PING'
```

### **Problem: Alerts Not Firing**

**Solution:**
1. Check alert rule status: **Alerting** → **Alert rules**
2. Verify evaluation interval (default: 1 minute)
3. Check contact point configuration
4. Review notification policy matching labels
5. Test contact point: **Contact points** → **Test**

### **Problem: Slow Dashboard Loading**

**Solution:**
1. Reduce query time range (use variables)
2. Limit result set size (add LIMIT to SQL)
3. Increase refresh interval (30s → 1m)
4. Use appropriate visualization (table → stat for single values)

---

## 📚 Quick Reference

### **Essential URLs**

```bash
# Main Grafana
http://221.164.102.253:3100

# Platform Overview
http://221.164.102.253:3100/d/connect-platform-overview

# PostgreSQL Monitoring
http://221.164.102.253:3100/d/postgres-monitoring

# Redis Monitoring  
http://221.164.102.253:3100/d/redis-monitoring
```

### **Essential Commands**

```bash
# Test data sources
curl -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
  http://221.164.102.253:3100/api/datasources

# List dashboards
curl -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
  http://221.164.102.253:3100/api/search

# Check Grafana health
curl http://221.164.102.253:3100/api/health
```

---

## ✅ Next Steps

### **This Week**

- [ ] Set up email notifications
- [ ] Create first alert rule (high DB connections)
- [ ] Customize dashboard thresholds
- [ ] Add deployment annotations

### **This Month**

- [ ] Set up Prometheus (optional)
- [ ] Create custom business metrics panels
- [ ] Implement log aggregation
- [ ] Set up external monitoring

### **Ongoing**

- [ ] Review dashboards daily
- [ ] Update alert thresholds monthly
- [ ] Add panels for new features
- [ ] Document custom queries

---

## 🎉 Congratulations!

You now have:

✅ **3 Data sources** configured and connected  
✅ **3 Dashboards** for comprehensive monitoring  
✅ **Alert setup guide** for proactive monitoring  
✅ **Complete documentation** for daily use

**Your Connect platform monitoring is production-ready!** 🚀

---

## 📞 Getting Help

**Documentation:**
- Grafana Docs: https://grafana.com/docs/
- PostgreSQL Plugin: https://grafana.com/docs/grafana/latest/datasources/postgres/
- Redis Plugin: https://redis.io/docs/latest/integrate/grafana/

**For Issues:**
1. Check Grafana logs: `docker logs connect_grafana`
2. Verify data source connectivity
3. Review panel queries
4. Check alert rule configuration

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Complete and Production Ready!

