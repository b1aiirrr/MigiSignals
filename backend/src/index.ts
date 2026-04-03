// ─── MigiSignals Engine — Main Entry Point ───
// Orchestrates all subsystems: Deriv client, analysis engine, trade executor, and WS server

import dotenv from 'dotenv';
dotenv.config();

import { DerivClient } from './deriv/client';
import { TradeExecutor } from './deriv/trader';
import { AnalysisEngine } from './analysis/engine';
import { MartingaleRiskManager } from './risk/martingale';
import { FrontendWSServer } from './ws/server';
import prisma from './db/prisma';
import { BotConfig, BotStatus, TickData, AnalysisResult, TradeExecution } from './types';

// ─── Configuration ───
const config: BotConfig = {
  derivApiToken: process.env.DERIV_API_TOKEN || '',
  derivAppId: process.env.DERIV_APP_ID || '1089',
  symbol: process.env.DERIV_SYMBOL || '1HZ10V',
  wsPort: parseInt(process.env.WS_PORT || '8080', 10),
  baseStake: parseFloat(process.env.BASE_STAKE || '1.00'),
  targetProfit: parseFloat(process.env.TARGET_PROFIT || '50'),
  stopLoss: parseFloat(process.env.STOP_LOSS || '20'),
  maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '7', 10),
  simulatorMode: process.env.SIMULATOR_MODE !== 'false',
};

