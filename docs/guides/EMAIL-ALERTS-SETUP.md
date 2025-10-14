# Email Alerts Setup Guide

**Date:** October 14, 2025  
**For:** Connect Platform Grafana Monitoring

---

## 🎯 Overview

This guide will help you set up email notifications for Grafana alerts so you can receive proactive notifications about platform issues.

---

## 📧 Step 1: Choose Email Provider

### **Option A: Gmail (Easiest for Testing)**

**Pros:**
- Free
- Easy to set up
- Reliable

**Cons:**
- Less secure app passwords
- May have sending limits

**Settings:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
Username: your-email@gmail.com
Password: (App Password - see below)
```

**Get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to "App passwords"
4. Generate password for "Mail"
5. Copy 16-character password

### **Option B: SendGrid (Recommended for Production)**

**Pros:**
- 100 emails/day free
- Professional
- Better deliverability
- API-based

**Cons:**
- Requires sign-up

**Settings:**
```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
Username: apikey
Password: (Your SendGrid API key)
```

**Get SendGrid API Key:**
1. Sign up at https://sendgrid.com
2. Go to Settings → API Keys
3. Create API Key with "Mail Send" permission
4. Copy API key

### **Option C: AWS SES (Best for Scale)**

**Pros:**
- Highly scalable
- Very cheap ($0.10 per 1,000 emails)
- Professional

**Cons:**
- More complex setup
- Requires AWS account

**Settings:**
```
SMTP Host: email-smtp.{region}.amazonaws.com
SMTP Port: 587
Username: (SMTP credentials)
Password: (SMTP credentials)
```

---

## 🔧 Step 2: Configure Grafana SMTP

### **Method 1: Environment Variables (Recommended)**

Update `docker-compose.production.yml`:

```yaml
grafana:
  image: grafana/grafana:latest
  container_name: connect_grafana
  restart: unless-stopped
  user: "472"
  environment:
    # Existing settings
    GF_SECURITY_ADMIN_USER: admin
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    GF_USERS_ALLOW_SIGN_UP: false
    GF_SERVER_ROOT_URL: http://localhost:3100
    GF_INSTALL_PLUGINS: redis-datasource
    
    # SMTP Settings
    GF_SMTP_ENABLED: true
    GF_SMTP_HOST: smtp.gmail.com:587
    GF_SMTP_USER: ${SMTP_USER}
    GF_SMTP_PASSWORD: ${SMTP_PASSWORD}
    GF_SMTP_FROM_ADDRESS: ${SMTP_FROM_ADDRESS}
    GF_SMTP_FROM_NAME: "Connect Platform Alerts"
    GF_SMTP_SKIP_VERIFY: false
```

Add to `/opt/connect/.env`:

```bash
# SMTP Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_ADDRESS=alerts@connectplt.kr
```

Restart Grafana:

```bash
ssh user@221.164.102.253 'cd /opt/connect && docker-compose restart grafana'
```

### **Method 2: Grafana UI Configuration**

1. Open Grafana: http://221.164.102.253:3100
2. Login as admin
3. Go to **Configuration** → **Settings** → **SMTP/Email**
4. Fill in settings:
   - **Host:** smtp.gmail.com:587
   - **User:** your-email@gmail.com
   - **Password:** your-app-password
   - **From address:** alerts@connectplt.kr
   - **From name:** Connect Platform Alerts
5. Click **Test** to send test email
6. Click **Save**

---

## 📬 Step 3: Create Contact Points

### **Via Grafana UI:**

1. Go to **Alerting** → **Contact points**
2. Click **Add contact point**
3. Fill in:
   - **Name:** Production Email Alerts
   - **Integration:** Email
   - **Addresses:** your-email@example.com (comma-separated for multiple)
4. **Optional Settings:**
   - Subject template: `[{{ .Status }}] {{ .CommonLabels.alertname }}`
   - Message template: See below
5. Click **Test** to verify
6. Click **Save contact point**

### **Message Template:**

```
🚨 Alert: {{ .CommonLabels.alertname }}

Severity: {{ .CommonLabels.severity }}
Environment: Production
Time: {{ .StartsAt }}

