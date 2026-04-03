'use client';

import { useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import Header from '../components/Header';
import TickChart from '../components/TickChart';
import SignalMeter from '../components/SignalMeter';
import ProbabilityBars from '../components/ProbabilityBars';
import TradeControls from '../components/TradeControls';
import TradeHistory from '../components/TradeHistory';

export default function Dashboard() {
  const {
    isConnected,
    latestTick,
    latestAnalysis,
    trades,
    riskState,
    botStatus,
    ticks,
    sendMessage,
  } = useWebSocket();

  const [simulatorMode, setSimulatorMode] = useState(true);

  const handleStart = () => {
    sendMessage({ action: 'start' });
  };

  const handleStop = () => {
    sendMessage({ action: 'stop' });
  };

  const handleReset = () => {
    sendMessage({ action: 'reset' });
  };

  const handleSetSimulator = (enabled: boolean) => {
    setSimulatorMode(enabled);
    sendMessage({ action: 'setSimulator', enabled });
  };

  const handleUpdateConfig = (config: any) => {
    sendMessage({ action: 'updateConfig', ...config });
  };

  return (
    <div className="dashboard">
      <Header
        isConnected={isConnected}
        latestTick={latestTick}
        botStatus={botStatus}
        simulatorMode={simulatorMode}
      />

      <div className="dashboard-grid">
        <TickChart ticks={ticks} />
        
        <SignalMeter analysis={latestAnalysis} />
        
        <ProbabilityBars analysis={latestAnalysis} />

        <TradeControls
          botStatus={botStatus}
          riskState={riskState}
          simulatorMode={simulatorMode}
          onStart={handleStart}
          onStop={handleStop}
          onReset={handleReset}
          onSetSimulator={handleSetSimulator}
          onUpdateConfig={handleUpdateConfig}
        />

        <TradeHistory trades={trades} />
      </div>
    </div>
  );
}
