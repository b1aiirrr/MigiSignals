#!/bin/bash
# ═══════════════════════════════════════════════════
# MigiSignals — Server Deployment Script
# Deploy backend engine to a remote server via Docker
# ═══════════════════════════════════════════════════

set -e

SERVER_IP="${MIGI_SERVER_IP:-134.122.102.195}"
SERVER_USER="${MIGI_SERVER_USER:-root}"
PROJECT_DIR="/opt/migi-signals"

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   MigiSignals — Server Deployment   ║"
echo "║   Target: $SERVER_USER@$SERVER_IP   ║"
echo "╚══════════════════════════════════════╝"
echo ""

case "${1:-deploy}" in
  deploy)
    echo "[1/5] 📦 Preparing files..."
    
    # Create a temp directory for deployment files
    DEPLOY_DIR=$(mktemp -d)
    cp -r backend/* "$DEPLOY_DIR/"
    cp docker-compose.yml "$DEPLOY_DIR/"
    
    # Create production .env file
    cat > "$DEPLOY_DIR/.env" << EOF
DERIV_API_TOKEN=${DERIV_API_TOKEN:-dtdKweBaSNLmXmw}
DERIV_APP_ID=${DERIV_APP_ID:-1089}
DERIV_SYMBOL=${DERIV_SYMBOL:-1HZ10V}
WS_PORT=8080
BASE_STAKE=${BASE_STAKE:-1.00}
TARGET_PROFIT=${TARGET_PROFIT:-50}
STOP_LOSS=${STOP_LOSS:-20}
MAX_CONSECUTIVE_LOSSES=${MAX_CONSECUTIVE_LOSSES:-7}
SIMULATOR_MODE=${SIMULATOR_MODE:-true}
DATABASE_URL=file:./data/migi.db
EOF

    echo "[2/5] 🚀 Uploading to server..."
    ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $PROJECT_DIR"
    rsync -avz --delete --exclude 'node_modules' --exclude '.git' "$DEPLOY_DIR/" "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/"
    
    echo "[3/5] 🐳 Installing Docker (if needed)..."
    ssh "$SERVER_USER@$SERVER_IP" "command -v docker >/dev/null 2>&1 || { curl -fsSL https://get.docker.com | sh; }"
    ssh "$SERVER_USER@$SERVER_IP" "command -v docker-compose >/dev/null 2>&1 || docker compose version >/dev/null 2>&1 || { apt-get update && apt-get install -y docker-compose-plugin; }"
    
    echo "[4/5] 🔨 Building and starting container..."
    ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose down 2>/dev/null || true"
    ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose up -d --build"
    
    echo "[5/5] ✅ Verifying deployment..."
    sleep 5
    ssh "$SERVER_USER@$SERVER_IP" "docker ps --filter name=migi-signals-engine --format '{{.Status}}'"
    
    echo ""
    echo "╔══════════════════════════════════════╗"
    echo "║   ✅ Backend deployed successfully!  ║"
    echo "║   WS: ws://$SERVER_IP:8080           ║"
    echo "╚══════════════════════════════════════╝"
    
    # Cleanup
    rm -rf "$DEPLOY_DIR"
    ;;
    
  stop)
    echo "Stopping MigiSignals on server..."
    ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose down"
    echo "✅ Stopped."
    ;;
    
  logs)
    ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose logs -f --tail 50"
    ;;
    
  status)
    ssh "$SERVER_USER@$SERVER_IP" "docker ps --filter name=migi-signals-engine"
    ;;
    
  *)
    echo "Usage: $0 {deploy|stop|logs|status}"
    exit 1
    ;;
esac
