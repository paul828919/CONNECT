#!/bin/bash

# 🔧 Redis Management (No Docker)
# Simple start/stop/status for native Redis

ACTION=$1

case $ACTION in
  start)
    echo "🚀 Starting Redis services..."
    
    # Create directories
    mkdir -p /tmp/redis-cache
    mkdir -p /tmp/redis-queue
    
    # Start Redis Cache (port 6379)
    redis-server --port 6379 --maxmemory 512mb --maxmemory-policy allkeys-lru --daemonize yes --dir /tmp/redis-cache --logfile /tmp/redis-cache.log
    
    # Start Redis Queue (port 6380)
    redis-server --port 6380 --appendonly yes --daemonize yes --dir /tmp/redis-queue --logfile /tmp/redis-queue.log
    
    sleep 1
    
    # Check status
    if redis-cli -p 6379 ping > /dev/null 2>&1 && redis-cli -p 6380 ping > /dev/null 2>&1; then
        echo "✅ Redis Cache running on port 6379"
        echo "✅ Redis Queue running on port 6380"
    else
        echo "❌ Failed to start Redis"
        exit 1
    fi
    ;;
    
  stop)
    echo "🛑 Stopping Redis services..."
    pkill -f redis-server
    echo "✅ Redis stopped"
    ;;
    
  restart)
    echo "🔄 Restarting Redis services..."
    pkill -f redis-server || true
    sleep 2
    
    mkdir -p /tmp/redis-cache
    mkdir -p /tmp/redis-queue
    
    redis-server --port 6379 --maxmemory 512mb --maxmemory-policy allkeys-lru --daemonize yes --dir /tmp/redis-cache --logfile /tmp/redis-cache.log
    redis-server --port 6380 --appendonly yes --daemonize yes --dir /tmp/redis-queue --logfile /tmp/redis-queue.log
    
    sleep 1
    
    if redis-cli -p 6379 ping > /dev/null 2>&1 && redis-cli -p 6380 ping > /dev/null 2>&1; then
        echo "✅ Redis restarted successfully"
    else
        echo "❌ Failed to restart Redis"
        exit 1
    fi
    ;;
    
  status)
    echo "📊 Redis Status:"
    echo ""
    
    # Check Cache
    if redis-cli -p 6379 ping > /dev/null 2>&1; then
        echo "✅ Redis Cache (6379): Running"
        INFO=$(redis-cli -p 6379 info memory | grep used_memory_human)
        echo "   $INFO"
    else
        echo "❌ Redis Cache (6379): Not running"
    fi
    
    # Check Queue
    if redis-cli -p 6380 ping > /dev/null 2>&1; then
        echo "✅ Redis Queue (6380): Running"
        INFO=$(redis-cli -p 6380 info memory | grep used_memory_human)
        echo "   $INFO"
    else
        echo "❌ Redis Queue (6380): Not running"
    fi
    
    echo ""
    
    # Check for processes
    PROCESSES=$(pgrep -f redis-server | wc -l)
    echo "Redis processes: $PROCESSES"
    ;;
    
  logs)
    echo "📋 Redis Logs:"
    echo ""
    echo "=== Cache Log (last 20 lines) ==="
    tail -20 /tmp/redis-cache.log 2>/dev/null || echo "No log file"
    echo ""
    echo "=== Queue Log (last 20 lines) ==="
    tail -20 /tmp/redis-queue.log 2>/dev/null || echo "No log file"
    ;;
    
  *)
    echo "Usage: bash redis-manager.sh {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start    - Start Redis services"
    echo "  stop     - Stop all Redis services"
    echo "  restart  - Restart Redis services"
    echo "  status   - Check Redis status"
    echo "  logs     - View Redis logs"
    exit 1
    ;;
esac
