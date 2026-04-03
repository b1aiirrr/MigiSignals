// ─── WebSocket Server ───
// Broadcasts real-time data to connected frontend clients

import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { WSMessage } from '../types';

export class FrontendWSServer extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port: number = 8080) {
    super();
    this.port = port;
    this.wss = new WebSocketServer({ port });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log(`[WS Server] Client connected (total: ${this.clients.size + 1})`);
      this.clients.add(ws);

      ws.on('message', (data: WebSocket.Data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.emit('clientMessage', msg, ws);
        } catch (err) {
          console.error('[WS Server] Invalid client message');
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[WS Server] Client disconnected (total: ${this.clients.size})`);
      });

      ws.on('error', (err: Error) => {
        console.error('[WS Server] Client error:', err.message);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendTo(ws, {
        type: 'status',
        data: { connected: true, message: 'Connected to MigiSignals Engine' },
        timestamp: Date.now(),
      });
    });

    console.log(`[WS Server] ✅ Listening on port ${port}`);
  }

  /**
   * Broadcast a message to all connected clients
   */
  broadcast(message: WSMessage): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  /**
   * Send to a specific client
   */
  sendTo(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast tick data
   */
  broadcastTick(tickData: any): void {
    this.broadcast({
      type: 'tick',
      data: tickData,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast analysis result
   */
  broadcastAnalysis(analysis: any): void {
    this.broadcast({
      type: 'analysis',
      data: analysis,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast trade execution
   */
  broadcastTrade(trade: any): void {
    this.broadcast({
      type: 'trade',
      data: trade,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast risk state
   */
  broadcastRisk(riskState: any): void {
    this.broadcast({
      type: 'risk',
      data: riskState,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast bot status
   */
  broadcastStatus(status: any): void {
    this.broadcast({
      type: 'status',
      data: status,
      timestamp: Date.now(),
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  close(): void {
    this.wss.close();
  }
}
