const deposits = [
  { id: "DEP-91823", customer: "U-40221", asset: "BTC", amount: "0.05", confirmations: "3/3", status: "CREDITED" },
  { id: "DEP-91824", customer: "U-51092", asset: "USDT", amount: "500.00", confirmations: "9/12", status: "PENDING" },
  { id: "DEP-91825", customer: "U-29901", asset: "ETH", amount: "1.20", confirmations: "12/12", status: "CREDITED" },
];

export default function DepositsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Deposits</h1>
      <p className="mb-6 text-sm text-muted">
        Monitoring only — deposits are credited automatically by the Wallet service once confirmations clear. No
        admin action can manually mark a deposit as credited.
      </p>

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">ID</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Amount</th>
              <th className="px-4 py-3 font-normal">Confirmations</th>
              <th className="px-4 py-3 font-normal text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{d.id}</td>
                <td className="px-4 py-3 font-mono text-xs tabular text-ink">{d.customer}</td>
                <td className="px-4 py-3 font-mono tabular text-ink">
                  {d.amount} {d.asset}
                </td>
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{d.confirmations}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs ${d.status === "CREDITED" ? "text-gain" : "text-gold"}`}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
