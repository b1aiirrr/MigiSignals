// ─── Digit Frequency Analyzer ───
// Tracks the last N ticks and provides Even/Odd frequency statistics

import { FrequencyData } from '../types';

export class DigitFrequencyAnalyzer {
  private digits: number[] = [];
  private readonly windowSize: number;

  constructor(windowSize: number = 100) {
    this.windowSize = windowSize;
  }

  addDigit(digit: number): void {
    this.digits.push(digit);
    if (this.digits.length > this.windowSize) {
      this.digits.shift();
    }
  }

  analyze(): FrequencyData {
    const digitCounts = new Array(10).fill(0);
    let evenCount = 0;
    let oddCount = 0;

    for (const d of this.digits) {
      digitCounts[d]++;
      if (d % 2 === 0) {
        evenCount++;
      } else {
        oddCount++;
      }
    }

    const total = this.digits.length;
    const evenPercent = total > 0 ? (evenCount / total) * 100 : 50;
    const oddPercent = total > 0 ? (oddCount / total) * 100 : 50;

    return {
      evenPercent,
      oddPercent,
      digitCounts,
      totalTicks: total,
      lastNDigits: this.digits.slice(-10), // Last 10 for display
    };
  }

  getLastDigits(n: number): number[] {
    return this.digits.slice(-n);
  }

  getDigitCount(): number {
    return this.digits.length;
  }

  reset(): void {
    this.digits = [];
  }
}
