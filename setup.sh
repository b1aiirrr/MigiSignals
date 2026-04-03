#!/bin/bash
# ═══════════════════════════════════════════════
# MigiSignals — Server Deployment Script
# ═══════════════════════════════════════════════

set -e

# Configuration — Update these values
SERVER_IP="${MIGI_SERVER_IP:-your-server-ip}"
SERVER_USER="${MIGI_SERVER_USER:-root}"
SERVER_PORT="${MIGI_SSH_PORT:-22}"
DEPLOY_DIR="/opt/migi-signals"

echo "╔══════════════════════════════════════════════╗"
echo "║   MigiSignals — Deployment                  ║"
echo "╚══════════════════════════════════════════════╝"

# Check if running locally or deploying
if [ "$1" == "local" ]; then
    echo "🏠 Running locally..."
    
    # Backend
    cd backend
    npm install
    npx prisma generate
    npx prisma db push
    npm run dev &
    BACKEND_PID=$!
    
    # Frontend
    cd ../frontend
    npm install
    npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo "✅ MigiSignals is running!"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend WS: ws://localhost:8080"
    echo ""
    echo "Press Ctrl+C to stop..."
    
    trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
    wait
    
elif [ "$1" == "deploy" ]; then
    echo "🚀 Deploying to ${SERVER_USER}@${SERVER_IP}..."
    
    # Create deployment archive
    echo "📦 Creating deployment package..."
    tar -czf /tmp/migi-deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='dist' \
        --exclude='*.db' \
        backend/ docker-compose.yml .env.example
    
    # Upload to server
    echo "📤 Uploading to server..."
    scp -P ${SERVER_PORT} /tmp/migi-deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:/tmp/
    
    # Deploy on server
    echo "🔧 Deploying on server..."
    ssh -p ${SERVER_PORT} ${SERVER_USER}@${SERVER_IP} << 'REMOTE'
        mkdir -p /opt/migi-signals
        cd /opt/migi-signals
        tar -xzf /tmp/migi-deploy.tar.gz
        
        # Copy env if not exists
        if [ ! -f .env ]; then
            cp .env.example .env
            echo "⚠️  Edit .env with your API token: nano /opt/migi-signals/.env"
        fi
        
        # Install Docker if not present
        if ! command -v docker &> /dev/null; then
            curl -fsSL https://get.docker.com | sh
        fi
        
        # Build and start
        docker compose down 2>/dev/null || true
        docker compose up -d --build
        
        echo "✅ MigiSignals Engine deployed!"
        echo "   WebSocket: ws://$(hostname -I | awk '{print $1}'):8080"
REMOTE
    
    echo ""
    echo "✅ Deployment complete!"
    rm -f /tmp/migi-deploy.tar.gz
    
else
    echo "Usage:"
    echo "  ./setup.sh local    # Run locally for development"
    echo "  ./setup.sh deploy   # Deploy to server via SSH"
    echo ""
    echo "Environment variables:"
    echo "  MIGI_SERVER_IP    Server IP address"
    echo "  MIGI_SERVER_USER  SSH user (default: root)"
    echo "  MIGI_SSH_PORT     SSH port (default: 22)"
fi
