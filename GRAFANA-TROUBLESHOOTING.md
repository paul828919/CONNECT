# 🔧 Grafana Troubleshooting Guide

**Date:** October 14, 2025  
**For:** Connect Platform Monitoring

---

## 🚨 Common Issues & Solutions

### **Issue 1: Dashboard Shows "No Data"**

**Symptoms:**
- Panels display "No data" message
- Console shows query errors
- Data sources appear connected

**Solution:**
1. **Refresh the browser** (Ctrl+F5 or Cmd+Shift+R)
2. **Check data source health:**
   ```bash
   curl -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
     http://59.21.170.6:3100/api/datasources/1/health
   ```
3. **Verify database has data:**
   ```bash
   ssh user@59.21.170.6 'docker exec connect_postgres psql -U connect -d connect -c "SELECT COUNT(*) FROM \"User\";"'
   ```

4. **Re-import dashboard if needed:**
   ```bash
   curl -X POST http://59.21.170.6:3100/api/dashboards/db \
     -H "Content-Type: application/json" \
     -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
     -d @config/grafana/dashboards/platform-overview-fixed.json
   ```

---

### **Issue 2: Can't Access Grafana**

**Symptoms:**
- Browser shows "Connection refused"
- URL doesn't load

**Solution:**
1. **Check if Grafana is running:**
   ```bash
   ssh user@59.21.170.6 'docker ps | grep grafana'
   ```

2. **Restart Grafana if needed:**
   ```bash
   ssh user@59.21.170.6 'docker restart connect_grafana'
   ```

3. **Check logs for errors:**
   ```bash
   ssh user@59.21.170.6 'docker logs connect_grafana --tail 50'
   ```

4. **Verify port mapping:**
   ```bash
   ssh user@59.21.170.6 'docker port connect_grafana'
   # Should show: 3000/tcp -> 0.0.0.0:3100
   ```

---

### **Issue 3: Login Failed / Wrong Password**

**Symptoms:**
- "Invalid username or password" error
- Can't log in with documented credentials

**Solution:**
1. **Verify password from server:**
   ```bash
   ssh user@59.21.170.6 'cat /opt/connect/.env | grep GRAFANA_PASSWORD'
   ```

2. **Reset password if needed:**
   ```bash
   # SSH to server
   ssh user@59.21.170.6
   
   # Edit .env file
   nano /opt/connect/.env
   # Update GRAFANA_PASSWORD value
   
   # Restart Grafana
   docker restart connect_grafana
   ```

3. **Use admin password reset (if have container access):**
   ```bash
   ssh user@59.21.170.6 'docker exec -it connect_grafana grafana-cli admin reset-admin-password NEW_PASSWORD'
   ```

---

### **Issue 4: Data Source Connection Failed**

**Symptoms:**
- "Database Connection Error"
- Data sources show as disconnected

**Solution:**
1. **Test network connectivity:**
   ```bash
   # Test if Grafana can reach PostgreSQL
   ssh user@59.21.170.6 'docker exec connect_grafana ping -c 1 postgres'
   
   # Test if Grafana can reach Redis
   ssh user@59.21.170.6 'docker exec connect_grafana ping -c 1 redis-cache'
   ```

2. **Verify database credentials:**
   ```bash
   ssh user@59.21.170.6 'cat /opt/connect/.env | grep DB_PASSWORD'
   ```

3. **Test database directly:**
   ```bash
   ssh user@59.21.170.6 'docker exec connect_postgres psql -U connect -d connect -c "SELECT 1;"'
   ```

4. **Recreate data source:**
   ```bash
   # Delete old data source
   curl -X DELETE http://59.21.170.6:3100/api/datasources/1 \
     -u admin:aXzTqR1YfL2bTTJ2X21KQw==
   
   # Create new one (use correct password from .env)
   curl -X POST http://59.21.170.6:3100/api/datasources \
     -H "Content-Type: application/json" \
     -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
     -d '{
       "name": "PostgreSQL",
       "type": "postgres",
       "url": "postgres:5432",
       "database": "connect",
       "user": "connect",
       "secureJsonData": {"password": "YOUR_DB_PASSWORD"},
       "isDefault": true
     }'
   ```

---

### **Issue 5: Panels Show Wrong Data**

**Symptoms:**
- Numbers don't match expected values
- Queries return unexpected results

**Solution:**
1. **Check query syntax:**
   - Edit panel → View query
   - Verify table names match your schema
   - Ensure column names use correct case (e.g., "User" vs "user")

2. **Test query directly in database:**
   ```bash
   ssh user@59.21.170.6 'docker exec connect_postgres psql -U connect -d connect -c "YOUR_QUERY_HERE"'
   ```

3. **Update panel query:**
   - Click panel title → Edit
   - Modify query
   - Click "Apply" and save dashboard

---

### **Issue 6: Dashboard Won't Save**

**Symptoms:**
- Changes don't persist
- "Failed to save dashboard" error

**Solution:**
1. **Check Grafana permissions:**
   ```bash
   ssh user@59.21.170.6 'docker exec connect_grafana ls -la /var/lib/grafana'
   ```

