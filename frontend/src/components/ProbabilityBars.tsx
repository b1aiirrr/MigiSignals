'use client';

import { AnalysisResult } from '../lib/types';

interface ProbabilityBarsProps {
  analysis: AnalysisResult | null;
}

export default function ProbabilityBars({ analysis }: ProbabilityBarsProps) {
  const freq = analysis?.frequency;
  const evenPct = freq?.evenPercent || 50;
  const oddPct = freq?.oddPercent || 50;
  const digitCounts = freq?.digitCounts || new Array(10).fill(0);
  const totalTicks = freq?.totalTicks || 0;
  const maxCount = Math.max(...digitCounts, 1);

  return (
    <div className="probability-panel glass-card" id="probability-bars">
      <div className="prob-section-title">Even / Odd Probability</div>

      {/* Even bar */}
      <div className="prob-row">
        <span className="prob-label" style={{ color: 'var(--neon-green)' }}>EVEN</span>
        <div className="prob-bar-bg">
          <div
            className="prob-bar-fill even"
            style={{ width: `${evenPct}%` }}
          />
        </div>
        <span className="prob-value" style={{ color: 'var(--neon-green)' }}>
          {evenPct.toFixed(1)}%
        </span>
      </div>

      {/* Odd bar */}
      <div className="prob-row">
        <span className="prob-label" style={{ color: 'var(--hot-pink)' }}>ODD</span>
        <div className="prob-bar-bg">
          <div
            className="prob-bar-fill odd"
            style={{ width: `${oddPct}%` }}
          />
        </div>
        <span className="prob-value" style={{ color: 'var(--hot-pink)' }}>
          {oddPct.toFixed(1)}%
        </span>
      </div>

      {/* Digit Distribution */}
      <div className="prob-section-title" style={{ marginTop: '16px' }}>
        Digit Distribution
        <span style={{ color: 'var(--text-dim)', marginLeft: '8px', letterSpacing: 'normal', textTransform: 'none' }}>
          ({totalTicks} ticks)
        </span>
      </div>

      <div className="digit-histogram">
        {digitCounts.map((count: number, digit: number) => {
          const height = totalTicks > 0 ? (count / maxCount) * 60 : 4;
          const isEven = digit % 2 === 0;
          return (
            <div key={digit} className="digit-bar">
              <div
                className="digit-bar-fill"
                style={{
                  height: `${Math.max(height, 4)}px`,
                  backgroundColor: isEven ? 'var(--neon-green)' : 'var(--hot-pink)',
                  opacity: totalTicks > 0 ? 0.4 + (count / maxCount) * 0.6 : 0.2,
                }}
              />
              <span className="digit-bar-label">{digit}</span>
            </div>
          );
        })}
      </div>

      {/* Last digits stream */}
      {freq?.lastNDigits && freq.lastNDigits.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div className="prob-section-title">Last Digits</div>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
            {freq.lastNDigits.map((d: number, i: number) => (
              <span
                key={i}
                style={{
                  padding: '2px 5px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  borderRadius: '3px',
                  backgroundColor: d % 2 === 0 ? 'rgba(0,255,65,0.1)' : 'rgba(255,0,128,0.1)',
                  color: d % 2 === 0 ? 'var(--neon-green)' : 'var(--hot-pink)',
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
