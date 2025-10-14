# 📊 Grafana Monitoring - Access Guide

**Last Updated:** October 14, 2025  
**For:** Connect Platform Production Monitoring

---

## 🔐 Access Credentials

### **Production Grafana**

**URL:** http://221.164.102.253:3100

**Login Credentials:**
- **Username:** `admin`
- **Password:** `aXzTqR1YfL2bTTJ2X21KQw==`

---

## 🚀 Quick Start

### **Step 1: Access Grafana**

1. Open your browser
2. Navigate to: http://221.164.102.253:3100
3. You'll see the Grafana login page

### **Step 2: Log In**

1. Enter username: `admin`
2. Enter password: `aXzTqR1YfL2bTTJ2X21KQw==`
3. Click "Log in"

### **Step 3: View Dashboards**

After logging in, you can:
- View pre-configured dashboards
- Monitor system metrics
- Set up alerts
- Create custom dashboards

---

## 📈 What You Can Monitor

### **Application Metrics**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (%)
- Active connections

### **Database Metrics**
- Connection pool status
- Query performance
- Slow queries
- Replication status

### **Infrastructure Metrics**
- CPU usage (%)
- Memory usage (GB)
- Disk I/O
- Network throughput

### **Container Health**
- Container status (app1, app2)
- Container resource usage
- Container restart count
- Docker network status

---

## 🎯 Key Dashboards to Watch

### **1. System Overview**
- Overall health status
- Resource utilization
- Error summary
- Traffic patterns

### **2. Application Performance**
- Request/response metrics
- API endpoint performance
- Error tracking
- User activity

### **3. Database Performance**
- Connection pool
- Query performance
- Cache hit ratio
- Replication lag

### **4. Infrastructure Health**
- Server resources
- Container status
- Network performance
- Disk usage

---

## ⚙️ Configuration Details

### **Grafana Container Info**

- **Container Name:** `connect_grafana`
- **Image:** `grafana/grafana:latest`
- **Internal Port:** 3000
- **External Port:** 3100
- **Network:** `connect_net` (172.25.0.70)

### **Data Persistence**

- **Volume:** `./data/grafana:/var/lib/grafana`
- **Dashboards:** `./config/grafana/dashboards`

### **Resource Allocation**

- **CPU Limit:** 1 core
- **Memory Limit:** 2 GB
- **CPU Reserved:** 0.5 core
- **Memory Reserved:** 1 GB

---

## 🔧 Troubleshooting

### **Problem: Cannot Access Grafana**

**Solution:**
```bash
# Check if Grafana container is running
ssh user@221.164.102.253 'docker ps | grep grafana'

# If not running, start it
ssh user@221.164.102.253 'docker start connect_grafana'

# Check logs if issues persist
ssh user@221.164.102.253 'docker logs connect_grafana --tail 50'
```

### **Problem: Login Failed**

**Possible causes:**
1. Wrong password → Use: `aXzTqR1YfL2bTTJ2X21KQw==`
2. Container restarted → Password from `.env` file
3. First login → May require password change

**Solution:**
```bash
# Verify password in .env
ssh user@221.164.102.253 'cat /opt/connect/.env | grep GRAFANA_PASSWORD'

# Restart Grafana if needed
ssh user@221.164.102.253 'docker restart connect_grafana'
```

### **Problem: Dashboards Not Loading**

**Solution:**
```bash
# Check Grafana logs
ssh user@221.164.102.253 'docker logs connect_grafana --tail 100'

# Restart container
ssh user@221.164.102.253 'docker restart connect_grafana'

# Check if volume is mounted correctly
ssh user@221.164.102.253 'docker inspect connect_grafana | grep -A 10 Mounts'
```

---

## 🛡️ Security Notes

### **Access Control**

- ✅ Admin user only (signup disabled)
- ✅ Password stored in `.env` file
- ✅ Container isolated in Docker network
- ✅ Accessible only via server IP

### **Password Management**

**Current password location:**
- Production server: `/opt/connect/.env` (GRAFANA_PASSWORD)
- Docker compose: `docker-compose.production.yml`

**To change password:**
```bash
# SSH to server
ssh user@221.164.102.253

# Edit .env file
nano /opt/connect/.env

# Update GRAFANA_PASSWORD value
# Save and exit (Ctrl+X, Y, Enter)

# Restart Grafana
docker restart connect_grafana
```

---

## 📚 Additional Resources

### **Related Documentation**

- **CI/CD Pipeline:** `docs/architecture/CICD-PIPELINE.md`
- **Deployment Strategy:** `docs/architecture/DEPLOYMENT-STRATEGY.md`
- **Quick Start Guide:** `CICD-QUICK-START.md`

### **Official Grafana Docs**

- Dashboard creation: https://grafana.com/docs/grafana/latest/dashboards/
- Alerting: https://grafana.com/docs/grafana/latest/alerting/
- Data sources: https://grafana.com/docs/grafana/latest/datasources/

---

## 🎯 Next Steps

### **Recommended Actions**

1. ✅ **Log in to Grafana** (use credentials above)
2. ✅ **Explore existing dashboards**
3. ✅ **Set up email alerts** (optional)
4. ✅ **Customize dashboards** for your needs
5. ✅ **Set up Slack/Discord webhooks** (optional)

### **Daily Monitoring Checklist**

- [ ] Check system overview dashboard
- [ ] Review error rate (should be < 1%)
- [ ] Monitor response time (should be < 500ms)
- [ ] Check resource usage (CPU < 70%, Memory < 80%)
- [ ] Review recent alerts

---

## 💡 Pro Tips

1. **Bookmark Grafana URL** for quick access
2. **Set up browser notifications** for alerts
3. **Create custom dashboards** for specific metrics
4. **Use time range selector** to view historical data
5. **Enable auto-refresh** for real-time monitoring

---

## ✅ Quick Reference

```
URL:      http://221.164.102.253:3100
Username: admin
Password: aXzTqR1YfL2bTTJ2X21KQw==
Port:     3100 (external), 3000 (internal)
Network:  172.25.0.70
```

---

**🎉 You're all set! Start monitoring your Connect platform now!**

