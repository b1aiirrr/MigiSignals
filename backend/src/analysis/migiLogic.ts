// ─── Migi-Logic Algorithm ───
// The "Supreme" analysis checker: statistical reversion + streak detection

import { SignalType, FrequencyData, MomentumData } from '../types';

export interface MigiSignal {
  signal: SignalType;
  confidence: number;
  reasoning: string;
}

export class MigiLogicAlgorithm {
  /**
   * Core Signal Logic:
   * 
   * Signal "EVEN" if:
   *   (Last 3 digits were ALL Odd) AND (Even Frequency < 45%)
   * 
   * Signal "ODD" if:
   *   (Last 3 digits were ALL Even) AND (Odd Frequency < 45%)
   * 
   * Otherwise: NO_SIGNAL (wait for better setup)
   */
  evaluate(
    lastDigits: number[],
    frequency: FrequencyData,
    momentum: MomentumData
  ): MigiSignal {
    if (lastDigits.length < 3) {
      return { signal: 'NO_SIGNAL', confidence: 0, reasoning: 'Insufficient data (need 3+ ticks)' };
    }

    const last3 = lastDigits.slice(-3);
    const allOdd = last3.every(d => d % 2 !== 0);
    const allEven = last3.every(d => d % 2 === 0);

    // Check for extended streaks (last 4-5 same parity = higher confidence)
    const last5 = lastDigits.slice(-5);
    const oddStreak = this.countConsecutiveParity(lastDigits, 'odd');
    const evenStreak = this.countConsecutiveParity(lastDigits, 'even');

    let signal: SignalType = 'NO_SIGNAL';
    let confidence = 0;
    let reasoning = '';

    // ── EVEN Signal ──
    if (allOdd && frequency.evenPercent < 45) {
      signal = 'EVEN';
      
      // Base confidence from frequency deviation
      const freqDeviation = 50 - frequency.evenPercent;
      const freqScore = Math.min(freqDeviation * 4, 40); // Max 40 points from frequency

      // Streak bonus (longer odd streak = higher even confidence)
      const streakScore = Math.min(oddStreak * 8, 30); // Max 30 points from streak

      // Momentum alignment bonus
      const momentumScore = this.getMomentumScore(momentum, 'EVEN');

      confidence = Math.min(freqScore + streakScore + momentumScore, 98);
      
      reasoning = `EVEN signal: ${oddStreak} consecutive odd digits, ` +
        `even frequency at ${frequency.evenPercent.toFixed(1)}% (below 45%), ` +
        `momentum ${momentum.direction} (${momentumScore}pts)`;
    }
    // ── ODD Signal ──
    else if (allEven && frequency.oddPercent < 45) {
      signal = 'ODD';
      
      const freqDeviation = 50 - frequency.oddPercent;
      const freqScore = Math.min(freqDeviation * 4, 40);
      const streakScore = Math.min(evenStreak * 8, 30);
      const momentumScore = this.getMomentumScore(momentum, 'ODD');

      confidence = Math.min(freqScore + streakScore + momentumScore, 98);
      
      reasoning = `ODD signal: ${evenStreak} consecutive even digits, ` +
        `odd frequency at ${frequency.oddPercent.toFixed(1)}% (below 45%), ` +
        `momentum ${momentum.direction} (${momentumScore}pts)`;
    }
    else {
      // No clear signal
      reasoning = this.getWaitReason(last3, frequency);
    }

    return { signal, confidence, reasoning };
  }

  /**
   * Count consecutive same-parity digits from the end
   */
  private countConsecutiveParity(digits: number[], parity: 'even' | 'odd'): number {
    let count = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
      const isEven = digits[i] % 2 === 0;
      if ((parity === 'even' && isEven) || (parity === 'odd' && !isEven)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Momentum alignment scoring
   * Trending markets tend to cluster even/odd digits
   */
  private getMomentumScore(momentum: MomentumData, signal: 'EVEN' | 'ODD'): number {
    let score = 0;

    // Strong trends increase confidence (digit clustering during micro-trends)
    if (momentum.trendStrength > 75) {
      score += 15;
    } else if (momentum.trendStrength > 50) {
      score += 10;
    } else if (momentum.trendStrength > 25) {
      score += 5;
    }

    // Directional bias (rising trends slightly favor even in some synthetic indices)
    if (momentum.direction !== 'NEUTRAL') {
      score += 5;
    }

    return Math.min(score, 20); // Max 20 points from momentum
  }

  private getWaitReason(last3: number[], frequency: FrequencyData): string {
    const parities = last3.map(d => d % 2 === 0 ? 'E' : 'O');
    const allSame = parities.every(p => p === parities[0]);
    
    if (allSame && parities[0] === 'O' && frequency.evenPercent >= 45) {
      return `Odd streak detected but even frequency (${frequency.evenPercent.toFixed(1)}%) is not low enough (<45% needed)`;
    }
    if (allSame && parities[0] === 'E' && frequency.oddPercent >= 45) {
      return `Even streak detected but odd frequency (${frequency.oddPercent.toFixed(1)}%) is not low enough (<45% needed)`;
    }
    return `Mixed pattern [${parities.join(',')}], waiting for 3+ consecutive same-parity digits`;
  }
}
