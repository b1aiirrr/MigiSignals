// ─── Momentum Filter ───
// 5-tick SMA micro-trend detection for Even/Odd clustering

import { MomentumData, MomentumDirection } from '../types';

export class MomentumFilter {
  private prices: number[] = [];
  private readonly smaWindow: number;
  private previousSma: number = 0;

  constructor(smaWindow: number = 5) {
    this.smaWindow = smaWindow;
  }

  addPrice(price: number): void {
    this.prices.push(price);
    // Keep a bit more than needed for smooth calculation
    if (this.prices.length > this.smaWindow * 3) {
      this.prices = this.prices.slice(-this.smaWindow * 2);
    }
  }

  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data.length > 0 ? data[data.length - 1] : 0;
    const slice = data.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
  }

  analyze(): MomentumData {
    const currentSma = this.calculateSMA(this.prices, this.smaWindow);
    
    // Calculate previous SMA (one tick back)
    const prevPrices = this.prices.slice(0, -1);
    const prevSma = prevPrices.length >= this.smaWindow
      ? this.calculateSMA(prevPrices, this.smaWindow)
      : currentSma;

    // Determine direction
    const diff = currentSma - prevSma;
    const threshold = 0.0001; // Minimum movement to register as directional
    
    let direction: MomentumDirection = 'NEUTRAL';
    if (diff > threshold) direction = 'RISING';
    else if (diff < -threshold) direction = 'FALLING';

    // Trend strength: how consistent is the direction over recent ticks
    const trendStrength = this.calculateTrendStrength();

    this.previousSma = currentSma;

    return {
      sma5: currentSma,
      previousSma5: prevSma,
      direction,
      trendStrength,
    };
  }

  private calculateTrendStrength(): number {
    if (this.prices.length < 5) return 0;

    const recent = this.prices.slice(-5);
    let risingCount = 0;
    let fallingCount = 0;

    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i - 1]) risingCount++;
      else if (recent[i] < recent[i - 1]) fallingCount++;
    }

    // Strength from 0-100: how consistently directional
    const maxDir = Math.max(risingCount, fallingCount);
    return (maxDir / (recent.length - 1)) * 100;
  }

  reset(): void {
    this.prices = [];
    this.previousSma = 0;
  }
}
