# Server Management Scripts

**Version**: 1.0.0
**Last Updated**: October 11, 2025
**Purpose**: Operational scripts for managing the Connect production server

---

## 📁 Scripts Overview

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-ssh.sh` | Configure SSH access (run once) | `./setup-ssh.sh` |
| `restart-nextjs.sh` | Restart Next.js application | `./restart-nextjs.sh` |
| `status.sh` | Check all service statuses | `./status.sh` |
| `connect.sh` | Open SSH session | `./connect.sh` |
| `exec.sh` | Execute remote commands | `./exec.sh <command>` |
| `logs.sh` | View service logs | `./logs.sh <service>` |
| `config.sh` | Centralized configuration | _(sourced by other scripts)_ |

---

## 🚀 Quick Start

### 1. First-Time Setup

Run the setup wizard to configure SSH access:

```bash
./scripts/server/setup-ssh.sh
```

This will:
- Check if SSH keys exist
- Configure `~/.ssh/config` with server details
- Test SSH connection
- Verify server environment

### 2. Restart Next.js (Immediate Need)

After HTTPS setup, Next.js needs to be restarted:

```bash
./scripts/server/restart-nextjs.sh
```

**Options**:
- **PM2** (recommended): Production-ready process manager with auto-restart
- **npm + nohup**: Simple background process

**PM2 advantages**:
- Auto-restart on crashes
- Survives SSH disconnects
- Built-in log management
- Can start on server boot

### 3. Check Server Status

```bash
./scripts/server/status.sh
```

**Shows**:
- ✅ Next.js (port 3000)
- ✅ Nginx (ports 80/443)
- ✅ PostgreSQL (port 5432)
- ✅ Redis Cache (port 6379)
- ✅ Redis Queue (port 6380)
- ✅ SSL Certificate status
- ✅ System resources (CPU, memory, disk)

---

## 📖 Detailed Usage

### SSH Configuration (`setup-ssh.sh`)

**Purpose**: One-time SSH configuration wizard

**What it does**:
1. Creates `~/.ssh/config` entry for `connect-server`
2. Configures SSH key authentication
3. Tests connection and sudo access
4. Verifies server environment

**Example**:
```bash
./scripts/server/setup-ssh.sh

# Follow the prompts:
# - Choose existing SSH key or generate new one
# - Test connection
# - Verify sudo access
```

**SSH Config Created**:
```
Host connect-server
    HostName 221.164.102.253
    User paul
    IdentityFile ~/.ssh/id_rsa
    StrictHostKeyChecking yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

---

### Restart Next.js (`restart-nextjs.sh`)

**Purpose**: Restart the Next.js application on the production server

**Interactive prompts**:
- If Next.js is running: Choose restart method (PM2 or npm)
- If Next.js is stopped: Choose start method (PM2 or npm)
- If PM2 not installed: Offer to install

**PM2 Mode** (Recommended):
```bash
./scripts/server/restart-nextjs.sh
# Choose option 1 (PM2)

# Verifies:
# ✅ Next.js running on port 3000
# ✅ Health check passes
# ✅ PM2 process active
```

**npm Mode** (Simple):
```bash
./scripts/server/restart-nextjs.sh
# Choose option 2 (npm + nohup)

# Note: Process stops when SSH session ends
```

---

### Check Status (`status.sh`)

**Purpose**: Check all service statuses and system resources

**Example**:
```bash
./scripts/server/status.sh

# Output:
# Next.js (port 3000): ✅ RUNNING (PID: 12345)
#   PM2: status online, uptime 2h
#
# Nginx (ports 80/443): ✅ RUNNING
#   ✓ HTTP (80) and HTTPS (443) listening
#
# PostgreSQL (port 5432): ✅ RUNNING
#   Version: 15.3
#
# Redis Cache (port 6379): ✅ RUNNING
#   Memory: 45.2M
#
# System Resources:
# CPU Usage: 24%
# Memory Usage: 38%
# Disk Usage: 42%
```

**Color Coding**:
- 🟢 **Green**: Service running, resource usage <70%
- 🟡 **Yellow**: Warning, resource usage 70-85%
- 🔴 **Red**: Stopped or resource usage >85%

---

### SSH Connection (`connect.sh`)

**Purpose**: Open an interactive SSH session

