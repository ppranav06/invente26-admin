"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";

const ALL_LINKS = [
 { href: "/", label: "Home", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin", "volunteer"] },
 { href: "/scan", label: "Scan", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin"] },
 { href: "/events", label: "Events", allowedRoles: ["master_admin", "super_admin", "volunteer"] },
 { href: "/analytics", label: "Analytics", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin"] },
 { href: "/admin/users", label: "Users", allowedRoles: ["master_admin"] },
];

const PUBLIC_PATHS = ["/login", "/signup"];

function isActivePath(pathname: string, href: string): boolean {
 return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function AdminNavigation() {
 const pathname = usePathname();
 const router = useRouter();
 const { user, logout } = useAuth();
 const [signingOut, setSigningOut] = useState(false);
 const [menuOpen, setMenuOpen] = useState(false);

 const isPublic = PUBLIC_PATHS.includes(pathname);
 const links = user ? ALL_LINKS.filter((link) => link.allowedRoles.includes(user.role)) : [];

 useEffect(() => {
  setMenuOpen(false);
 }, [pathname]);

 if (isPublic || !user) return null;

 const handleSignOut = async () => {
  setSigningOut(true);
  try {
   await logout();
   router.push("/login");
  } finally {
   setSigningOut(false);
  }
 };

 const signOutButton = (className: string) => (
  <button
   type="button"
   onClick={handleSignOut}
   disabled={signingOut}
   className={className}
  >
   {signingOut && (
    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-rose-600" />
   )}
   {signingOut ? "Signing out…" : "Sign out"}
  </button>
 );

 return (
  <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
   <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
    <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Invente attendance home">
     <span className="grid h-10 w-10 shrink-0 place-items-center bg-white shadow-sm">
      <img src="/favicon.png" alt="" className="h-10 w-10" />
     </span>
     <span className="min-w-0">
      <span className="block truncate text-sm font-bold tracking-[0.18em] text-slate-950">INVENTE&apos;26</span>
      <span className="block truncate text-xs font-medium text-slate-500">Attendance admin</span>
     </span>
    </Link>

    <nav className="hidden items-center gap-1 bg-slate-100 p-1 md:flex" aria-label="Admin sections">
     {links.map((link) => {
      const active = isActivePath(pathname, link.href);
      return (
       <Link
        key={link.href}
        href={link.href}
        className={`px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
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

    <div className="flex items-center gap-2">
     {signOutButton(
      "hidden items-center gap-2 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60 sm:px-4 sm:text-sm md:flex",
     )}
     <button
      type="button"
      className="grid h-10 w-10 place-items-center border border-slate-200 text-slate-600 transition hover:bg-slate-50 md:hidden"
      aria-label={menuOpen ? "Close menu" : "Open menu"}
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((open) => !open)}
     >
      <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
      {menuOpen ? (
       <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
       </svg>
      ) : (
       <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
       </svg>
      )}
     </button>
    </div>
   </div>

   {menuOpen && (
    <div className="border-t border-slate-200 bg-white md:hidden">
     <nav className="mx-auto flex max-w-7xl flex-col px-4 py-3 sm:px-6" aria-label="Admin sections mobile">
      {links.map((link) => {
       const active = isActivePath(pathname, link.href);
       return (
        <Link
         key={link.href}
         href={link.href}
         className={`border-b border-slate-100 px-3 py-3 text-sm font-semibold transition last:border-b-0 ${
          active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
         }`}
        >
         {link.label}
        </Link>
       );
      })}
      {signOutButton(
       "mt-3 flex w-full items-center justify-center gap-2 border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60",
      )}
     </nav>
    </div>
   )}
  </header>
 );
}
