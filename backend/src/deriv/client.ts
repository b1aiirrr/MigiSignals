// ─── Deriv WebSocket Client ───
// Connects to Deriv API, handles auth, and streams tick data

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { TickData, BotConfig } from '../types';

export class DerivClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: BotConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 2000;
  private isAuthorized: boolean = false;
  private subscriptionId: string | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: BotConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to Deriv WebSocket API
   */
  connect(): void {
    const url = `wss://ws.derivws.com/websockets/v3?app_id=${this.config.derivAppId}`;
    console.log(`[DerivClient] Connecting to ${url}...`);

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('[DerivClient] ✅ Connected to Deriv WebSocket');
      this.reconnectAttempts = 0;
      this.startPing();
      this.authorize();
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(msg);
      } catch (err) {
        console.error('[DerivClient] Failed to parse message:', err);
      }
    });

    this.ws.on('error', (err: Error) => {
      console.error('[DerivClient] ❌ WebSocket error:', err.message);
      this.emit('error', err);
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      console.log(`[DerivClient] Connection closed (${code}): ${reason.toString()}`);
      this.isAuthorized = false;
      this.stopPing();
      this.attemptReconnect();
    });
  }

  private authorize(): void {
    if (!this.config.derivApiToken) {
      console.log('[DerivClient] No API token provided, skipping auth (read-only mode)');
      this.subscribeTicks();
      return;
    }
    this.send({ authorize: this.config.derivApiToken });
  }

  private subscribeTicks(): void {
    console.log(`[DerivClient] Subscribing to ticks for ${this.config.symbol}...`);
    this.send({
      ticks: this.config.symbol,
      subscribe: 1,
    });
  }

  private handleMessage(msg: any): void {
    if (msg.error) {
      console.error(`[DerivClient] API Error: ${msg.error.message} (code: ${msg.error.code})`);
      this.emit('apiError', msg.error);
      return;
    }

    switch (msg.msg_type) {
      case 'authorize':
        this.isAuthorized = true;
        console.log(`[DerivClient] ✅ Authorized as: ${msg.authorize?.fullname || 'Unknown'}`);
        console.log(`[DerivClient] Balance: ${msg.authorize?.balance} ${msg.authorize?.currency}`);
        this.emit('authorized', msg.authorize);
        this.subscribeTicks();
        break;

      case 'tick':
        this.handleTick(msg.tick);
        break;

      case 'proposal':
        this.emit('proposal', msg.proposal);
        break;

      case 'buy':
        this.emit('buy', msg.buy);
        break;

      case 'sell':
        this.emit('sell', msg.sell);
        break;

      case 'transaction':
        this.emit('transaction', msg.transaction);
        break;

      case 'ping':
        // Pong handled automatically
        break;

      default:
        // Log unknown message types for debugging
        if (msg.msg_type) {
          console.log(`[DerivClient] Unhandled message type: ${msg.msg_type}`);
        }
    }
  }

  private handleTick(tick: any): void {
    if (!tick) return;

    const quote = parseFloat(tick.quote);
    const quoteStr = tick.quote.toString();
    const lastDigit = parseInt(quoteStr[quoteStr.length - 1], 10);

    const tickData: TickData = {
      epoch: tick.epoch,
      quote,
      symbol: tick.symbol,
      lastDigit,
      isEven: lastDigit % 2 === 0,
    };

    this.emit('tick', tickData);
  }

  /**
   * Send a proposal request for Even/Odd contract
   */
  sendProposal(contractType: 'DIGITEVEN' | 'DIGITODD', stake: number): void {
    this.send({
      proposal: 1,
      amount: stake.toFixed(2),
      basis: 'stake',
      contract_type: contractType,
      currency: 'USD',
      duration: 1,
      duration_unit: 't',
      symbol: this.config.symbol,
    });
  }

  /**
   * Buy a contract using a proposal ID
   */
  sendBuy(proposalId: string, price: number): void {
    this.send({
      buy: proposalId,
      price: price,
    });
  }

  /**
   * Send raw message to Deriv API
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[DerivClient] Cannot send — WebSocket not open');
    }
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ ping: 1 });
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DerivClient] Max reconnection attempts reached. Giving up.');
      this.emit('maxReconnectFailed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`[DerivClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Gracefully disconnect
   */
  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    this.isAuthorized = false;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  isAuth(): boolean {
    return this.isAuthorized;
  }
}
