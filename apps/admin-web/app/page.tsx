// Mock data — real numbers come from aggregate queries across the Ledger,
// Trading Engine, Wallet, and KYC services once this app is connected.

const metrics = [
  { label: "Registered users", value: "18,204" },
  { label: "Active users (24h)", value: "2,918" },
  { label: "Pending KYC", value: "47" },
  { label: "Open orders", value: "312" },
  { label: "Open positions", value: "1,084" },
  { label: "24h trading volume", value: "$4.2M" },
  { label: "Pending withdrawals", value: "9" },
  { label: "Fees collected (24h)", value: "$8,410" },
];

const alerts = [
  { level: "risk", text: "Withdrawal #WD-88213 flagged — new destination address, above risk threshold." },
  { level: "system", text: "Market data provider latency elevated (avg 340ms, threshold 200ms)." },
  { level: "risk", text: "Account #U-40221 — 4 failed MFA attempts in the last hour." },
];

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 font-display text-xl font-bold text-ink">Overview</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-sm border border-hairline bg-panel p-4">
            <div className="text-xs text-muted">{m.label}</div>
            <div className="mt-1 font-mono text-xl tabular text-ink">{m.value}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-wide text-muted">Alerts</h2>
      <div className="flex flex-col divide-y divide-hairline rounded-sm border border-hairline">
        {alerts.map((a, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase ${
                a.level === "risk" ? "bg-rust/15 text-rust" : "bg-panel-raised text-muted"
              }`}
            >
              {a.level}
            </span>
            <span className="text-sm text-ink">{a.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