**Example**:
```bash
./scripts/server/connect.sh

# Opens SSH session at: /opt/connect
# Exit with: exit or Ctrl+D
```

**What it does**:
1. Checks SSH connection
2. Opens interactive session
3. Navigates to project directory (`/opt/connect`)

---

### Execute Commands (`exec.sh`)

**Purpose**: Execute arbitrary commands on the server from your local machine

**Syntax**:
```bash
./scripts/server/exec.sh "<command>"
```

**Examples**:

**Check if Next.js is running**:
```bash
./scripts/server/exec.sh "lsof -i :3000"
```

**Test health endpoint**:
```bash
./scripts/server/exec.sh "curl http://localhost:3000/api/health"
```

**Check Nginx configuration**:
```bash
./scripts/server/exec.sh "sudo nginx -t"
```

**View PM2 status**:
```bash
./scripts/server/exec.sh "pm2 status"
```

**Check disk space**:
```bash
./scripts/server/exec.sh "df -h /opt/connect"
```

**View SSL certificate**:
```bash
./scripts/server/exec.sh "sudo certbot certificates"
```

---

### View Logs (`logs.sh`)

**Purpose**: View logs for various services

**Syntax**:
```bash
./scripts/server/logs.sh <service> [lines]
```

**Available Services**:
- `nextjs` - Next.js application logs (PM2 or nohup)
- `nginx` - Nginx error logs
- `nginx-access` - Nginx access logs
- `postgres` - PostgreSQL logs
- `certbot` - SSL certificate renewal logs
- `system` - System logs (journalctl)

**Examples**:

**View Next.js logs (last 50 lines)**:
```bash
./scripts/server/logs.sh nextjs
```

**View Nginx errors (last 100 lines)**:
```bash
./scripts/server/logs.sh nginx 100
```

**View Nginx access logs (last 200 lines)**:
```bash
./scripts/server/logs.sh nginx-access 200
```

**View SSL renewal logs**:
```bash
./scripts/server/logs.sh certbot
```

**View system logs**:
```bash
./scripts/server/logs.sh system 50
```

**Live monitoring** (use exec.sh for `-f` flag):
```bash
./scripts/server/exec.sh "pm2 logs connect"
./scripts/server/exec.sh "sudo tail -f /var/log/nginx/error.log"
```

---

## 🔧 Configuration

All scripts source `config.sh` for centralized configuration.

**Key Variables**:
```bash
# SSH Configuration
SSH_HOST="connect-server"        # Host alias from ~/.ssh/config
SSH_USER="paul"                  # Server username
SSH_IP="221.164.102.253"        # Server IP address

# Remote Paths
REMOTE_PROJECT_PATH="/opt/connect"
REMOTE_LOG_PATH="/opt/connect/logs"
REMOTE_NGINX_LOG_PATH="/var/log/nginx"

# Service Names
SERVICE_NEXTJS="connect"         # PM2 process name
SERVICE_NGINX="nginx"
SERVICE_CERTBOT="certbot.timer"

# Ports
PORT_NEXTJS="3000"
PORT_NGINX_HTTP="80"
PORT_NGINX_HTTPS="443"
PORT_POSTGRES="5432"
PORT_REDIS_CACHE="6379"
PORT_REDIS_QUEUE="6380"
```

**To modify configuration**:
```bash
# Edit config file
nano scripts/server/config.sh

# Changes affect all scripts
```

---

## 🔒 Security

### SSH Key Authentication
- Scripts use SSH key authentication (no passwords)
- Keys managed via `~/.ssh/config`
- `StrictHostKeyChecking yes` prevents MITM attacks

### Passwordless Sudo
Some operations require sudo. To configure passwordless sudo:

```bash
# SSH to server
ssh connect-server

# Edit sudoers file
sudo visudo

# Add line (replace 'paul' with your username)
paul ALL=(ALL) NOPASSWD:ALL

# Save and exit
```

### Connection Testing
All scripts check SSH connection before executing commands:
```bash
if ! check_ssh_connection; then
    error_exit "Cannot connect. Please run setup-ssh.sh first."
fi
```

---

## 🧪 Testing

### Test SSH Connection
```bash
./scripts/server/exec.sh "echo 'Connection successful'"
```

### Test Sudo Access
```bash
./scripts/server/exec.sh "sudo -n true && echo 'Sudo OK'"
```

