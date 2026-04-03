'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { WSMessage, TickData, AnalysisResult, TradeExecution, RiskState } from '../lib/types';

// Auto-detect protocol: use wss:// on HTTPS pages, ws:// on HTTP
function getWsUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
  // Upgrade to wss:// when served over HTTPS (e.g. Vercel)
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return envUrl.replace(/^ws:\/\//, 'wss://');
  }
  return envUrl;
}



interface UseWebSocketReturn {
  isConnected: boolean;
  latestTick: TickData | null;
  latestAnalysis: AnalysisResult | null;
  trades: TradeExecution[];
  riskState: RiskState | null;
  botStatus: string;
  ticks: TickData[];
  sendMessage: (msg: any) => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [latestTick, setLatestTick] = useState<TickData | null>(null);
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null);
  const [trades, setTrades] = useState<TradeExecution[]>([]);
  const [riskState, setRiskState] = useState<RiskState | null>(null);
  const [botStatus, setBotStatus] = useState<string>('IDLE');
  const [ticks, setTicks] = useState<TickData[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to MigiSignals Engine');
        setIsConnected(true);
        // Request current state
        ws.send(JSON.stringify({ action: 'getState' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'tick':
              setLatestTick(msg.data);
              setTicks(prev => {
                const updated = [...prev, msg.data];
                return updated.slice(-60); // Keep last 60 ticks
              });
              break;
            case 'analysis':
              setLatestAnalysis(msg.data);
              break;
            case 'trade':
              setTrades(prev => [msg.data, ...prev].slice(0, 50));
              break;
            case 'risk':
              setRiskState(msg.data);
              break;
            case 'status':
              if (msg.data.status) setBotStatus(msg.data.status);
              break;
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      ws.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  const sendMessage = useCallback((msg: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  return {
    isConnected,
    latestTick,
    latestAnalysis,
    trades,
    riskState,
    botStatus,
    ticks,
    sendMessage,
  };
}
