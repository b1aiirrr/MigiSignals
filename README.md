# 🟢 MigiSignals — High-Performance Trading Engine

<div align="center">

**Real-time trading signal analysis & automation for Deriv synthetic indices**

*Powered by the Migi-Logic statistical reversion algorithm*

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2014-black?style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Backend-TypeScript-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Deriv API](https://img.shields.io/badge/API-Deriv%20WebSocket-red?style=flat-square)](https://api.deriv.com/)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?style=flat-square)](https://www.docker.com/)

</div>

---

## 📋 Overview

MigiSignals is a cyberpunk-themed trading automation platform that analyzes Volatility 10 (1s) tick data in real-time and generates Even/Odd digit trading signals using a multi-layered analysis engine.

### Key Features

- **🔌 Real-time WebSocket** — Sub-second tick streaming from Deriv API
- **🧠 Migi-Logic Algorithm** — Statistical reversion + streak detection + momentum filtering
- **📊 Cyberpunk Dashboard** — Neon-lit real-time charts, probability bars, and signal strength meter
- **🎮 Simulator Mode** — Test strategies without risking real funds
- **💰 Martingale Risk Management** — Automated stake progression with hard stop-loss
- **🗄️ Trade Logging** — SQLite database for performance tracking
- **🐳 Docker Deployment** — One-command server deployment

---

## 🏗️ Architecture

```
Frontend (Next.js 14)  ←→  Backend (Node.js/TypeScript)  ←→  Deriv WebSocket API
     Port 3000                    Port 8080                    wss://ws.derivws.com
```

### The "Supreme" Analysis Checker

The engine runs 3 analysis layers on every tick:

1. **Digit Frequency Analyzer** — Tracks last 100 ticks, calculates Even/Odd split percentage
2. **Momentum Filter** — 5-tick SMA detects micro-trend direction for digit clustering
3. **Migi-Logic Algorithm** — Fires signals based on statistical reversion:
   - `EVEN` signal: Last 3 digits were all Odd AND Even frequency < 45%
   - `ODD` signal: Last 3 digits were all Even AND Odd frequency < 45%
   - Confidence score = frequency deviation + streak length + momentum alignment

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- A [Deriv](https://deriv.com) account with API token (Trade + Read scopes)

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/migi-signals-core.git
cd migi-signals-core

# Backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Frontend
cd ../frontend
npm install
```

### 2. Configure

```bash
# Copy and edit environment config
cp .env.example backend/.env
```

Edit `backend/.env`:
```
DERIV_API_TOKEN=your_deriv_api_token_here
DERIV_APP_ID=1089
SIMULATOR_MODE=true
```

### 3. Run

```bash
# Terminal 1 — Backend Engine
cd backend
npm run dev

# Terminal 2 — Frontend Dashboard
cd frontend
npm run dev
```

Open **http://localhost:3000** — your MigiSignals dashboard is live! 🎉

---

## 🐳 Docker Deployment

```bash
# Create .env from template
cp .env.example .env
# Edit .env with your API token

# Build and run
docker compose up -d --build
```

### Remote Server Deployment

```bash
export MIGI_SERVER_IP=your.server.ip
export MIGI_SERVER_USER=root
./setup.sh deploy
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `DERIV_API_TOKEN` | — | Your Deriv API token |
| `DERIV_APP_ID` | `1089` | Deriv application ID |
| `DERIV_SYMBOL` | `1HZ10V` | Trading symbol (Vol 10 1s) |
| `BASE_STAKE` | `1.00` | Starting stake in USD |
| `TARGET_PROFIT` | `50` | Stop when profit reaches $ |
| `STOP_LOSS` | `20` | Stop when loss reaches $ |
| `MAX_CONSECUTIVE_LOSSES` | `7` | Emergency stop after N losses |
| `SIMULATOR_MODE` | `true` | Run without real trades |
| `WS_PORT` | `8080` | Backend WebSocket port |

---

## ⚠️ Disclaimer

> **This software is for educational purposes only.** Trading synthetic indices carries significant risk. The Martingale strategy can lead to rapid capital depletion. Always test in Simulator Mode first. Never trade with money you cannot afford to lose.

---

## 📄 License

MIT License — Free to fork, modify, and deploy.

---

<div align="center">
  <sub>Built with ⚡ by MigiSignals</sub>
</div>