### Test Service Detection
```bash
./scripts/server/status.sh
```

---

## 🚨 Troubleshooting

### Problem: "Cannot connect to connect-server"

**Solution**:
```bash
# Run setup wizard
./scripts/server/setup-ssh.sh

# Or manually test SSH
ssh connect-server
```

### Problem: "Permission denied (publickey)"

**Solution**:
```bash
# Copy SSH key to server
ssh-copy-id -i ~/.ssh/id_rsa paul@221.164.102.253

# Or add key manually on server
cat ~/.ssh/id_rsa.pub | ssh paul@221.164.102.253 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Problem: "Next.js won't start"

**Check logs**:
```bash
./scripts/server/logs.sh nextjs

# Or
./scripts/server/exec.sh "pm2 logs connect --lines 100"
```

**Check port availability**:
```bash
./scripts/server/exec.sh "lsof -i :3000"
```

**Check project directory**:
```bash
./scripts/server/exec.sh "ls -la /opt/connect"
```

### Problem: "PM2 not found"

**Solution**:
```bash
# Install PM2 globally
./scripts/server/exec.sh "sudo npm install -g pm2"
```

---

## 📋 Common Workflows

### Workflow 1: Deploy and Restart

```bash
# 1. Deploy code (via git or rsync)
./scripts/server/exec.sh "cd /opt/connect && git pull"

# 2. Install dependencies
./scripts/server/exec.sh "cd /opt/connect && npm install"

# 3. Build application
./scripts/server/exec.sh "cd /opt/connect && npm run build"

# 4. Restart Next.js
./scripts/server/restart-nextjs.sh

# 5. Check status
./scripts/server/status.sh
```

### Workflow 2: Troubleshoot Issues

```bash
# 1. Check service status
./scripts/server/status.sh

# 2. View logs
./scripts/server/logs.sh nextjs 100
./scripts/server/logs.sh nginx 100

# 3. Check system resources
./scripts/server/exec.sh "top -bn1 | head -20"

# 4. Check disk space
./scripts/server/exec.sh "df -h"

# 5. Check network connectivity
./scripts/server/exec.sh "netstat -tulpn | grep LISTEN"
```

### Workflow 3: Monitor Production

```bash
# Check everything at once
./scripts/server/status.sh

# Live monitoring
./scripts/server/exec.sh "pm2 monit"

# Check recent errors
./scripts/server/logs.sh nginx 50
./scripts/server/logs.sh nextjs 50
```

---

## 🔗 Related Scripts

These scripts complement the existing deployment scripts:

**Existing Deployment Scripts**:
- `scripts/deploy.sh` - Zero-downtime Docker deployment
- `scripts/rollback.sh` - Emergency rollback
- `scripts/backup.sh` - Automated backups
- `scripts/health-monitor.sh` - System health monitoring
- `scripts/failover.sh` - Hot standby failover (Jan-Mar)

**When to use which**:
- Use **server scripts** for quick operational tasks (restart, check status, view logs)
- Use **deployment scripts** for full deployments and production operations

---

## 📚 Additional Resources

**SSH Documentation**:
- SSH Config: `man ssh_config`
- SSH Keys: `man ssh-keygen`

**PM2 Documentation**:
- Official docs: https://pm2.keymetrics.io/docs/usage/quick-start/
- Process management: `pm2 --help`

**Server Management**:
- Nginx: `nginx -h`
- Systemctl: `man systemctl`
- Journalctl: `man journalctl`

---

## 🐛 Known Issues

**Issue**: Scripts fail if ~/.ssh/config doesn't exist
**Status**: Fixed - setup-ssh.sh creates it automatically

**Issue**: PM2 startup command varies by OS
**Status**: Handled - restart-nextjs.sh runs `pm2 startup` and follows output

---

## 📝 Changelog

### v1.0.0 (October 11, 2025)
- Initial release
- 7 operational scripts created
- SSH configuration wizard
- Next.js restart with PM2 support
- Comprehensive status checking
- Log viewing for all services

---

## 💬 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs: `./scripts/server/logs.sh <service>`
3. Check server status: `./scripts/server/status.sh`

---

**Ready to use!** Start with `./scripts/server/setup-ssh.sh` if this is your first time. 🚀
