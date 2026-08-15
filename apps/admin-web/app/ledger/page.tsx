"use client";

import { useState } from "react";

const entries = [
  { id: "LE-90213", account: "U-40221", type: "BLOCKCHAIN_DEPOSIT", amount: "+0.05 BTC", time: "09:41:02" },
  { id: "LE-90214", account: "U-51092", type: "TRADE_SETTLEMENT", amount: "-400.00 USDT", time: "09:38:17" },
  { id: "LE-90215", account: "U-33810", type: "MANUAL_ADJUSTMENT", amount: "+50.00 USDT", time: "09:12:44" },
  { id: "LE-90216", account: "U-29901", type: "WITHDRAWAL", amount: "-120.00 USDT", time: "08:55:03" },
];

const referenceTypeColor: Record<string, string> = {
  BLOCKCHAIN_DEPOSIT: "text-gain",
  MANUAL_ADJUSTMENT: "text-gold",
  WITHDRAWAL: "text-rust",
  TRADE_SETTLEMENT: "text-muted",
};

export default function LedgerPage() {
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Ledger</h1>
          <p className="text-sm text-muted">The source of truth for every balance on the platform.</p>
        </div>
        <button
          onClick={() => setShowAdjustmentForm((v) => !v)}
          className="rounded-sm border border-gold px-4 py-2 text-sm text-gold hover:bg-gold/10"
        >
          New manual adjustment
        </button>
      </div>

      {showAdjustmentForm && (
        <div className="clip-card mb-6 p-6">
          <h2 className="mb-1 text-sm font-medium text-ink">Manual balance adjustment</h2>
          <p className="mb-4 text-xs text-muted">
            This is recorded as <span className="text-gold">MANUAL_ADJUSTMENT</span> — it is never displayed or stored
            as a blockchain deposit. A reference number and reason are required, and adjustments above the
            configured threshold require a second approver before they take effect.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted">Customer ID</label>
              <input className="w-full rounded-sm border border-hairline bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Asset</label>
              <input className="w-full rounded-sm border border-hairline bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Amount</label>
              <input className="w-full rounded-sm border border-hairline bg-panel px-3 py-2 font-mono text-sm text-ink outline-none focus:border-gold" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Reference number</label>
              <input className="w-full rounded-sm border border-hairline bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-muted">Reason (required)</label>
              <textarea className="w-full rounded-sm border border-hairline bg-panel px-3 py-2 text-sm text-ink outline-none focus:border-gold" rows={2} />
            </div>
          </div>
          <button className="mt-4 rounded-sm bg-gold px-4 py-2 text-sm text-bg hover:opacity-90">
            Submit for approval
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-sm border border-hairline">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-hairline bg-panel text-left text-xs text-muted">
              <th className="px-4 py-3 font-normal">Entry</th>
              <th className="px-4 py-3 font-normal">Account</th>
              <th className="px-4 py-3 font-normal">Type</th>
              <th className="px-4 py-3 font-normal">Time</th>
              <th className="px-4 py-3 font-normal text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{e.id}</td>
                <td className="px-4 py-3 font-mono text-xs tabular text-ink">{e.account}</td>
                <td className={`px-4 py-3 font-mono text-xs ${referenceTypeColor[e.type]}`}>{e.type}</td>
                <td className="px-4 py-3 font-mono text-xs tabular text-muted">{e.time}</td>
                <td className="px-4 py-3 text-right font-mono tabular text-ink">{e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
