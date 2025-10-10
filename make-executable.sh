#!/bin/bash

# Make all scripts executable
chmod +x check-status.sh
chmod +x launch-scraper.sh
chmod +x quick-start.sh
chmod +x quick-start-no-docker.sh
chmod +x redis-manager.sh
chmod +x install-docker-guide.sh

echo "✅ All scripts are now executable!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 NEXT STEP: Check Docker Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run this to check if Docker is installed:"
echo ""
echo "   bash install-docker-guide.sh"
echo ""
echo "This will tell you:"
echo "  • Is Docker installed?"
echo "  • Is Docker running?"
echo "  • How to install if needed"
echo "  • Which script to run next"
echo ""
