import { MarketDataService, StaleDataError, ProviderDownError } from "../src/market-data.service";
import { MarketDataProvider, Tick } from "../src/provider.interface";

// A fake provider we fully control, so these tests are real and runnable
// without any network access or external dependency.
class FakeProvider implements MarketDataProvider {
  readonly name = "fake";
  private connected = false;
  private handlers = new Map<string, (tick: Tick) => void>();

  async connect() {
    this.connected = true;
  }
  async disconnect() {
    this.connected = false;
  }
  async subscribe(symbol: string, onTick: (tick: Tick) => void) {
    this.handlers.set(symbol, onTick);
  }
  async unsubscribe(symbol: string) {
    this.handlers.delete(symbol);
  }
  async fetchLatestPrice(symbol: string): Promise<Tick> {
    return { symbol, price: "50000.00", timestamp: Date.now(), receivedAt: Date.now(), source: "fake" };
  }
  isConnected() {
    return this.connected;
  }

  // Test helper: simulate the provider pushing a tick.
  pushTick(symbol: string, tick: Tick) {
    this.handlers.get(symbol)?.(tick);
  }
}

describe("MarketDataService", () => {
  it("throws ProviderDownError when no tick has ever been received for a symbol", () => {
    const service = new MarketDataService(new FakeProvider());
    expect(() => service.getExecutionPrice("ETH-USDT")).toThrow(ProviderDownError);
  });

  it("returns a fresh tick when one is available", async () => {
    const provider = new FakeProvider();
    const service = new MarketDataService(provider);
    await service.start(["BTC-USDT"]);

    provider.pushTick("BTC-USDT", {
      symbol: "BTC-USDT",
      price: "51000.00",
      timestamp: Date.now(),
      receivedAt: Date.now(),
      source: "fake",
    });

    const tick = service.getExecutionPrice("BTC-USDT");
    expect(tick.price).toBe("51000.00");
  });

  it("throws StaleDataError when the latest tick is older than the freshness window", async () => {
    const provider = new FakeProvider();
    const service = new MarketDataService(provider);
    await service.start(["BTC-USDT"]);

    provider.pushTick("BTC-USDT", {
      symbol: "BTC-USDT",
      price: "51000.00",
      timestamp: Date.now() - 10_000,
      receivedAt: Date.now() - 10_000, // 10s old, well past the 2s freshness window
      source: "fake",
    });

    expect(() => service.getExecutionPrice("BTC-USDT")).toThrow(StaleDataError);
  });

  it("reports health with connection state and tick age", async () => {
    const provider = new FakeProvider();
    const service = new MarketDataService(provider);
    await service.start(["BTC-USDT"]);

    const health = service.getHealth("BTC-USDT");
    expect(health.connected).toBe(true);
    expect(health.lastTickAt).not.toBeNull();
  });
});
