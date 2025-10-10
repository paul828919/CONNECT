#!/bin/bash

# 🐳 Docker Setup Guide for macOS
# This script checks Docker status and provides installation guidance

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 Docker Setup Check for Connect Platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker is installed
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed: $(docker --version)"
    echo ""
    
    # Check if Docker daemon is running
    if docker ps &> /dev/null 2>&1; then
        echo "✅ Docker daemon is running"
        echo ""
        echo "🎯 You're ready to launch! Run:"
        echo "   bash quick-start.sh"
    else
        echo "⚠️  Docker is installed but daemon is not running"
        echo ""
        echo "📋 To fix:"
        echo "   1. Open Docker Desktop application"
        echo "   2. Wait for Docker to start (whale icon in menu bar)"
        echo "   3. Then run: bash quick-start.sh"
    fi
else
    echo "❌ Docker is not installed"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 OPTION 1: Docker Desktop (Recommended)"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "1. Download Docker Desktop for Mac:"
    echo "   https://www.docker.com/products/docker-desktop/"
    echo ""
    echo "2. Install the .dmg file"
    echo ""
    echo "3. Open Docker Desktop"
    echo ""
    echo "4. Wait for Docker to start (whale icon appears in menu bar)"
    echo ""
    echo "5. Return here and run: bash quick-start.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📦 OPTION 2: Homebrew Installation"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "If you prefer command-line installation:"
    echo ""
    echo "1. Install via Homebrew:"
    echo "   brew install --cask docker"
    echo ""
    echo "2. Open Docker Desktop from Applications"
    echo ""
    echo "3. Wait for Docker to start"
    echo ""
    echo "4. Return here and run: bash quick-start.sh"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎯 Why Docker Desktop?"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "✅ Matches production environment exactly"
    echo "✅ All deployment scripts work seamlessly"
    echo "✅ Resource limits enforced (CPU, memory)"
    echo "✅ Network isolation for security"
    echo "✅ Zero-downtime deployments tested locally"
    echo ""
    echo "Your production architecture (Deployment_Architecture_v3.md)"
    echo "is 100% Docker-based. Development MUST match production!"
    echo ""
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
