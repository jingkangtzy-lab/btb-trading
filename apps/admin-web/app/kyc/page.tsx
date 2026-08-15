const queue = [
  { id: "U-33810", name: "R. Kimura", country: "JP", documentType: "Passport", submitted: "2026-08-13" },
  { id: "U-60142", name: "M. Fabbri", country: "IT", documentType: "National ID", submitted: "2026-08-14" },
];

export default function KYCPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">KYC Review</h1>
      <p className="mb-6 text-sm text-muted">
        KYC_REVIEWER can approve or request more information here. This role has no access to balances or withdrawals.
      </p>

      <div className="flex flex-col gap-3">
        {queue.map((item) => (
          <div key={item.id} className="rounded-sm border border-hairline p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs tabular text-muted">{item.id}</div>
                <div className="text-ink">{item.name}</div>
                <div className="text-xs text-muted">
                  {item.documentType} · {item.country} · submitted {item.submitted}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="rounded-sm border border-hairline px-3 py-1.5 text-xs text-ink hover:border-gain hover:text-gain">
                  Approve
                </button>
                <button className="rounded-sm border border-hairline px-3 py-1.5 text-xs text-ink hover:border-gold hover:text-gold">
                  Request more info
                </button>
                <button className="rounded-sm border border-hairline px-3 py-1.5 text-xs text-ink hover:border-rust hover:text-rust">
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
