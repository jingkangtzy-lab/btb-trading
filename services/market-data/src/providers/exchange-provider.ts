import WebSocket from "ws";
import fetch from "node-fetch";
import { MarketDataProvider, Tick } from "../provider.interface";

// Reference implementation against a generic exchange-style WebSocket API.
// The exact message format (subscribe payload, tick shape) must be adapted
// to whichever licensed provider you contract with — the reconnection,
// backoff, and validation logic below is provider-agnostic and should stay
// as-is regardless of which vendor you plug in.

interface ExchangeProviderConfig {
  wsUrl: string;
  restBaseUrl: string;
  apiKey: string;
  apiSecret: string;
}

export class ExchangeMarketDataProvider implements MarketDataProvider {
  readonly name = "exchange-provider";

  private ws: WebSocket | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private readonly maxBackoffMs = 30_000;
  private subscriptions = new Map<string, (tick: Tick) => void>();

  constructor(private config: ExchangeProviderConfig) {}

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.config.wsUrl);

      this.ws.on("open", () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        // Re-subscribe to any symbols that were active before a reconnect.
        for (const symbol of this.subscriptions.keys()) {
          this.sendSubscribe(symbol);
        }
        resolve();
      });

      this.ws.on("message", (raw) => this.handleMessage(raw.toString()));

      this.ws.on("close", () => {
        this.connected = false;
        this.scheduleReconnect();
      });

      this.ws.on("error", (err) => {
        console.error(`[market-data] WebSocket error: ${err.message}`);
        if (!this.connected) reject(err);
      });
    });
  }

  private scheduleReconnect() {
    this.reconnectAttempts += 1;
    // Exponential backoff with a ceiling, so a provider outage doesn't hammer them.
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, this.maxBackoffMs);
    console.warn(`[market-data] Disconnected. Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}).`);
    setTimeout(() => {
      this.connect().catch((err) => console.error(`[market-data] Reconnect failed: ${err.message}`));
    }, delay);
  }

  private handleMessage(raw: string) {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("[market-data] Received malformed message, discarding.");
      return;
    }

    const tick = this.parseTick(parsed);
    if (!tick) return;

    if (!this.isValidTick(tick)) {
      console.error(`[market-data] Rejected invalid tick for ${tick.symbol}: ${JSON.stringify(tick)}`);
      return;
    }

    const handler = this.subscriptions.get(tick.symbol);
    if (handler) handler(tick);
  }

  private parseTick(msg: any): Tick | null {
    // Adapt this mapping to the real provider's message schema.
    if (!msg?.symbol || !msg?.price || !msg?.timestamp) return null;
    return {
      symbol: msg.symbol,
      price: String(msg.price),
      timestamp: Number(msg.timestamp),
      receivedAt: Date.now(),
      source: this.name,
    };
  }

  private isValidTick(tick: Tick): boolean {
    const priceNum = Number(tick.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return false;

    // Timestamp sanity: reject anything from the future or absurdly old,
    // which would indicate a clock issue or a corrupted message.
    const age = Date.now() - tick.timestamp;
    if (age < -5000 || age > 60_000) return false;

    return true;
  }

  private sendSubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ type: "subscribe", channel: "ticker", symbol }));
  }

  async subscribe(symbol: string, onTick: (tick: Tick) => void): Promise<void> {
    this.subscriptions.set(symbol, onTick);
    if (this.connected) this.sendSubscribe(symbol);
  }

  async unsubscribe(symbol: string): Promise<void> {
    this.subscriptions.delete(symbol);
    this.ws?.send(JSON.stringify({ type: "unsubscribe", channel: "ticker", symbol }));
  }

  async fetchLatestPrice(symbol: string): Promise<Tick> {
    const res = await fetch(`${this.config.restBaseUrl}/ticker?symbol=${symbol}`, {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`[market-data] REST fallback failed for ${symbol}: HTTP ${res.status}`);
    }
    const data: any = await res.json();
    const tick: Tick = {
      symbol,
      price: String(data.price),
      timestamp: Number(data.timestamp ?? Date.now()),
      receivedAt: Date.now(),
      source: this.name,
    };
    if (!this.isValidTick(tick)) {
      throw new Error(`[market-data] REST fallback returned an invalid tick for ${symbol}`);
    }
    return tick;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async disconnect(): Promise<void> {
    this.ws?.close();
    this.connected = false;
  }
}
