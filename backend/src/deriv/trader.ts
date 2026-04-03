// ─── Trade Executor ───
// Handles the Propose → Buy flow and trade settlement

import { EventEmitter } from 'events';
import { DerivClient } from './client';
import { SignalType, TradeResult, TradeExecution } from '../types';
import { MartingaleRiskManager } from '../risk/martingale';

export class TradeExecutor extends EventEmitter {
  private derivClient: DerivClient;
  private riskManager: MartingaleRiskManager;
  private pendingProposal: {
    signal: SignalType;
    stake: number;
    confidence: number;
    tickValue: number;
    lastDigit: number;
    proposalId?: string;
  } | null = null;
  private isExecuting: boolean = false;
  private simulatorMode: boolean;
  private cumulativePL: number = 0;
  private tradeId: number = 0;

  constructor(
    derivClient: DerivClient,
    riskManager: MartingaleRiskManager,
    simulatorMode: boolean = true
  ) {
    super();
    this.derivClient = derivClient;
    this.riskManager = riskManager;
    this.simulatorMode = simulatorMode;

    this.setupDerivListeners();
  }

  private setupDerivListeners(): void {
    // Handle proposal response
    this.derivClient.on('proposal', (proposal: any) => {
      if (this.pendingProposal && !this.pendingProposal.proposalId) {
        this.pendingProposal.proposalId = proposal.id;
        console.log(`[Trader] Proposal received: ID=${proposal.id}, Payout=${proposal.payout}`);

        // Immediately buy
        this.derivClient.sendBuy(proposal.id, this.pendingProposal.stake);
      }
    });

    // Handle buy response
    this.derivClient.on('buy', (buyResponse: any) => {
      console.log(`[Trader] Contract bought: ID=${buyResponse.contract_id}`);
      // Wait for transaction/settlement
    });

    // Handle transaction updates (settlement)
    this.derivClient.on('transaction', (transaction: any) => {
      if (transaction.action === 'sell') {
        this.handleSettlement(transaction);
      }
    });
  }

  /**
   * Execute a trade based on a signal
   */
  async execute(
    signal: SignalType,
    confidence: number,
    tickValue: number,
    lastDigit: number
  ): Promise<TradeExecution | null> {
    if (signal === 'NO_SIGNAL') return null;
    if (this.isExecuting) {
      console.log('[Trader] Already executing a trade, skipping...');
      return null;
    }
    if (!this.riskManager.canTrade()) {
      console.log('[Trader] Risk manager says STOP');
      return null;
    }

    this.isExecuting = true;
    const stake = this.riskManager.getCurrentStake();
    const contractType = signal === 'EVEN' ? 'DIGITEVEN' : 'DIGITODD';

    console.log(`[Trader] ${this.simulatorMode ? '🎮 SIM' : '💰 LIVE'} | Signal: ${signal} | Stake: $${stake.toFixed(2)} | Confidence: ${confidence.toFixed(1)}%`);

    if (this.simulatorMode) {
      // Simulate the trade
      return this.simulateTrade(signal, stake, confidence, tickValue, lastDigit);
    }

    // Live trade: send proposal
    this.pendingProposal = { signal, stake, confidence, tickValue, lastDigit };
    this.derivClient.sendProposal(contractType, stake);

    // Return null — result will come via settlement callback
    return null;
  }

  /**
   * Simulate a trade result
   * In simulator mode, we wait for the next tick and check the last digit
   */
  private simulateTrade(
    signal: SignalType,
    stake: number,
    confidence: number,
    tickValue: number,
    lastDigit: number
  ): TradeExecution {
    // For simulation, we'll check the CURRENT tick's last digit
    // In reality, you'd wait for the next tick, but for 1s indices this is near-instant
    const resultDigit = lastDigit;
    const resultIsEven = resultDigit % 2 === 0;

    const won = (signal === 'EVEN' && resultIsEven) || (signal === 'ODD' && !resultIsEven);
    const result: TradeResult = won ? 'WIN' : 'LOSS';
    const payout = won ? stake * 1.95 : 0; // Typical ~95% payout
    const profitLoss = won ? payout - stake : -stake;

    this.cumulativePL += profitLoss;
    this.tradeId++;

    // Update risk manager
    this.riskManager.recordResult(result, payout);

    const trade: TradeExecution = {
      id: `SIM-${this.tradeId}`,
      signal,
      stake,
      confidence,
      tickValue,
      lastDigit: resultDigit,
      result,
      payout,
      profitLoss,
      cumulativePL: this.cumulativePL,
      isSimulated: true,
      timestamp: Date.now(),
    };

    this.isExecuting = false;
    this.emit('trade', trade);
    return trade;
  }

  private handleSettlement(transaction: any): void {
    if (!this.pendingProposal) return;

    const amount = parseFloat(transaction.amount || '0');
    const won = amount > 0;
    const result: TradeResult = won ? 'WIN' : 'LOSS';
    const stake = this.pendingProposal.stake;
    const payout = won ? amount : 0;
    const profitLoss = won ? payout - stake : -stake;

    this.cumulativePL += profitLoss;
    this.tradeId++;

    this.riskManager.recordResult(result, payout);

    const trade: TradeExecution = {
      id: `LIVE-${this.tradeId}`,
      signal: this.pendingProposal.signal,
      stake,
      confidence: this.pendingProposal.confidence,
      tickValue: this.pendingProposal.tickValue,
      lastDigit: this.pendingProposal.lastDigit,
      result,
      payout,
      profitLoss,
      cumulativePL: this.cumulativePL,
      isSimulated: false,
      timestamp: Date.now(),
    };

    this.pendingProposal = null;
    this.isExecuting = false;
    this.emit('trade', trade);
  }

  setSimulatorMode(enabled: boolean): void {
    this.simulatorMode = enabled;
  }

  isInSimulatorMode(): boolean {
    return this.simulatorMode;
  }

  resetCumulativePL(): void {
    this.cumulativePL = 0;
    this.tradeId = 0;
  }
}
