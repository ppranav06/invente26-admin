"use client";

import Link from "next/link";
import { useAuth } from "./lib/authContext";

const ROLE = {
 MASTER_ADMIN: "master_admin",
 SUPER_ADMIN: "super_admin",
 DEPT_ADMIN: "dept_admin",
 EVENT_ADMIN: "event_admin",
 VOLUNTEER: "volunteer",
} as const;

type Tile = {
 href: string;
 label: string;
 description: string;
 icon: React.ReactNode;
 allowedRoles: string[];
};

function ScanIcon() {
 return (
 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
  <path strokeLinecap="square" strokeLinejoin="miter" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
  <path strokeLinecap="square" strokeLinejoin="miter" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
 </svg>
 );
}

function EventsIcon() {
 return (
 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
  <path strokeLinecap="square" strokeLinejoin="miter" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
 </svg>
 );
}

function AnalyticsIcon() {
 return (
 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
  <path strokeLinecap="square" strokeLinejoin="miter" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
 </svg>
 );
}

function UsersIcon() {
 return (
 <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
  <path strokeLinecap="square" strokeLinejoin="miter" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
 </svg>
 );
}

const TILES: Tile[] = [
 {
 href: "/scan",
 label: "Scan & Attendance",
 description: "Scan tickets and mark attendance in real time",
 icon: <ScanIcon />,
    allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.DEPT_ADMIN, ROLE.EVENT_ADMIN],
  },
  {
    href: "/events",
    label: "Events",
    description: "View and manage event assignments",
    icon: <EventsIcon />,
    allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.VOLUNTEER],
 },
 {
 href: "/analytics",
 label: "Analytics",
 description: "Registration and attendance insights",
 icon: <AnalyticsIcon />,
 allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.DEPT_ADMIN, ROLE.EVENT_ADMIN],
 },
 {
 href: "/admin/users",
 label: "Admin Users",
 description: "Manage organizer accounts and roles",
 icon: <UsersIcon />,
 allowedRoles: [ROLE.MASTER_ADMIN],
 },
];

function roleLabel(role: string): string {
 const labels: Record<string, string> = {
 master_admin: "Master Admin",
 super_admin: "Super Admin",
 dept_admin: "Dept Admin",
 event_admin: "Event Admin",
 volunteer: "Volunteer",
 };
 return labels[role] || role;
}

export default function Home() {
 const { user } = useAuth();

 if (!user) return null;

 const visibleTiles = TILES.filter((tile) => tile.allowedRoles.includes(user.role));

 return (
 <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
  <div className="mb-10">
  <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
   Dashboard
  </h1>
  <p className="mt-2 text-sm text-slate-500">
   Signed in as{" "}
   <span className="font-semibold text-slate-700">{user.email}</span>
   <span className="mx-1.5 text-slate-300">|</span>
   <span className="font-semibold text-indigo-600">{roleLabel(user.role)}</span>
  </p>
  </div>

  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
  {visibleTiles.map((tile) => (
   <Link
   key={tile.href}
   href={tile.href}
   className="group border border-slate-200 bg-white p-6 transition hover:border-indigo-300 hover:shadow-lg"
   >
   <div className="mb-4 flex h-10 w-10 items-center justify-center bg-slate-100 text-slate-600 transition group-hover:bg-indigo-600 group-hover:text-white">
    {tile.icon}
   </div>
   <h2 className="text-sm font-bold uppercase tracking-wide text-slate-950 group-hover:text-indigo-700">
    {tile.label}
   </h2>
   <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
    {tile.description}
   </p>
   <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400 transition group-hover:text-indigo-600">
    Open
    <span className="ml-1 inline-block transition group-hover:translate-x-0.5">&rarr;</span>
   </div>
   </Link>
  ))}
  </div>
 </main>
 );
}
