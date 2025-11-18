#!/bin/bash
# Complete health check deployment with all fixes

export CONNECT_SERVER_PASSWORD='iw237877^^'

echo "🚀 Deploying complete health check fix..."
echo ""

echo "Step 1/4: Uploading fixed health endpoint..."
sshpass -p "$CONNECT_SERVER_PASSWORD" scp app/api/health/route.ts user@59.21.170.6:/opt/connect/app/api/health/route.ts
echo "✅ Done"
echo ""

echo "Step 2/4: Uploading fixed docker-compose..."
sshpass -p "$CONNECT_SERVER_PASSWORD" scp docker-compose.production.yml user@59.21.170.6:/opt/connect/docker-compose.production.yml
echo "✅ Done"
echo ""

echo "Step 3/4: Rebuilding containers..."
sshpass -p "$CONNECT_SERVER_PASSWORD" ssh user@59.21.170.6 "cd /opt/connect && docker-compose -f docker-compose.production.yml build app1 app2"
echo "✅ Done"
echo ""

echo "Step 4/4: Rolling restart (zero downtime)..."
sshpass -p "$CONNECT_SERVER_PASSWORD" ssh user@59.21.170.6 "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --no-deps app1"
echo "⏳ Waiting 15 seconds for app1 to start..."
sleep 15
sshpass -p "$CONNECT_SERVER_PASSWORD" ssh user@59.21.170.6 "cd /opt/connect && docker-compose -f docker-compose.production.yml up -d --no-deps app2"
echo "✅ Done"
echo ""

echo "⏳ Waiting 15 seconds for apps to fully initialize..."
sleep 15

echo ""
echo "🧪 Testing health endpoint..."
sshpass -p "$CONNECT_SERVER_PASSWORD" ssh user@59.21.170.6 "docker exec connect_app1 curl -s http://172.25.0.21:3001/api/health" | jq
echo ""

echo "✅ Deployment complete!"
echo ""
echo "Run './scripts/check-health.sh' to verify all systems"