{{ range .Alerts }}
📝 Summary: {{ .Annotations.summary }}
📋 Description: {{ .Annotations.description }}
{{ end }}

🔗 View in Grafana: http://221.164.102.253:3100

---
Connect Platform Monitoring
```

---

## 🚨 Step 4: Create Alert Rules

### **Alert 1: High Database Connections**

1. Go to **Alerting** → **Alert rules** → **New alert rule**
2. Configure:
   - **Rule name:** High Database Connections
   - **Folder:** Alerts
   - **Group:** Database
3. **Query and conditions:**
   ```
   A: SELECT COUNT(*) as value FROM pg_stat_activity;
   B: Threshold (value > 150)
   ```
4. **Set alert evaluation:**
   - **For:** 5m (trigger after 5 minutes)
   - **Evaluate every:** 1m
5. **Add annotations:**
   - **Summary:** Database connections exceeded 150
   - **Description:** Current connections: {{ $values.A }}. Investigate connection leaks.
6. **Add labels:**
   - **severity:** warning
   - **component:** database
7. Click **Save and exit**

### **Alert 2: High Active Queries**

1. **Rule name:** High Active DB Queries
2. **Query:**
   ```sql
   SELECT COUNT(*) as value 
   FROM pg_stat_activity 
   WHERE state = 'active';
   ```
3. **Condition:** value > 80
4. **For:** 3m
5. **Summary:** Too many active database queries
6. **Severity:** warning

### **Alert 3: Database Size Warning**

1. **Rule name:** Database Size Warning
2. **Query:**
   ```sql
   SELECT pg_database_size('connect')/1024/1024/1024 as size_gb;
   ```
3. **Condition:** size_gb > 50
4. **For:** 1h
5. **Summary:** Database size exceeds 50GB
6. **Severity:** info

### **Alert 4: Redis Memory High**

1. **Rule name:** Redis Cache Memory High
2. **Data source:** Redis Cache
3. **Command:** INFO memory
4. **Parse:** used_memory_human
5. **Condition:** > 10GB
6. **For:** 10m
7. **Summary:** Redis cache memory usage is high
8. **Severity:** warning

### **Alert 5: Application Errors**

1. **Rule name:** High Error Rate
2. **Query:**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE level = 'error') * 100.0 / 
     NULLIF(COUNT(*), 0) as error_rate
   FROM logs
   WHERE timestamp > NOW() - INTERVAL '5 minutes';
   ```
3. **Condition:** error_rate > 5
4. **For:** 2m
5. **Summary:** Application error rate exceeds 5%
6. **Severity:** critical

---

## 📋 Step 5: Configure Notification Policies

### **Default Policy:**

1. Go to **Alerting** → **Notification policies**
2. Edit **Default policy:**
   - **Contact point:** Production Email Alerts
   - **Group by:** alertname
   - **Group wait:** 30s
   - **Group interval:** 5m
   - **Repeat interval:** 4h

### **Critical Alerts Policy:**

1. Click **New specific policy**
2. **Matching labels:**
   - **severity = critical**
3. **Contact point:** Production Email Alerts
4. **Group by:** alertname
5. **Group wait:** 0s (immediate)
6. **Group interval:** 0s (immediate)
7. **Repeat interval:** 30m

### **Warning Alerts Policy:**

1. Click **New specific policy**
2. **Matching labels:**
   - **severity = warning**
3. **Group interval:** 15m
4. **Repeat interval:** 2h

---

## ✅ Step 6: Test Your Setup

### **Test 1: Send Test Email**

```bash
# Via Grafana API
curl -X POST http://221.164.102.253:3100/api/alerts/test \
  -H "Content-Type: application/json" \
  -u admin:aXzTqR1YfL2bTTJ2X21KQw== \
  -d '{
    "contactPoint": "Production Email Alerts",
    "alert": {
      "labels": {"severity": "test"},
      "annotations": {
        "summary": "Test alert from Grafana",
        "description": "This is a test email notification"
      }
    }
  }'
```

### **Test 2: Trigger Real Alert**

```bash
# Create many DB connections to trigger alert
ssh user@221.164.102.253 'for i in {1..100}; do psql -U connect -d connect -c "SELECT pg_sleep(10);" & done'
```

