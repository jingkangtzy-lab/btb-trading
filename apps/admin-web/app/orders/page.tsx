const orders = [
  { id: "ORD-771029", customer: "U-40221", market: "BTC-USDT", side: "BUY", amount: "1,000.00", status: "FILLED" },
  { id: "ORD-771030", customer: "U-51092", market: "ETH-USDT", side: "SELL", amount: "400.00", status: "FILLED" },
  { id: "ORD-771031", customer: "U-29901", market: "BTC-USDT", side: "BUY", amount: "250.00", status: "PENDING" },
];

export default function OrdersPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Orders</h1>
      <p className="mb-6 text-sm text-muted">
        View-only. There is no admin action anywhere in the system that sets, overrides, or influences an individual
        customer&apos;s execution price or outcome — orders execute only against the Market Data service&apos;s
        validated price feed.
      </p>

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Market</th>
              <th className="px-4 py-3 font-normal">Side</th>
              <th className="px-4 py-3 font-normal">Amount</th>
              <th className="px-4 py-3 font-normal text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{o.id}</td>
                <td className="px-4 py-3 font-mono text-xs tabular text-ink">{o.customer}</td>
                <td className="px-4 py-3 text-ink">{o.market}</td>
                <td className={`px-4 py-3 ${o.side === "BUY" ? "text-gain" : "text-loss"}`}>{o.side}</td>
                <td className="px-4 py-3 font-mono tabular text-ink">{o.amount}</td>
                <td className="px-4 py-3 text-right text-xs text-muted">{o.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
