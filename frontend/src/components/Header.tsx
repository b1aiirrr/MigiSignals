'use client';

import { TickData } from '../lib/types';

interface HeaderProps {
  isConnected: boolean;
  latestTick: TickData | null;
  botStatus: string;
  simulatorMode: boolean;
}

export default function Header({ isConnected, latestTick, botStatus, simulatorMode }: HeaderProps) {
  const formatQuote = (quote: number): { main: string; digit: string; isEven: boolean } => {
    const str = quote.toFixed(4);
    const digit = str[str.length - 1];
    const main = str.slice(0, -1);
    return { main, digit, isEven: parseInt(digit) % 2 === 0 };
  };

  const tick = latestTick ? formatQuote(latestTick.quote) : null;

  return (
    <header className="header" id="main-header">
      <div className="header-brand">
        <img src="/logo.png" alt="MigiSignals" className="header-logo" />
        <span className="header-title neon-text">MigiSignals</span>
        {simulatorMode && <span className="badge sim">SIM</span>}
      </div>

      <div className="header-status">
        <div className="status-item">
          <div className={`status-dot ${isConnected ? '' : 'disconnected'}`} />
          <span>{isConnected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>

        <div className="status-item">
          <span>STATUS:</span>
          <span className="neon-text">{botStatus}</span>
        </div>

        {tick && (
          <div className="tick-display" id="tick-value">
            <span style={{ color: 'var(--text-secondary)' }}>{latestTick?.symbol}</span>
            {' '}
            <span>{tick.main}</span>
            <span className={`tick-digit ${tick.isEven ? 'even' : 'odd'}`}>
              {tick.digit}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
