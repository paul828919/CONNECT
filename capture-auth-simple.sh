#!/bin/bash

echo "🔐 Simple Authentication Capture"
echo "================================"
echo ""
echo "INSTRUCTIONS:"
echo "1. A browser will open to https://connectplt.kr"
echo "2. If not logged in, click Kakao/Naver and log in"
echo "3. Once you see the dashboard, close the browser window"
echo "4. The script will automatically save your session"
echo ""
echo "Press ENTER to start..."
read

# Create .playwright directory
mkdir -p .playwright

# Use Playwright codegen to capture session
npx playwright codegen \
  --save-storage=.playwright/paul-auth.json \
  --target=javascript \
  https://connectplt.kr/dashboard

echo ""
echo "✅ Session saved to .playwright/paul-auth.json"
echo ""
echo "Next steps:"
echo "  npm run test:e2e:auth-verify"
