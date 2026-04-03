#!/bin/sh
# ─── MigiSignals Nginx WSS Proxy — Entrypoint ───
# Generates a self-signed SSL cert if one doesn't exist, then starts nginx

set -e

SSL_DIR="/etc/nginx/ssl"
mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/cert.pem" ]; then
  echo "[nginx-proxy] Generating self-signed SSL certificate..."
  openssl req -x509 -nodes -days 3650 \
    -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out    "$SSL_DIR/cert.pem" \
    -subj   "/C=KE/ST=Nairobi/L=Nairobi/O=MigiSignals/OU=Trading/CN=134.122.102.195"
  echo "[nginx-proxy] ✅ SSL certificate generated."
fi

echo "[nginx-proxy] Starting nginx WSS reverse proxy on :443..."
exec nginx -g "daemon off;"
