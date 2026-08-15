const sections = [
  { group: "Operations", items: ["Overview", "Customers", "KYC", "Deposits", "Withdrawals"] },
  { group: "Markets", items: ["Ledger", "Orders", "Trades", "Markets"] },
  { group: "Growth & Risk", items: ["Agents", "Risk", "Reports", "Support"] },
  { group: "Administration", items: ["System Settings", "Admin Users", "Audit Logs"] },
];

export function AdminSideNav() {
  return (
    <aside className="w-64 shrink-0 border-r border-hairline bg-panel px-5 py-6">
      <div className="mb-8 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-rust" />
        <span className="font-display text-sm font-bold tracking-wide text-ink">
          BTB <span className="text-muted">OPERATIONS</span>
        </span>
      </div>

      <nav className="flex flex-col gap-6">
        {sections.map((section) => (
          <div key={section.group}>
            <div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest text-muted">
              {section.group}
            </div>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => (
                <a
                  key={item}
                  href={`/${item.toLowerCase().replace(/\s+/g, "-")}`}
                  className="rounded-sm px-2.5 py-2 text-sm text-muted transition-colors hover:bg-panel-raised hover:text-ink"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