2. **Verify disk space:**
   ```bash
   ssh user@59.21.170.6 'df -h'
   ```

3. **Check Grafana logs:**
   ```bash
   ssh user@59.21.170.6 'docker logs connect_grafana | grep -i error | tail -20'
   ```

4. **Restart Grafana:**
   ```bash
   ssh user@59.21.170.6 'docker restart connect_grafana'
   ```

---

### **Issue 7: Alerts Not Firing**

**Symptoms:**
- Conditions met but no alerts
- No notifications received

**Solution:**
1. **Check alert rule status:**
   - Go to Alerting → Alert rules
   - Verify rule is "Normal" or "Pending/Firing"
   - Check "State history"

2. **Verify contact point:**
   - Go to Alerting → Contact points
   - Test contact point
   - Check delivery logs

3. **Review notification policy:**
   - Go to Alerting → Notification policies
   - Verify labels match
   - Check routing tree

4. **Check Grafana alert logs:**
   ```bash
   ssh user@59.21.170.6 'docker logs connect_grafana | grep -i alert | tail -50'
   ```

---

### **Issue 8: Slow Dashboard Loading**

**Symptoms:**
- Dashboards take long to load
- Queries timeout

**Solution:**
1. **Optimize queries:**
   - Add LIMIT clauses
   - Use indexes on queried columns
   - Avoid SELECT *

2. **Adjust time range:**
   - Use shorter time windows
   - Increase refresh interval (30s → 1m)

3. **Check database performance:**
   ```bash
   # Check active queries
   ssh user@59.21.170.6 'docker exec connect_postgres psql -U connect -d connect -c "
   SELECT pid, now() - query_start as duration, query 
   FROM pg_stat_activity 
   WHERE state = '\''active'\'' 
   ORDER BY duration DESC;
   "'
   ```

4. **Monitor Grafana resources:**
   ```bash
   ssh user@59.21.170.6 'docker stats connect_grafana --no-stream'
   ```

---

## 🛠️ Diagnostic Commands

### **Full Health Check**

```bash
#!/bin/bash
echo "=== Grafana Health Check ==="

# 1. Container status
echo -e "\n1. Container Status:"
ssh user@59.21.170.6 'docker ps | grep grafana'

# 2. Grafana health
echo -e "\n2. Grafana Health:"
curl -s http://59.21.170.6:3100/api/health | jq '.'

# 3. Data sources
echo -e "\n3. Data Sources:"
curl -s -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
  http://59.21.170.6:3100/api/datasources | jq -r '.[] | "\(.name): \(.type)"'

# 4. PostgreSQL connection
echo -e "\n4. PostgreSQL Connection:"
curl -s -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
  http://59.21.170.6:3100/api/datasources/1/health

# 5. Database data
echo -e "\n5. Database Stats:"
ssh user@59.21.170.6 'docker exec connect_postgres psql -U connect -d connect -c "
  SELECT 
    (SELECT COUNT(*) FROM \"User\") as users,
    (SELECT COUNT(*) FROM pg_stat_activity) as connections,
    (SELECT pg_size_pretty(pg_database_size('\''connect'\''))) as db_size;
"'

echo -e "\n=== Health Check Complete ==="
```

### **Reset Everything**

**⚠️ Warning: This will delete all dashboards and data sources!**

```bash
# 1. Stop Grafana
ssh user@59.21.170.6 'docker stop connect_grafana'

# 2. Remove Grafana data (backup first!)
ssh user@59.21.170.6 'sudo mv /opt/connect/data/grafana /opt/connect/data/grafana.backup.$(date +%Y%m%d)'

# 3. Recreate data directory
ssh user@59.21.170.6 'mkdir -p /opt/connect/data/grafana'

# 4. Start Grafana
ssh user@59.21.170.6 'docker start connect_grafana'

# 5. Wait for startup
sleep 10

# 6. Recreate data sources and dashboards (run setup script)
```

---

## 📞 Getting Help

### **Check Documentation**
1. **GRAFANA-ACCESS.md** - Access & credentials
2. **GRAFANA-SETUP-COMPLETE.md** - Setup & configuration
3. **GRAFANA-MONITORING-SUMMARY.md** - Quick reference

### **Useful Links**
- Grafana Docs: https://grafana.com/docs/
- PostgreSQL Plugin: https://grafana.com/docs/grafana/latest/datasources/postgres/
- Redis Plugin: https://redis.io/docs/latest/integrate/grafana/

### **Command Quick Reference**

```bash
# View logs
ssh user@59.21.170.6 'docker logs connect_grafana --tail 100'

# Restart Grafana
ssh user@59.21.170.6 'docker restart connect_grafana'

# Check connectivity
ssh user@59.21.170.6 'docker exec connect_grafana ping -c 1 postgres'

# Test query
ssh user@59.21.170.6 'docker exec connect_postgres psql -U connect -d connect -c "SELECT COUNT(*) FROM \"User\";"'

# Check data sources
curl -u admin:aXzTqR1YfL2bTTJ2X21KQw== http://59.21.170.6:3100/api/datasources
```

---

**Last Updated:** October 14, 2025  
**Status:** Active Troubleshooting Guide

