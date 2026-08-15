import { MarketDataProvider, Tick } from "./provider.interface";

export class StaleDataError extends Error {
  constructor(symbol: string, ageMs: number) {
    super(`Price for ${symbol} is stale (${ageMs}ms old). Refusing to execute against it.`);
  }
}

export class ProviderDownError extends Error {
  constructor(symbol: string) {
    super(`No connected market-data provider for ${symbol}.`);
  }
}

// Default: a tick older than this can never be used to execute a trade.
// This directly protects customers and the platform from executing against
// a frozen/wrong price during a provider outage.
const MAX_TICK_AGE_MS = 2_000;

interface HealthStatus {
  connected: boolean;
  lastTickAt: number | null;
  lastTickAgeMs: number | null;
}

export class MarketDataService {
  private latestTicks = new Map<string, Tick>();
  private lastHealthLog = new Map<string, number>();

  constructor(private provider: MarketDataProvider) {}

  async start(symbols: string[]) {
    await this.provider.connect();
    for (const symbol of symbols) {
      // Seed with a REST snapshot immediately so we're never empty at startup,
      // then switch to the realtime feed for ongoing updates.
      try {
        const tick = await this.provider.fetchLatestPrice(symbol);
        this.latestTicks.set(symbol, tick);
      } catch (err) {
        console.error(`[market-data] Startup REST snapshot failed for ${symbol}: ${(err as Error).message}`);
      }

      await this.provider.subscribe(symbol, (tick) => {
        this.latestTicks.set(symbol, tick);
      });
    }
  }

  /**
   * Returns the current, validated, non-stale price for a symbol, or throws.
   * This is the ONLY method the trading engine is allowed to call to get an
   * execution price — it can never be bypassed with a manually supplied price.
   */
  getExecutionPrice(symbol: string): Tick {
    if (!this.provider.isConnected()) {
      // We can still serve a cached tick if it's fresh enough, but log the
      // degraded state loudly — an admin/risk dashboard should alert on this.
      console.error(`[market-data] Provider disconnected while serving ${symbol}.`);
    }

    const tick = this.latestTicks.get(symbol);
    if (!tick) {
      throw new ProviderDownError(symbol);
    }

    const age = Date.now() - tick.receivedAt;
    if (age > MAX_TICK_AGE_MS) {
      throw new StaleDataError(symbol, age);
    }

    return tick;
  }

  getHealth(symbol: string): HealthStatus {
    const tick = this.latestTicks.get(symbol);
    return {
      connected: this.provider.isConnected(),
      lastTickAt: tick?.receivedAt ?? null,
      lastTickAgeMs: tick ? Date.now() - tick.receivedAt : null,
    };
  }

  async stop() {
    await this.provider.disconnect();
  }
}
