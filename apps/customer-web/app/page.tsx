// NOTE: this UI currently renders mock data. Wiring to the real Ledger,
// Trading Engine, and Wallet services (built in Phases 4/6/7) happens once
// this app is connected to the live API — tracked as a follow-up, not
// pretended to be finished here.

const mockAssets = [
  { symbol: "BTC", name: "Bitcoin", balance: "0.4218", valueUsd: "21,502.60", change24h: 2.14 },
  { symbol: "ETH", name: "Ethereum", balance: "3.1042", valueUsd: "9,842.15", change24h: -0.87 },
  { symbol: "USDT", name: "Tether", balance: "2,500.00", valueUsd: "2,500.00", change24h: 0.0 },
];

const mockPositions = [
  { market: "BTC-USDT", side: "LONG", size: "1,000.00", entry: "50,120.00", mark: "50,872.40", pnl: 15.0 },
  { market: "ETH-USDT", side: "SHORT", size: "400.00", entry: "3,180.00", mark: "3,167.50", pnl: 1.57 },
];

const mockActivity = [
  { label: "Deposit — BTC", time: "2h ago", amount: "+0.05 BTC" },
  { label: "Trade closed — ETH-USDT", time: "6h ago", amount: "+$12.40" },
  { label: "Withdrawal — USDT", time: "1d ago", amount: "-500.00 USDT" },
];

function fmtPct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
      <header className="mb-10 flex flex-col gap-1">
        <span className="font-mono text-xs uppercase tracking-widest text-gold">Dashboard</span>
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Good evening, Alex.</h1>
      </header>

      {/* Balance summary */}
      <section className="clip-card mb-8 p-6 md:p-8">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="text-xs text-muted">Total balance</div>
            <div className="mt-1 font-mono text-4xl tabular text-ink md:text-5xl">$33,844.75</div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-xs text-muted">Today&apos;s P&amp;L</div>
              <div className="mt-1 font-mono text-lg tabular text-gain">+$284.10</div>
            </div>
            <div>
              <div className="text-xs text-muted">Available</div>
              <div className="mt-1 font-mono text-lg tabular text-ink">$2,500.00</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 border-t border-hairline pt-6">
          {["Deposit", "Withdraw", "Trade", "Transfer"].map((action) => (
            <button
              key={action}
              className="rounded-sm border border-hairline px-5 py-2.5 text-sm text-ink transition-colors hover:border-gold hover:text-gold"
            >
              {action}
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-3">
        {/* Assets */}
        <section className="md:col-span-2">
          <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-wide text-muted">Assets</h2>
          <div className="overflow-hidden rounded-sm border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted">
                  <th className="px-4 py-3 font-normal">Asset</th>
                  <th className="px-4 py-3 font-normal">Balance</th>
                  <th className="px-4 py-3 font-normal">Value</th>
                  <th className="px-4 py-3 font-normal text-right">24h</th>
                </tr>
              </thead>
              <tbody>
                {mockAssets.map((asset) => (
                  <tr key={asset.symbol} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                    <td className="px-4 py-3">
                      <div className="text-ink">{asset.symbol}</div>
                      <div className="text-xs text-muted">{asset.name}</div>
                    </td>
                    <td className="px-4 py-3 font-mono tabular text-ink">{asset.balance}</td>
                    <td className="px-4 py-3 font-mono tabular text-ink">${asset.valueUsd}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular ${
                        asset.change24h > 0 ? "text-gain" : asset.change24h < 0 ? "text-loss" : "text-muted"
                      }`}
                    >
                      {fmtPct(asset.change24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mb-3 mt-8 font-display text-sm font-medium uppercase tracking-wide text-muted">
            Open positions
          </h2>
          <div className="overflow-hidden rounded-sm border border-hairline">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-muted">
                  <th className="px-4 py-3 font-normal">Market</th>
                  <th className="px-4 py-3 font-normal">Side</th>
                  <th className="px-4 py-3 font-normal">Size</th>
                  <th className="px-4 py-3 font-normal">Entry</th>
                  <th className="px-4 py-3 font-normal">Mark</th>
                  <th className="px-4 py-3 font-normal text-right">P&amp;L</th>
                </tr>
              </thead>
              <tbody>
                {mockPositions.map((pos) => (
                  <tr key={pos.market} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                    <td className="px-4 py-3 text-ink">{pos.market}</td>
                    <td className={`px-4 py-3 ${pos.side === "LONG" ? "text-gain" : "text-loss"}`}>{pos.side}</td>
                    <td className="px-4 py-3 font-mono tabular text-ink">{pos.size}</td>
                    <td className="px-4 py-3 font-mono tabular text-muted">{pos.entry}</td>
                    <td className="px-4 py-3 font-mono tabular text-ink">{pos.mark}</td>
                    <td
                      className={`px-4 py-3 text-right font-mono tabular ${pos.pnl >= 0 ? "text-gain" : "text-loss"}`}
                    >
                      {fmtPct(pos.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent activity */}
        <section>
          <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-wide text-muted">
            Recent activity
          </h2>
          <div className="flex flex-col divide-y divide-hairline rounded-sm border border-hairline">
            {mockActivity.map((item) => (
              <div key={item.label} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm text-ink">{item.label}</div>
                  <div className="text-xs text-muted">{item.time}</div>
                </div>
                <div className="font-mono text-sm tabular text-ink">{item.amount}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
