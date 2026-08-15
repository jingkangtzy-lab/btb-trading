// Read-only by design — the underlying AuditLog table has no UPDATE/DELETE
// grants for the application's DB role (see Phase 2 schema). There is
// intentionally no edit or delete action anywhere on this page.

const logs = [
  {
    actor: "finance.admin@btbtrading.demo",
    role: "FINANCE_ADMIN",
    action: "WITHDRAWAL_APPROVED",
    target: "WD-88210",
    time: "2026-08-14 09:12:03",
  },
  {
    actor: "kyc.reviewer@btbtrading.demo",
    role: "KYC_REVIEWER",
    action: "KYC_STATUS_CHANGED",
    target: "U-40221 (PENDING → APPROVED)",
    time: "2026-08-14 08:47:51",
  },
  {
    actor: "system:wallet-webhook",
    role: "SYSTEM",
    action: "DEPOSIT_CREDITED",
    target: "DEP-91823",
    time: "2026-08-14 08:30:14",
  },
  {
    actor: "risk.officer@btbtrading.demo",
    role: "RISK_OFFICER",
    action: "ACCOUNT_FROZEN",
    target: "U-33810",
    time: "2026-08-14 07:58:02",
  },
];

export default function AuditLogsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Audit Logs</h1>
      <p className="mb-6 text-sm text-muted">
        Read-only. Audit records cannot be edited or deleted through this or any interface.
      </p>

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">Timestamp</th>
              <th className="px-4 py-3 font-normal">Actor</th>
              <th className="px-4 py-3 font-normal">Role</th>
              <th className="px-4 py-3 font-normal">Action</th>
              <th className="px-4 py-3 font-normal">Target</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{log.time}</td>
                <td className="px-4 py-3 font-mono text-xs text-ink">{log.actor}</td>
                <td className="px-4 py-3">
                  <span className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-[10px] text-muted">
                    {log.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink">{log.action}</td>
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{log.target}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
