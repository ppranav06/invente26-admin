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
  icon: string;
  allowedRoles: string[];
};

const TILES: Tile[] = [
  {
    href: "/scan",
    label: "Scan & Attendance",
    description: "Scan tickets and mark attendance",
    icon: "🎟",
    allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.DEPT_ADMIN, ROLE.EVENT_ADMIN, ROLE.VOLUNTEER],
  },
  {
    href: "/events",
    label: "Events",
    description: "View and manage event assignments",
    icon: "📅",
    allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.DEPT_ADMIN, ROLE.EVENT_ADMIN, ROLE.VOLUNTEER],
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "Registration and attendance insights",
    icon: "📊",
    allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.DEPT_ADMIN, ROLE.EVENT_ADMIN],
  },
  {
    href: "/participants",
    label: "Participants",
    description: "View participant lists and export to Excel",
    icon: "👥",
    allowedRoles: [ROLE.MASTER_ADMIN, ROLE.SUPER_ADMIN, ROLE.DEPT_ADMIN, ROLE.EVENT_ADMIN],
  },
  {
    href: "/admin/users",
    label: "Admin Users",
    description: "Manage organizer accounts and roles",
    icon: "⚙️",
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
  const { user, logout } = useAuth();

  if (!user) return null;

  const visibleTiles = TILES.filter((tile) => tile.allowedRoles.includes(user.role));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Dashboard</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as <span className="font-medium text-slate-700">{user.email}</span> · <span className="font-medium text-indigo-600">{roleLabel(user.role)}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="mb-3 text-2xl">{tile.icon}</div>
            <h2 className="text-base font-bold text-slate-950 group-hover:text-indigo-700">{tile.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{tile.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
