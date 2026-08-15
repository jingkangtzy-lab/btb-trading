const admins = [
  { email: "you@btbtrading.demo", role: "FINANCE_ADMIN", mfa: true, lastActive: "Now" },
  { email: "kyc.reviewer@btbtrading.demo", role: "KYC_REVIEWER", mfa: true, lastActive: "1h ago" },
  { email: "risk.officer@btbtrading.demo", role: "RISK_OFFICER", mfa: true, lastActive: "3h ago" },
  { email: "root@btbtrading.demo", role: "SUPER_ADMIN", mfa: true, lastActive: "5h ago" },
];

export default function AdminUsersPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Admin Users</h1>
      <p className="mb-6 text-sm text-muted">
        Restricted to SUPER_ADMIN. MFA is mandatory for every admin account and cannot be disabled from this or any
        interface.
      </p>

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">Email</th>
              <th className="px-4 py-3 font-normal">Role</th>
              <th className="px-4 py-3 font-normal">MFA</th>
              <th className="px-4 py-3 font-normal text-right">Last active</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.email} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 text-ink">{a.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-sm border border-hairline px-2 py-0.5 font-mono text-[10px] text-muted">
                    {a.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gain">{a.mfa ? "Verified" : "—"}</td>
                <td className="px-4 py-3 text-right text-xs text-muted">{a.lastActive}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
