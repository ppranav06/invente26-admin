"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/scan", label: "Scan attendance" },
  { href: "/events", label: "Modify events" },
];

export default function AdminNavigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
        <Link href="/scan" className="flex items-center gap-3" aria-label="Invente attendance home">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-sm">
            I
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.18em] text-slate-950">INVENTE&apos;26</span>
            <span className="block text-xs font-medium text-slate-500">Attendance admin</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-xl bg-slate-100 p-1" aria-label="Admin sections">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  active
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:bg-white/70 hover:text-slate-950"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
