const links = [
  { href: "/", label: "Dashboard" },
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/wallet", label: "Wallet" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
];

export function SideNav() {
  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-hairline bg-panel px-6 py-8">
      <div className="mb-10">
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          BTB <span className="text-gold">TRADING</span>
        </span>
      </div>
      <nav className="flex flex-col gap-1">
        {links.map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            className="group flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-muted transition-colors hover:bg-panel-raised hover:text-ink"
          >
            <span className="font-mono text-xs tabular text-hairline group-hover:text-gold">
              {String(i + 1).padStart(2, "0")}
            </span>
            {link.label}
          </a>
        ))}
      </nav>
      <div className="mt-auto border-t border-hairline pt-6">
        <div className="text-xs text-muted">Signed in as</div>
        <div className="mt-1 font-mono text-sm text-ink">alex@btbtrading.demo</div>
      </div>
    </aside>
  );
}
