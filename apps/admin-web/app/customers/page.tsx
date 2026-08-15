const customers = [
  { id: "U-40221", email: "j.martin@example.com", kyc: "APPROVED", status: "ACTIVE", balance: "$14,204.10" },
  { id: "U-51092", email: "s.ochoa@example.com", kyc: "APPROVED", status: "ACTIVE", balance: "$1,200.00" },
  { id: "U-33810", email: "r.kimura@example.com", kyc: "PENDING", status: "FROZEN", balance: "$8,910.44" },
  { id: "U-29901", email: "a.diallo@example.com", kyc: "APPROVED", status: "ACTIVE", balance: "$402.15" },
];

export default function CustomersPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Customers</h1>
      <p className="mb-6 text-sm text-muted">
        View-only for most roles. Balance and identity changes route through the Ledger and KYC pages, never edited directly here.
      </p>

      <input
        placeholder="Search by email, customer ID, or wallet address"
        className="mb-6 w-full max-w-md rounded-sm border border-hairline bg-panel px-3 py-2.5 text-sm text-ink outline-none focus:border-gold"
      />

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">Customer ID</th>
              <th className="px-4 py-3 font-normal">Email</th>
              <th className="px-4 py-3 font-normal">KYC</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="cursor-pointer border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 font-mono text-xs tabular text-ink">{c.id}</td>
                <td className="px-4 py-3 text-ink">{c.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${c.kyc === "APPROVED" ? "text-gain" : "text-rust"}`}>{c.kyc}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs ${c.status === "ACTIVE" ? "text-muted" : "text-rust"}`}>{c.status}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-ink">{c.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
