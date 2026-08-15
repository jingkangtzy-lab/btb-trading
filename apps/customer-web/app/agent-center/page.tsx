// Mock data — real numbers come from ReferralService.getAgentStats() once
// this page is connected. Note the copy throughout: commission is described
// only as a share of trading fees generated, never as guaranteed income or
// investment return, per the platform's marketing-claims requirement.

const stats = [
  { label: "Referred users", value: "34" },
  { label: "Active this month", value: "21" },
  { label: "Trading volume generated", value: "$182,400" },
  { label: "Commission earned (lifetime)", value: "$914.20" },
];

const commissionHistory = [
  { date: "2026-08-13", from: "U-88213", amount: "+$4.20" },
  { date: "2026-08-12", from: "U-51092", amount: "+$1.85" },
  { date: "2026-08-11", from: "U-88213", amount: "+$6.10" },
];

export default function AgentCenterPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-12">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-gold">Agent Center</span>
        <h1 className="font-display text-2xl font-bold text-ink">Invite friends, earn a share of fees</h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          You earn a percentage of the trading fees your referrals generate — not a percentage of their gains or
          losses. There is no guaranteed return, and referral earnings are not investment income.
        </p>
      </header>

      <div className="clip-card mb-8 p-6">
        <div className="text-xs text-muted">Your referral link</div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value="https://btbtrading.com/r/BTB-4F2A9C"
            className="flex-1 rounded-sm border border-hairline bg-panel px-3 py-2.5 font-mono text-sm text-ink"
          />
          <button className="rounded-sm border border-hairline px-5 py-2.5 text-sm text-ink hover:border-gold hover:text-gold">
            Copy link
          </button>
        </div>
        <div className="mt-3 text-xs text-muted">
          Referral code: <span className="font-mono text-gold">BTB-4F2A9C</span>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-sm border border-hairline p-4">
            <div className="text-xs text-muted">{s.label}</div>
            <div className="mt-1 font-mono text-xl tabular text-ink">{s.value}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-display text-sm font-medium uppercase tracking-wide text-muted">
        Commission history
      </h2>
      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">Date</th>
              <th className="px-4 py-3 font-normal">From</th>
              <th className="px-4 py-3 font-normal text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {commissionHistory.map((c, i) => (
              <tr key={i} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{c.date}</td>
                <td className="px-4 py-3 font-mono text-xs tabular text-ink">{c.from}</td>
                <td className="px-4 py-3 text-right font-mono tabular text-gain">{c.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
