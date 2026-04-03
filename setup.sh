#!/bin/bash
# ═══════════════════════════════════════════════════
# MigiSignals — Server Deployment Script v2
# Deploys backend engine + nginx WSS proxy via Docker
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

    DEPLOY_DIR=$(mktemp -d)
    # Copy backend source
    cp -r backend "$DEPLOY_DIR/backend"
    # Copy nginx config
    cp -r nginx "$DEPLOY_DIR/nginx"
    # Copy compose file
    cp docker-compose.yml "$DEPLOY_DIR/"

    # Create production .env
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
    ssh "$SERVER_USER@$SERVER_IP" "mkdir -p $PROJECT_DIR && rm -rf $PROJECT_DIR/backend $PROJECT_DIR/nginx $PROJECT_DIR/docker-compose.yml"
    scp -r "$DEPLOY_DIR"/* "$SERVER_USER@$SERVER_IP:$PROJECT_DIR/"

    echo "[3/5] 🐳 Installing and starting containers..."
    ssh "$SERVER_USER@$SERVER_IP" "
      command -v docker > /dev/null 2>&1 || { curl -fsSL https://get.docker.com | sh; }
      command -v docker-compose > /dev/null 2>&1 || docker compose version > /dev/null 2>&1 || { apt-get update && apt-get install -y docker-compose-plugin; }
      cd $PROJECT_DIR
      docker compose down 2>/dev/null || true
      docker compose up -d --build
      sleep 5
      docker ps --filter name=migi
    "

    echo ""
    echo "╔══════════════════════════════════════════════════╗"
    echo "║   ✅ MigiSignals deployed successfully!          ║"
    echo "║                                                  ║"
    echo "║   🌐 Vercel (Live + Connected):                  ║"
    echo "║      https://migisignals.vercel.app              ║"
    echo "║   🖥️  Self-hosted (HTTP fallback):               ║"
    echo "║      http://$SERVER_IP:3030                      ║"
    echo "║   🔒 WSS Proxy:                                  ║"
    echo "║      wss://$SERVER_IP/ws                         ║"
    echo "╚══════════════════════════════════════════════════╝"

    # Cleanup
    rm -rf "$DEPLOY_DIR"
    ;;

  stop)
    echo "Stopping MigiSignals on server..."
    ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose down"
    echo "✅ Stopped."
    ;;

  logs)
    SERVICE="${2:-migi-engine}"
    ssh "$SERVER_USER@$SERVER_IP" "cd $PROJECT_DIR && docker compose logs -f --tail 50 $SERVICE"
    ;;

  status)
    ssh "$SERVER_USER@$SERVER_IP" "docker ps --filter name=migi --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    ;;

  cert-trust)
    echo "Opening browser to trust the self-signed cert..."
    echo "Visit: https://$SERVER_IP"
    echo "Click Advanced → Proceed to accept the self-signed certificate."
    echo "After that, wss://$SERVER_IP/ws will work without browser blocks."
    ;;

  *)
    echo "Usage: $0 {deploy|stop|logs [service]|status|cert-trust}"
    exit 1
    ;;
esac