### **Test 3: Check Alert Status**

1. Go to **Alerting** → **Alert rules**
2. Check alert state: Normal → Pending → Firing
3. Verify email received
4. Check alert details

---

## 🎨 Customization

### **Email Template with HTML**

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .alert { 
      background: #ff4444; 
      color: white; 
      padding: 10px; 
      border-radius: 5px; 
    }
    .warning { background: #ffaa00; }
    .info { background: #4444ff; }
  </style>
</head>
<body>
  <div class="alert {{ .CommonLabels.severity }}">
    <h2>🚨 {{ .CommonLabels.alertname }}</h2>
    <p><strong>Severity:</strong> {{ .CommonLabels.severity }}</p>
    <p><strong>Time:</strong> {{ .StartsAt }}</p>
  </div>
  
  {{ range .Alerts }}
  <h3>Details</h3>
  <p>{{ .Annotations.summary }}</p>
  <p>{{ .Annotations.description }}</p>
  {{ end }}
  
  <a href="http://221.164.102.253:3100">View in Grafana</a>
</body>
</html>
```

### **Slack Integration (Alternative)**

If you prefer Slack:

1. Create Slack webhook: https://api.slack.com/apps
2. Add contact point: Type = Slack
3. Webhook URL: Your Slack webhook
4. Channel: #alerts or #production

---

## 📊 Monitoring Your Alerts

### **Alert Dashboard**

Create a dashboard to monitor alerts:

1. Go to **Dashboards** → **New dashboard**
2. Add panel: Alert History
   ```sql
   SELECT 
     timestamp,
     alertname,
     severity,
     status
   FROM alert_history
   ORDER BY timestamp DESC
   LIMIT 50;
   ```

### **Alert Statistics**

```sql
SELECT 
  alertname,
  COUNT(*) as total_fires,
  AVG(duration) as avg_duration
FROM alert_history
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY alertname
ORDER BY total_fires DESC;
```

---

## 🔧 Troubleshooting

### **Problem: Not Receiving Emails**

**Solutions:**
1. **Check SMTP settings:**
   ```bash
   ssh user@221.164.102.253 'docker logs connect_grafana | grep -i smtp'
   ```

2. **Test SMTP connection:**
   ```bash
   # From server
   telnet smtp.gmail.com 587
   ```

3. **Check spam folder**

4. **Verify contact point:**
   - Go to Contact points
   - Click **Test** button
   - Check for error messages

### **Problem: Too Many Alerts**

**Solutions:**
1. **Adjust thresholds** (make them less sensitive)
2. **Increase group interval** (aggregate more)
3. **Increase repeat interval** (less frequent)
4. **Add more specific conditions**

### **Problem: Alerts Not Firing**

**Solutions:**
1. **Check alert rule status:** Alerting → Alert rules
2. **Verify query returns data:** Test in dashboard
3. **Check evaluation interval:** May need to wait
4. **Review alert conditions:** Ensure threshold is correct

---

## 📝 Best Practices

### **1. Alert Fatigue Prevention**
- Set appropriate thresholds
- Use severity levels correctly
- Group similar alerts
- Don't alert on everything

### **2. Clear Alert Messages**
- Include context in summary
- Add actionable description
- Link to runbooks
- Include current values

### **3. Escalation**
- Critical → Immediate email + SMS
- Warning → Email every 15 min
- Info → Daily digest

### **4. Regular Review**
- Weekly: Review alert effectiveness
- Monthly: Adjust thresholds
- Quarterly: Audit all alerts

---

## 📚 Quick Reference

### **Add Alert Rule:**
Alerting → Alert rules → New alert rule

### **Test Contact Point:**
Alerting → Contact points → Test

### **View Alert History:**
Alerting → Alert rules → [Rule] → State history

### **Silence Alert:**
Alerting → Silences → New silence

---

## 🔗 Related Documentation

- [Grafana Alerting Docs](https://grafana.com/docs/grafana/latest/alerting/)
- [SMTP Configuration](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/#smtp)
- [Alert Rule Guide](https://grafana.com/docs/grafana/latest/alerting/fundamentals/)

---

**Last Updated:** October 14, 2025  
**Status:** Production Ready Configuration

