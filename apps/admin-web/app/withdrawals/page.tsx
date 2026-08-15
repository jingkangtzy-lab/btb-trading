"use client";

import { useState } from "react";

// Mock queue — real data comes from WithdrawalService in Phase 7. The
// approve/reject actions below call the same authorization rules enforced
// server-side in withdrawal.service.ts: this UI reflects that logic, it
// does not substitute for it. A user without FINANCE_ADMIN/SUPER_ADMIN
// would never see working buttons here even if they reached this page.

interface WithdrawalRow {
  id: string;
  customer: string;
  asset: string;
  amount: string;
  destination: string;
  kyc: "APPROVED" | "PENDING";
  requiresSecondApproval: boolean;
  approvedBy: string | null;
}

const initialQueue: WithdrawalRow[] = [
  {
    id: "WD-88213",
    customer: "U-40221",
    asset: "BTC",
    amount: "0.85",
    destination: "bc1q...7g9h",
    kyc: "APPROVED",
    requiresSecondApproval: true,
    approvedBy: null,
  },
  {
    id: "WD-88214",
    customer: "U-51092",
    asset: "USDT",
    amount: "1,200.00",
    destination: "TXn9...k2p4",
    kyc: "APPROVED",
    requiresSecondApproval: false,
    approvedBy: null,
  },
  {
    id: "WD-88215",
    customer: "U-33810",
    asset: "ETH",
    amount: "12.40",
    destination: "0x8f...d5f7",
    kyc: "PENDING",
    requiresSecondApproval: true,
    approvedBy: "you@btbtrading.demo",
  },
];

const CURRENT_ADMIN = "you@btbtrading.demo";

export default function WithdrawalsPage() {
  const [queue, setQueue] = useState(initialQueue);

  function approve(id: string) {
    setQueue((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        if (w.kyc !== "APPROVED") return w; // blocked — mirrors server-side rule
        if (w.requiresSecondApproval && w.approvedBy && w.approvedBy === CURRENT_ADMIN) return w; // blocked — same approver
        return { ...w, approvedBy: w.approvedBy ?? CURRENT_ADMIN };
      })
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">Withdrawals</h1>
      <p className="mb-6 text-sm text-muted">
        Amounts above the risk threshold require approval from two different administrators.
      </p>

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">ID</th>
              <th className="px-4 py-3 font-normal">Customer</th>
              <th className="px-4 py-3 font-normal">Amount</th>
              <th className="px-4 py-3 font-normal">Destination</th>
              <th className="px-4 py-3 font-normal">KYC</th>
              <th className="px-4 py-3 font-normal">Approval</th>
              <th className="px-4 py-3 font-normal text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {queue.map((w) => {
              const kycBlocked = w.kyc !== "APPROVED";
              const sameApproverBlocked = w.requiresSecondApproval && w.approvedBy === CURRENT_ADMIN;
              const fullyApproved = w.requiresSecondApproval
                ? !!w.approvedBy && w.approvedBy !== CURRENT_ADMIN
                : !!w.approvedBy;
              const canApprove = !kycBlocked && !fullyApproved && !sameApproverBlocked;

              return (
                <tr key={w.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                  <td className="px-4 py-3 font-mono text-xs tabular text-ink">{w.id}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular text-muted">{w.customer}</td>
                  <td className="px-4 py-3 font-mono tabular text-ink">
                    {w.amount} {w.asset}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs tabular text-muted">{w.destination}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${w.kyc === "APPROVED" ? "text-gain" : "text-rust"}`}>{w.kyc}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {w.requiresSecondApproval ? (
                      fullyApproved ? (
                        <span className="text-gain">2 of 2 approved</span>
                      ) : w.approvedBy ? (
                        <span>1 of 2 — awaiting a different approver</span>
                      ) : (
                        <span>0 of 2 — second approval required</span>
                      )
                    ) : fullyApproved ? (
                      <span className="text-gain">Approved</span>
                    ) : (
                      <span>Standard — single approval</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={!canApprove}
                      onClick={() => approve(w.id)}
                      className="mr-2 rounded-sm border border-hairline px-3 py-1.5 text-xs text-ink transition-colors enabled:hover:border-gain enabled:hover:text-gain disabled:cursor-not-allowed disabled:opacity-30"
                      title={
                        kycBlocked
                          ? "Blocked: KYC not approved"
                          : sameApproverBlocked
                          ? "Blocked: you already gave the first approval"
                          : fullyApproved
                          ? "Already fully approved"
                          : "Approve"
                      }
                    >
                      Approve
                    </button>
                    <button className="rounded-sm border border-hairline px-3 py-1.5 text-xs text-ink transition-colors hover:border-rust hover:text-rust">
                      Reject
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
