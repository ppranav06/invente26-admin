"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/authContext";

const ALL_LINKS = [
 { href: "/", label: "Home", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin", "volunteer"] },
 { href: "/scan", label: "Scan", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin", "volunteer"] },
 { href: "/events", label: "Events", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin", "volunteer"] },
 { href: "/analytics", label: "Analytics", allowedRoles: ["master_admin", "super_admin", "dept_admin", "event_admin"] },
 { href: "/admin/users", label: "Users", allowedRoles: ["master_admin"] },
];

export default function AdminNavigation() {
 const pathname = usePathname();
 const router = useRouter();
 const { user, logout } = useAuth();

 const links = user ? ALL_LINKS.filter((link) => link.allowedRoles.includes(user.role)) : [];

 const handleSignOut = async () => {
 await logout();
 router.push("/login");
 };

 return (
 <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur">
  <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
  <Link href="/" className="flex items-center gap-3" aria-label="Invente attendance home">
   <span className="grid h-10 w-10 place-items-center bg-white shadow-sm">
   <img src="/favicon.png" alt="" className="h-10 w-10" />
   </span>
   <span>
   <span className="block text-sm font-bold tracking-[0.18em] text-slate-950">INVENTE&apos;26</span>
   <span className="block text-xs font-medium text-slate-500">Attendance admin</span>
   </span>
  </Link>

  <nav className="flex items-center gap-1 bg-slate-100 p-1" aria-label="Admin sections">
   {links.map((link) => {
   const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
   return (
    <Link
    key={link.href}
    href={link.href}
    className={` px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
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

  {user && (
   <button
   type="button"
   onClick={handleSignOut}
   className=" border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 sm:px-4 sm:text-sm"
   >
   Sign out
   </button>
  )}
  </div>
 </header>
 );
}