console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   ███╗   ███╗██╗ ██████╗ ██╗                ║
║   ████╗ ████║██║██╔════╝ ██║                ║
║   ██╔████╔██║██║██║  ███╗██║                ║
║   ██║╚██╔╝██║██║██║   ██║██║                ║
║   ██║ ╚═╝ ██║██║╚██████╔╝██║                ║
║   ╚═╝     ╚═╝╚═╝ ╚═════╝ ╚═╝                ║
║          S I G N A L S                       ║
║                                              ║
║   Trading Engine v1.0.0                      ║
║   Mode: ${config.simulatorMode ? '🎮 SIMULATOR' : '💰 LIVE TRADING'}                       ║
╚══════════════════════════════════════════════╝
`);

console.log('[Config]', {
  symbol: config.symbol,
  baseStake: `$${config.baseStake}`,
  targetProfit: `$${config.targetProfit}`,
  stopLoss: `$${config.stopLoss}`,
  maxConsecutiveLosses: config.maxConsecutiveLosses,
  wsPort: config.wsPort,
});

// ─── Initialize Subsystems ───
const wsServer = new FrontendWSServer(config.wsPort);
const analysisEngine = new AnalysisEngine(100);
const riskManager = new MartingaleRiskManager(
  config.baseStake,
  config.targetProfit,
  config.stopLoss,
  config.maxConsecutiveLosses
);
const derivClient = new DerivClient(config);
const trader = new TradeExecutor(derivClient, riskManager, config.simulatorMode);

let botStatus: BotStatus = 'IDLE';
let isAutoTrading: boolean = false;
let sessionId: string | null = null;
let minConfidence: number = 65; // Minimum confidence to trigger auto-trade

// ─── Create Session ───
async function startSession(): Promise<void> {
  try {
    const session = await prisma.session.create({
      data: {
        isSimulated: config.simulatorMode,
      },
    });
    sessionId = session.id;
    console.log(`[Session] Started: ${sessionId}`);
  } catch (err) {
    console.error('[Session] Failed to create session:', err);
  }
}

// ─── Log Trade to Database ───
async function logTrade(trade: TradeExecution): Promise<void> {
  try {
    await prisma.trade.create({
      data: {
        signal: trade.signal,
        confidence: trade.confidence,
        stake: trade.stake,
        result: trade.result,
        payout: trade.payout,
        profitLoss: trade.profitLoss,
        cumulativePL: trade.cumulativePL,
        tickValue: trade.tickValue,
        lastDigit: trade.lastDigit,
        isSimulated: trade.isSimulated,
        sessionId: sessionId,
      },
    });

    // Update session stats
    if (sessionId) {
      const updateData: any = {
        totalTrades: { increment: 1 },
        totalPL: trade.cumulativePL,
      };
      if (trade.result === 'WIN') updateData.wins = { increment: 1 };
      if (trade.result === 'LOSS') updateData.losses = { increment: 1 };

      await prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });
    }
  } catch (err) {
    console.error('[DB] Failed to log trade:', err);
  }
}

// ─── Wire Up Events ───

// Deriv ticks → Analysis engine → Frontend
derivClient.on('tick', (tick: TickData) => {
  // Broadcast raw tick
  wsServer.broadcastTick(tick);

  // Run analysis
  const analysis = analysisEngine.processTick(tick);

  // Broadcast analysis
  wsServer.broadcastAnalysis(analysis);

  // Auto-trade if enabled and signal is strong enough
  if (isAutoTrading && analysis.signal !== 'NO_SIGNAL' && analysis.confidence >= minConfidence) {
    trader.execute(analysis.signal, analysis.confidence, analysis.tickValue, analysis.lastDigit);
  }
});

// Trade results → Frontend + DB
trader.on('trade', async (trade: TradeExecution) => {
  console.log(
    `[Trade] ${trade.result === 'WIN' ? '✅' : '❌'} ${trade.signal} | ` +
    `Stake: $${trade.stake.toFixed(2)} | P&L: ${trade.profitLoss >= 0 ? '+' : ''}$${trade.profitLoss.toFixed(2)} | ` +
    `Cumulative: ${trade.cumulativePL >= 0 ? '+' : ''}$${trade.cumulativePL.toFixed(2)}`
  );
  wsServer.broadcastTrade(trade);
  wsServer.broadcastRisk(riskManager.getState());
  await logTrade(trade);
});

// Risk manager stop signals
riskManager.on('stop', (reason: string) => {
  console.log(`[Risk] 🛑 STOP: ${reason}`);
  isAutoTrading = false;
  botStatus = 'STOPPED';
  wsServer.broadcastStatus({ status: botStatus, reason });
});

riskManager.on('stateUpdate', (state: any) => {
  wsServer.broadcastRisk(state);
});

// Handle frontend commands
wsServer.on('clientMessage', (msg: any, ws: any) => {
  console.log('[WS Server] Client command:', msg.action);

  switch (msg.action) {
    case 'start':
      isAutoTrading = true;
      botStatus = 'RUNNING';
      wsServer.broadcastStatus({ status: botStatus });
      break;

    case 'stop':
      isAutoTrading = false;
      botStatus = 'PAUSED';
      wsServer.broadcastStatus({ status: botStatus });
      break;

    case 'setSimulator':
      config.simulatorMode = msg.enabled;
      trader.setSimulatorMode(msg.enabled);
      wsServer.broadcastStatus({
        status: botStatus,
        simulatorMode: config.simulatorMode,
      });
      break;

    case 'updateConfig':
      if (msg.baseStake) config.baseStake = msg.baseStake;
      if (msg.targetProfit) config.targetProfit = msg.targetProfit;
      if (msg.stopLoss) config.stopLoss = msg.stopLoss;
      if (msg.minConfidence) minConfidence = msg.minConfidence;
      riskManager.updateConfig({
        baseStake: config.baseStake,
        targetProfit: config.targetProfit,
        stopLoss: config.stopLoss,
      });
      wsServer.broadcast({
        type: 'config',
        data: { ...config, minConfidence },
        timestamp: Date.now(),
      });
      break;

    case 'reset':
      riskManager.reset();
      trader.resetCumulativePL();
      analysisEngine.reset();
      isAutoTrading = false;
      botStatus = 'IDLE';
      wsServer.broadcastStatus({ status: botStatus });
      wsServer.broadcastRisk(riskManager.getState());
      startSession();
      break;

    case 'getState':
      wsServer.sendTo(ws, {
        type: 'status',
        data: {
          status: botStatus,
          simulatorMode: config.simulatorMode,
          config: { ...config, derivApiToken: '***' },
          minConfidence,
        },
        timestamp: Date.now(),
      });
      wsServer.sendTo(ws, {
        type: 'risk',
        data: riskManager.getState(),
        timestamp: Date.now(),
      });
      break;
  }
});

// ─── Start Everything ───
async function main(): Promise<void> {
  try {
    // Initialize database
    await prisma.$connect();
    console.log('[DB] ✅ Connected to SQLite');

    // Start session
    await startSession();

    // Connect to Deriv
    derivClient.connect();
    botStatus = 'RUNNING';

    console.log('[Engine] ✅ MigiSignals Engine is LIVE');
    console.log(`[Engine] Frontend WS: ws://localhost:${config.wsPort}`);
  } catch (err) {
    console.error('[Engine] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Engine] Shutting down...');
  isAutoTrading = false;
  derivClient.disconnect();
  wsServer.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  derivClient.disconnect();
  wsServer.close();
  await prisma.$disconnect();
  process.exit(0);
});

main();
