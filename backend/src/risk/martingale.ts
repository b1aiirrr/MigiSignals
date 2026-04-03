// ─── Martingale Risk Manager ───
// Manages stake progression, P&L tracking, and stop conditions

import { EventEmitter } from 'events';
import { RiskState, TradeResult } from '../types';

export class MartingaleRiskManager extends EventEmitter {
  private state: RiskState;

  constructor(
    baseStake: number = 1.0,
    targetProfit: number = 50,
    stopLoss: number = 20,
    maxConsecutiveLosses: number = 7
  ) {
    super();
    this.state = {
      currentStake: baseStake,
      baseStake,
      consecutiveLosses: 0,
      cumulativePL: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      targetProfit,
      stopLoss,
      maxConsecutiveLosses,
      shouldStop: false,
      stopReason: null,
    };
  }

  /**
   * Get the current stake amount (considering Martingale progression)
   */
  getCurrentStake(): number {
    return this.state.currentStake;
  }

  /**
   * Get full risk state for display
   */
  getState(): RiskState {
    return { ...this.state };
  }

  /**
   * Check if trading should continue
   */
  canTrade(): boolean {
    return !this.state.shouldStop;
  }

  /**
   * Record a trade result and update Martingale state
   */
  recordResult(result: TradeResult, payout: number): void {
    if (result === 'PENDING') return;

    this.state.totalTrades++;

    if (result === 'WIN') {
      const profit = payout - this.state.currentStake;
      this.state.cumulativePL += profit;
      this.state.wins++;
      this.state.consecutiveLosses = 0;
      this.state.currentStake = this.state.baseStake; // Reset to base

      this.emit('win', { profit, cumulativePL: this.state.cumulativePL });
    } else {
      // LOSS
      this.state.cumulativePL -= this.state.currentStake;
      this.state.losses++;
      this.state.consecutiveLosses++;

      // Martingale: double the stake
      this.state.currentStake = this.state.currentStake * 2;

      this.emit('loss', {
        loss: this.state.currentStake / 2,
        nextStake: this.state.currentStake,
        consecutiveLosses: this.state.consecutiveLosses,
        cumulativePL: this.state.cumulativePL,
      });
    }

    // Check stop conditions
    this.checkStopConditions();

    // Emit updated state
    this.emit('stateUpdate', this.getState());
  }

  private checkStopConditions(): void {
    // Target profit reached
    if (this.state.cumulativePL >= this.state.targetProfit) {
      this.state.shouldStop = true;
      this.state.stopReason = `🎯 Target profit reached: $${this.state.cumulativePL.toFixed(2)}`;
      this.emit('stop', this.state.stopReason);
      return;
    }

    // Stop loss hit
    if (Math.abs(this.state.cumulativePL) >= this.state.stopLoss && this.state.cumulativePL < 0) {
      this.state.shouldStop = true;
      this.state.stopReason = `🛑 Stop loss hit: -$${Math.abs(this.state.cumulativePL).toFixed(2)}`;
      this.emit('stop', this.state.stopReason);
      return;
    }

    // Max consecutive losses
    if (this.state.consecutiveLosses >= this.state.maxConsecutiveLosses) {
      this.state.shouldStop = true;
      this.state.stopReason = `⚠️ Max consecutive losses (${this.state.maxConsecutiveLosses}) reached`;
      this.emit('stop', this.state.stopReason);
      return;
    }
  }

  /**
   * Reset the risk manager for a new session
   */
  reset(config?: Partial<Pick<RiskState, 'baseStake' | 'targetProfit' | 'stopLoss' | 'maxConsecutiveLosses'>>): void {
    if (config?.baseStake) this.state.baseStake = config.baseStake;
    if (config?.targetProfit) this.state.targetProfit = config.targetProfit;
    if (config?.stopLoss) this.state.stopLoss = config.stopLoss;
    if (config?.maxConsecutiveLosses) this.state.maxConsecutiveLosses = config.maxConsecutiveLosses;

    this.state.currentStake = this.state.baseStake;
    this.state.consecutiveLosses = 0;
    this.state.cumulativePL = 0;
    this.state.totalTrades = 0;
    this.state.wins = 0;
    this.state.losses = 0;
    this.state.shouldStop = false;
    this.state.stopReason = null;
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(config: Partial<Pick<RiskState, 'baseStake' | 'targetProfit' | 'stopLoss' | 'maxConsecutiveLosses'>>): void {
    if (config.baseStake !== undefined) {
      this.state.baseStake = config.baseStake;
      // Only reset current stake if we're at base
      if (this.state.consecutiveLosses === 0) {
        this.state.currentStake = config.baseStake;
      }
    }
    if (config.targetProfit !== undefined) this.state.targetProfit = config.targetProfit;
    if (config.stopLoss !== undefined) this.state.stopLoss = config.stopLoss;
    if (config.maxConsecutiveLosses !== undefined) this.state.maxConsecutiveLosses = config.maxConsecutiveLosses;
  }
}
