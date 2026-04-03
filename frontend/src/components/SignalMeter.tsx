'use client';

import { AnalysisResult } from '../lib/types';

interface SignalMeterProps {
  analysis: AnalysisResult | null;
}

export default function SignalMeter({ analysis }: SignalMeterProps) {
  const signal = analysis?.signal || 'NO_SIGNAL';
  const confidence = analysis?.confidence || 0;
  const reasoning = analysis?.reasoning || 'Waiting for data...';

  const getSignalClass = () => {
    if (signal === 'EVEN') return 'even';
    if (signal === 'ODD') return 'odd';
    return 'waiting';
  };

  const getSignalLabel = () => {
    if (signal === 'EVEN') return '⚡ EVEN';
    if (signal === 'ODD') return '⚡ ODD';
    return '◦ WAITING';
  };

  const getConfidenceColor = () => {
    if (confidence >= 75) return '#00FF41';
    if (confidence >= 50) return '#ffaa00';
    if (confidence >= 25) return '#00d4ff';
    return '#555577';
  };

  return (
    <div className="signal-panel glass-card" id="signal-meter">
      <div className="signal-label">Signal Strength</div>
      
      <div className={`signal-value ${getSignalClass()}`}>
        {getSignalLabel()}
      </div>

      <div className="confidence-bar-container">
        <div
          className="confidence-bar"
          style={{
            width: `${confidence}%`,
            backgroundColor: getConfidenceColor(),
          }}
        />
      </div>

      <div className="confidence-label">
        <span style={{ color: getConfidenceColor() }}>{confidence.toFixed(1)}%</span>
        {' '}confidence
      </div>

      {analysis && (
        <div style={{ marginTop: '12px' }}>
          <div className="signal-label" style={{ marginBottom: '4px' }}>Momentum</div>
          <div style={{ 
            fontSize: '0.85rem', 
            color: analysis.momentum.direction === 'RISING' ? '#00FF41' 
              : analysis.momentum.direction === 'FALLING' ? '#ff0080' 
              : '#555577'
          }}>
            {analysis.momentum.direction === 'RISING' ? '↑' : analysis.momentum.direction === 'FALLING' ? '↓' : '→'}
            {' '}{analysis.momentum.direction}
            <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginLeft: '6px' }}>
              ({analysis.momentum.trendStrength.toFixed(0)}%)
            </span>
          </div>
        </div>
      )}

      <div className="reasoning">{reasoning}</div>
    </div>
  );
}
