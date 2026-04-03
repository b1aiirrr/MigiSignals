'use client';

import { useState } from 'react';
import { RiskState } from '../lib/types';

interface TradeControlsProps {
  botStatus: string;
  riskState: RiskState | null;
  simulatorMode: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onSetSimulator: (enabled: boolean) => void;
  onUpdateConfig: (config: any) => void;
}

export default function TradeControls({
  botStatus,
  riskState,
  simulatorMode,
  onStart,
  onStop,
  onReset,
  onSetSimulator,
  onUpdateConfig,
}: TradeControlsProps) {
  const [baseStake, setBaseStake] = useState('1.00');
  const [targetProfit, setTargetProfit] = useState('50');
  const [stopLoss, setStopLoss] = useState('20');

  const winRate = riskState && riskState.totalTrades > 0
    ? ((riskState.wins / riskState.totalTrades) * 100).toFixed(1)
    : '0.0';

  const plColor = (riskState?.cumulativePL || 0) >= 0 ? 'positive' : 'negative';

  return (
    <div className="controls-panel" id="trade-controls">
      {/* P&L Display */}
      <div className="control-card glass-card">
        <h3>Profit & Loss</h3>
        <div className={`pl-display ${plColor}`}>
          {(riskState?.cumulativePL || 0) >= 0 ? '+' : ''}
          ${(riskState?.cumulativePL || 0).toFixed(2)}
        </div>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value positive">{riskState?.wins || 0}</div>
            <div className="stat-label">Wins</div>
          </div>
          <div className="stat-item">
            <div className="stat-value negative">{riskState?.losses || 0}</div>
            <div className="stat-label">Losses</div>
          </div>
          <div className="stat-item">
            <div className="stat-value neutral">{winRate}%</div>
            <div className="stat-label">Win Rate</div>
          </div>
        </div>
        <div className="stats-grid" style={{ marginTop: '8px' }}>
          <div className="stat-item">
            <div className="stat-value neutral">{riskState?.totalTrades || 0}</div>
            <div className="stat-label">Trades</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: 'var(--cyan)' }}>
              ${(riskState?.currentStake || 1).toFixed(2)}
            </div>
            <div className="stat-label">Next Stake</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: 'var(--amber)' }}>
              {riskState?.consecutiveLosses || 0}
            </div>
            <div className="stat-label">Streak</div>
          </div>
        </div>

        {riskState?.stopReason && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'rgba(255, 0, 128, 0.1)',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: 'var(--hot-pink)',
            textAlign: 'center'
          }}>
            {riskState.stopReason}
          </div>
        )}
      </div>

      {/* Bot Controls */}
      <div className="control-card glass-card">
        <h3>Bot Controls</h3>
        
        <div className="toggle-container">
          <span className="toggle-label">Simulator Mode</span>
          <div
            className={`toggle ${simulatorMode ? 'active' : ''}`}
            onClick={() => onSetSimulator(!simulatorMode)}
            id="simulator-toggle"
          >
            <div className="toggle-knob" />
          </div>
        </div>

        <div className="btn-group" style={{ marginBottom: '16px' }}>
          {botStatus !== 'RUNNING' ? (
            <button className="btn btn-primary" onClick={onStart} id="start-btn" style={{ flex: 1 }}>
              ▶ Start
            </button>
          ) : (
            <button className="btn btn-danger" onClick={onStop} id="stop-btn" style={{ flex: 1 }}>
              ■ Stop
            </button>
          )}
          <button className="btn btn-secondary" onClick={onReset} id="reset-btn">
            ↻ Reset
          </button>
        </div>

        <div className="input-group">
          <label>Base Stake ($)</label>
          <input
            className="input-field"
            type="number"
            step="0.50"
            min="0.35"
            value={baseStake}
            onChange={(e) => setBaseStake(e.target.value)}
            id="base-stake-input"
          />
        </div>

        <div className="input-group">
          <label>Target Profit ($)</label>
          <input
            className="input-field"
            type="number"
            step="5"
            min="1"
            value={targetProfit}
            onChange={(e) => setTargetProfit(e.target.value)}
            id="target-profit-input"
          />
        </div>

        <div className="input-group">
          <label>Stop Loss ($)</label>
          <input
            className="input-field"
            type="number"
            step="5"
            min="1"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            id="stop-loss-input"
          />
        </div>

        <button
          className="btn btn-secondary"
          style={{ width: '100%' }}
          onClick={() => onUpdateConfig({
            baseStake: parseFloat(baseStake),
            targetProfit: parseFloat(targetProfit),
            stopLoss: parseFloat(stopLoss),
          })}
          id="apply-config-btn"
        >
          Apply Settings
        </button>
      </div>
    </div>
  );
}
