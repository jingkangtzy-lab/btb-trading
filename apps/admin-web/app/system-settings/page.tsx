const settingGroups = [
  {
    title: "Trading",
    settings: [
      { label: "Trading pairs enabled", value: "12 active" },
      { label: "Maker fee", value: "0.10%" },
      { label: "Taker fee", value: "0.20%" },
      { label: "Trading hours", value: "24/7" },
    ],
  },
  {
    title: "Deposits & Withdrawals",
    settings: [
      { label: "Minimum deposit (BTC)", value: "0.0005" },
      { label: "Minimum withdrawal (BTC)", value: "0.001" },
      { label: "Maximum withdrawal (BTC, daily)", value: "5.0" },
      { label: "Second-approval threshold", value: "$10,000" },
    ],
  },
  {
    title: "Platform",
    settings: [
      { label: "Maintenance mode", value: "Off" },
      { label: "KYC required for withdrawal", value: "On" },
      { label: "Referral commission rate", value: "20% of trading fees" },
    ],
  },
];

export default function SystemSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">System Settings</h1>
      <p className="mb-2 text-sm text-muted">Restricted to SUPER_ADMIN. All changes are audit-logged.</p>
      <div className="mb-6 rounded-sm border border-rust/40 bg-rust/5 px-4 py-3 text-xs text-rust">
        This page configures platform-wide parameters only. It contains no setting, override, or mechanism of any
        kind that can influence an individual customer&apos;s trade outcome or execution price — that guarantee is
        enforced in the Trading Engine&apos;s code, not by policy.
      </div>

      <div className="flex flex-col gap-6">
        {settingGroups.map((group) => (
          <div key={group.title} className="rounded-sm border border-hairline">
            <div className="border-b border-hairline bg-panel px-4 py-2 text-xs uppercase tracking-wide text-muted">
              {group.title}
            </div>
            <div className="divide-y divide-hairline">
              {group.settings.map((s) => (
                <div key={s.label} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-ink">{s.label}</span>
                  <span className="font-mono text-sm tabular text-muted">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
