#!/bin/bash

SSH_KEY="${HOME}/.ssh/id_ed25519_connect"
SERVER_IP="221.164.102.253"
SERVER_USER="user"

echo "🔐 Testing SSH Connection..."
echo ""

# Test 1: Basic connection
echo "1️⃣ Testing basic SSH connection..."
if ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SERVER_USER@$SERVER_IP" 'echo "Connection successful!"'; then
    echo "✅ SSH connection works!"
else
    echo "❌ SSH connection failed!"
    exit 1
fi

echo ""

# Test 2: Docker access
echo "2️⃣ Testing Docker access..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" 'docker ps' &>/dev/null; then
    echo "✅ Docker access works!"
else
    echo "❌ Docker access failed!"
    exit 1
fi

echo ""

# Test 3: Project directory
echo "3️⃣ Testing project directory..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "test -d /opt/connect && test -w /opt/connect"; then
    echo "✅ Project directory accessible and writable!"
else
    echo "⚠️  Creating project directory..."
    ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "sudo mkdir -p /opt/connect && sudo chown $SERVER_USER:$SERVER_USER /opt/connect"
    echo "✅ Project directory created!"
fi

echo ""

# Test 4: Environment file
echo "4️⃣ Testing environment file..."
if ssh -i "$SSH_KEY" "$SERVER_USER@$SERVER_IP" "test -f /opt/connect/.env"; then
    echo "✅ Environment file exists!"
else
    echo "⚠️  No .env file found (will be created during deployment)"
fi

echo ""
echo "✅ All SSH tests passed!"

