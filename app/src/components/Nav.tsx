"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/upload", label: "Mint Invoice" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/faucet", label: "Faucet" },
  { href: "/admin", label: "Admin" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            Refaktör
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {links.map(l => {
              const active = path === l.href || path.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    active
                      ? "text-blue-600 font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
