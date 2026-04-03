'use client';

import { TradeExecution } from '../lib/types';

interface TradeHistoryProps {
  trades: TradeExecution[];
}

export default function TradeHistory({ trades }: TradeHistoryProps) {
  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="history-panel glass-card" id="trade-history">
      <div className="history-title">
        Trade History
        <span style={{ color: 'var(--text-dim)', marginLeft: '8px', letterSpacing: 'normal', textTransform: 'none' }}>
          ({trades.length} trades)
        </span>
      </div>

      {trades.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px', fontSize: '0.8rem' }}>
          No trades yet. Start the bot to begin trading.
        </div>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Signal</th>
              <th>Digit</th>
              <th>Stake</th>
              <th>Result</th>
              <th>P&L</th>
              <th>Cumulative</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className={trade.result === 'WIN' ? 'win' : 'loss'}>
                <td style={{ color: 'var(--text-dim)' }}>{formatTime(trade.timestamp)}</td>
                <td>
                  <span className={`badge ${trade.signal.toLowerCase()}`}>
                    {trade.signal}
                  </span>
                </td>
                <td>
                  <span className={`tick-digit ${trade.lastDigit % 2 === 0 ? 'even' : 'odd'}`}>
                    {trade.lastDigit}
                  </span>
                </td>
                <td>${trade.stake.toFixed(2)}</td>
                <td>
                  <span className={`badge ${trade.result.toLowerCase()}`}>
                    {trade.result}
                  </span>
                </td>
                <td style={{
                  color: trade.profitLoss >= 0 ? 'var(--neon-green)' : 'var(--hot-pink)',
                  fontWeight: 600,
                }}>
                  {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
                </td>
                <td style={{
                  color: trade.cumulativePL >= 0 ? 'var(--neon-green)' : 'var(--hot-pink)',
                }}>
                  {trade.cumulativePL >= 0 ? '+' : ''}${trade.cumulativePL.toFixed(2)}
                </td>
                <td>
                  {trade.isSimulated && <span className="badge sim">SIM</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
