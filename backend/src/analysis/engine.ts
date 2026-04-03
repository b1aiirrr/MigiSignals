// ─── Analysis Engine Orchestrator ───
// Coordinates all analyzers and emits unified AnalysisResult

import { EventEmitter } from 'events';
import { DigitFrequencyAnalyzer } from './digitFrequency';
import { MomentumFilter } from './momentumFilter';
import { MigiLogicAlgorithm } from './migiLogic';
import { AnalysisResult, TickData } from '../types';

export class AnalysisEngine extends EventEmitter {
  private frequencyAnalyzer: DigitFrequencyAnalyzer;
  private momentumFilter: MomentumFilter;
  private migiLogic: MigiLogicAlgorithm;
  private tickCount: number = 0;

  constructor(frequencyWindow: number = 100) {
    super();
    this.frequencyAnalyzer = new DigitFrequencyAnalyzer(frequencyWindow);
    this.momentumFilter = new MomentumFilter(5);
    this.migiLogic = new MigiLogicAlgorithm();
  }

  /**
   * Process an incoming tick through all analysis layers
   */
  processTick(tick: TickData): AnalysisResult {
    this.tickCount++;

    // Feed data to analyzers
    this.frequencyAnalyzer.addDigit(tick.lastDigit);
    this.momentumFilter.addPrice(tick.quote);

    // Run analysis
    const frequency = this.frequencyAnalyzer.analyze();
    const momentum = this.momentumFilter.analyze();

    // Get last digits for Migi-Logic (from frequency analyzer's buffer)
    const lastDigits = this.frequencyAnalyzer.getLastDigits(10);

    // Run the core signal algorithm
    const migiSignal = this.migiLogic.evaluate(lastDigits, frequency, momentum);

    const result: AnalysisResult = {
      signal: migiSignal.signal,
      confidence: migiSignal.confidence,
      frequency,
      momentum,
      timestamp: tick.epoch,
      tickValue: tick.quote,
      lastDigit: tick.lastDigit,
      reasoning: migiSignal.reasoning,
    };

    // Emit the analysis result
    this.emit('analysis', result);

    return result;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  reset(): void {
    this.frequencyAnalyzer.reset();
    this.momentumFilter.reset();
    this.tickCount = 0;
  }
}
