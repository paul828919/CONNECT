#!/bin/bash
# Quick verification script to check if OAuth fix is working

SERVER="user@59.21.170.6"
SSHPASS="iw237877^^"

echo "🔍 Checking Prisma Client in production..."
echo ""

sshpass -p "$SSHPASS" ssh -o StrictHostKeyChecking=no "$SERVER" << 'EOF'
    cd /opt/connect
    
    echo "=== Prisma Client Model Check ==="
    docker exec connect_app1 node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('\$'));
        console.log('✓ Available models:', models.join(', '));
        console.log('');
        console.log('Critical models:');
        console.log('  account:', typeof prisma.account !== 'undefined' ? '✓ EXISTS' : '✗ MISSING');
        console.log('  user:', typeof prisma.user !== 'undefined' ? '✓ EXISTS' : '✗ MISSING');
        console.log('  session:', typeof prisma.session !== 'undefined' ? '✓ EXISTS' : '✗ MISSING');
    " 2>&1
    
    echo ""
    echo "=== Recent Logs (last 30 lines) ==="
    docker compose -f docker-compose.production.yml logs --tail=30 app1 | grep -A 5 -B 5 -i "error\|prisma\|account" || echo "No errors found in recent logs"
EOF

echo ""
echo "=== OAuth URL Check ==="
echo "Naver OAuth: https://connectplt.kr/api/auth/signin/naver"
echo "Kakao OAuth: https://connectplt.kr/api/auth/signin/kakao"
echo ""
echo "💡 Try logging in at: https://connectplt.kr"
