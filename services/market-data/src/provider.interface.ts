// Every licensed market-data provider (Coinbase Exchange, Kraken, an
// aggregator, etc.) implements this interface. The rest of the platform
// never talks to a provider's SDK directly — only to this contract — so
// swapping or adding providers never touches the trading engine.

export interface Tick {
  symbol: string; // "BTC-USDT"
  price: string; // decimal string, never a float, to avoid precision bugs
  timestamp: number; // provider-reported exchange timestamp, epoch ms
  receivedAt: number; // our local receipt time, epoch ms
  source: string; // provider identifier, for audit trail
}

export interface MarketDataProvider {
  readonly name: string;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /** Subscribe to live ticks for a symbol via the provider's realtime channel (WebSocket). */
  subscribe(symbol: string, onTick: (tick: Tick) => void): Promise<void>;
  unsubscribe(symbol: string): Promise<void>;

  /** REST fallback — used when the realtime channel is down or during startup. */
  fetchLatestPrice(symbol: string): Promise<Tick>;

  /** True if the realtime connection is currently healthy. */
  isConnected(): boolean;
}
