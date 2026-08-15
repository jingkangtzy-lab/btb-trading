const links = [
  { href: "/", label: "Home" },
  { href: "/markets", label: "Markets" },
  { href: "/trade", label: "Trade" },
  { href: "/wallet", label: "Wallet" },
  { href: "/profile", label: "Profile" },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-hairline bg-panel md:hidden">
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="flex flex-1 flex-col items-center gap-1 py-3 text-[11px] text-muted active:text-gold"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-hairline" />
          {link.label}
        </a>
      ))}
    </nav>
  );
}
