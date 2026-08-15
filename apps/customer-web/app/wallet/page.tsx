"use client";

import { useState } from "react";

// Mock data — real addresses come from the Wallet service's
// getOrCreateDepositAddress() (Phase 7), backed by a licensed custody
// provider. This UI never invents an address.
const networksByAsset: Record<string, { code: string; label: string; minDeposit: string; confirmations: number; memoRequired: boolean }[]> = {
  BTC: [{ code: "BTC", label: "Bitcoin", minDeposit: "0.0005 BTC", confirmations: 3, memoRequired: false }],
  ETH: [{ code: "ERC20", label: "Ethereum (ERC-20)", minDeposit: "0.01 ETH", confirmations: 12, memoRequired: false }],
  USDT: [
    { code: "ERC20", label: "Ethereum (ERC-20)", minDeposit: "10 USDT", confirmations: 12, memoRequired: false },
    { code: "TRC20", label: "Tron (TRC-20)", minDeposit: "10 USDT", confirmations: 20, memoRequired: false },
  ],
};

const mockAddress = "bc1q9h5yj3k7m2p4x8z0v6n1c3d5f7g9h2j4k6l8m";

export default function WalletPage() {
  const [asset, setAsset] = useState<"BTC" | "ETH" | "USDT">("BTC");
  const [networkIdx, setNetworkIdx] = useState(0);
  const network = networksByAsset[asset][networkIdx];

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-10 md:py-12">
      <header className="mb-8">
        <span className="font-mono text-xs uppercase tracking-widest text-gold">Wallet</span>
        <h1 className="font-display text-2xl font-bold text-ink">Deposit</h1>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="clip-card p-6">
          <label className="mb-1 block text-xs text-muted">Asset</label>
          <select
            value={asset}
            onChange={(e) => {
              setAsset(e.target.value as typeof asset);
              setNetworkIdx(0);
            }}
            className="mb-4 w-full rounded-sm border border-hairline bg-panel px-3 py-2.5 text-ink outline-none focus:border-gold"
          >
            {Object.keys(networksByAsset).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <label className="mb-1 block text-xs text-muted">Network</label>
          <select
            value={networkIdx}
            onChange={(e) => setNetworkIdx(Number(e.target.value))}
            className="mb-4 w-full rounded-sm border border-hairline bg-panel px-3 py-2.5 text-ink outline-none focus:border-gold"
          >
            {networksByAsset[asset].map((n, i) => (
              <option key={n.code} value={i}>
                {n.label}
              </option>
            ))}
          </select>

          <div className="rounded-sm border border-gold/40 bg-gold/5 px-4 py-3 text-xs text-gold">
            Only send {asset} on the {network.label} network to this address. Sending any other
            asset or using the wrong network will result in permanent loss of funds.
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between border-t border-hairline pt-3">
              <dt className="text-muted">Minimum deposit</dt>
              <dd className="font-mono tabular text-ink">{network.minDeposit}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Confirmations required</dt>
              <dd className="font-mono tabular text-ink">{network.confirmations}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Memo / tag</dt>
              <dd className="text-ink">{network.memoRequired ? "Required — see below" : "Not required"}</dd>
            </div>
          </dl>
        </div>

        <div className="clip-card flex flex-col items-center p-6 text-center">
          <div className="mb-4 flex h-40 w-40 items-center justify-center rounded-sm border border-hairline bg-panel-raised text-xs text-muted">
            QR code renders here
            <br />
            (generated from the live address)
          </div>
          <div className="mb-1 text-xs text-muted">Deposit address</div>
          <div className="mb-4 break-all rounded-sm border border-hairline bg-panel px-3 py-2 font-mono text-sm text-ink">
            {mockAddress}
          </div>
          <button className="w-full rounded-sm border border-hairline py-2.5 text-sm text-ink transition-colors hover:border-gold hover:text-gold">
            Copy address
          </button>

          <div className="mt-6 w-full border-t border-hairline pt-4 text-left">
            <div className="mb-2 text-xs text-muted">Recent deposits</div>
            <div className="flex items-center justify-between rounded-sm border border-hairline px-3 py-2 text-sm">
              <span className="text-ink">0.02 BTC</span>
              <span className="font-mono text-xs tabular text-gold">2 / 3 confirmations</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
