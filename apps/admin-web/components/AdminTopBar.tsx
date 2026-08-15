export function AdminTopBar() {
  return (
    <header className="flex items-center justify-between border-b border-hairline bg-bg px-6 py-3">
      <div className="flex items-center gap-2 rounded-sm border border-rust/40 bg-rust/10 px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-rust" />
        <span className="font-mono text-xs text-rust">Internal system — actions are logged and audited</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="rounded-sm border border-hairline px-2 py-1 font-mono">MFA verified</span>
          <span className="rounded-sm border border-hairline px-2 py-1 font-mono">FINANCE_ADMIN</span>
        </div>
        <div className="h-8 w-8 rounded-full bg-panel-raised" />
      </div>
    </header>
  );
}
