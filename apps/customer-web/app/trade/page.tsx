"use client";

import { useState } from "react";

// Mock data — real prices come from the Market Data service (Phase 5) once
// this app is wired to the live WebSocket feed.
const mockMarket = {
  symbol: "BTC-USDT",
  price: "50,872.40",
  change24h: 2.14,
  high24h: "51,204.10",
  low24h: "49,660.00",
};

export default function TradePage() {
  const [mode, setMode] = useState<"simple" | "advanced">("simple");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [amount, setAmount] = useState("");

  const estimatedFee = amount ? (parseFloat(amount) * 0.002).toFixed(2) : "0.00";

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-gold">Trade</span>
          <h1 className="font-display text-2xl font-bold text-ink">{mockMarket.symbol}</h1>
        </div>
        <div className="flex rounded-sm border border-hairline p-1">
          {(["simple", "advanced"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-sm px-4 py-1.5 text-sm capitalize transition-colors ${
                mode === m ? "bg-gold text-bg" : "text-muted hover:text-ink"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </header>

      {/* Price header */}
      <div className="clip-card mb-6 flex flex-wrap items-center gap-8 p-6">
        <div>
          <div className="text-xs text-muted">Price</div>
          <div className="mt-1 font-mono text-3xl tabular text-ink">${mockMarket.price}</div>
        </div>
        <div>
          <div className="text-xs text-muted">24h change</div>
          <div className={`mt-1 font-mono text-lg tabular ${mockMarket.change24h >= 0 ? "text-gain" : "text-loss"}`}>
            {mockMarket.change24h >= 0 ? "+" : ""}
            {mockMarket.change24h.toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted">24h high</div>
          <div className="mt-1 font-mono text-lg tabular text-ink">${mockMarket.high24h}</div>
        </div>
        <div>
          <div className="text-xs text-muted">24h low</div>
          <div className="mt-1 font-mono text-lg tabular text-ink">${mockMarket.low24h}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart placeholder */}
        <div className="lg:col-span-2">
          <div className="flex h-72 items-center justify-center rounded-sm border border-hairline bg-panel text-sm text-muted md:h-96">
            Chart renders here once connected to the Market Data service&apos;s
            candle history endpoint.
          </div>
          {mode === "advanced" && (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-sm border border-hairline p-4">
                <h3 className="mb-2 text-sm text-muted">Order book</h3>
                <div className="text-xs text-muted">Populated from live market depth once connected.</div>
              </div>
              <div className="rounded-sm border border-hairline p-4">
                <h3 className="mb-2 text-sm text-muted">Recent trades</h3>
                <div className="text-xs text-muted">Populated from the trade tape once connected.</div>
              </div>
            </div>
          )}
        </div>

        {/* Order form */}
        <div className="clip-card p-6">
          <div className="mb-4 flex rounded-sm border border-hairline p-1">
            {(["BUY", "SELL"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={`flex-1 rounded-sm py-2 text-sm font-medium transition-colors ${
                  s === "BUY"
                    ? side === "BUY"
                      ? "bg-gain text-bg"
                      : "text-muted hover:text-ink"
                    : side === "SELL"
                    ? "bg-loss text-bg"
                    : "text-muted hover:text-ink"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="mb-1 block text-xs text-muted">Amount (USDT)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="w-full rounded-sm border border-hairline bg-panel px-3 py-2.5 font-mono tabular text-ink outline-none focus:border-gold"
          />
          <div className="mt-1 text-xs text-muted">Available: $2,500.00</div>

          {mode === "advanced" && (
            <div className="mt-4">
              <label className="mb-1 block text-xs text-muted">Order type</label>
              <select className="w-full rounded-sm border border-hairline bg-panel px-3 py-2.5 text-ink outline-none focus:border-gold">
                <option>Market</option>
                <option>Limit</option>
              </select>
            </div>
          )}

          <div className="mt-4 flex justify-between border-t border-hairline pt-4 text-xs text-muted">
            <span>Estimated fee</span>
            <span className="font-mono tabular text-ink">${estimatedFee}</span>
          </div>

          <button
            className={`mt-6 w-full rounded-sm py-3 text-sm font-medium text-bg transition-opacity hover:opacity-90 ${
              side === "BUY" ? "bg-gain" : "bg-loss"
            }`}
          >
            Review order
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            Execution price is set at the moment your order is confirmed — never before.
          </p>
        </div>
      </div>
    </div>
  );
}
