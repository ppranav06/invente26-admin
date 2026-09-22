"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { getCollegeAnalytics, getDeptAnalytics, getEventsAnalytics, ApiError } from "@/app/lib/api";
import { DonutChart, GroupedBarChart } from "@/app/components/charts";

type CollegeData = {
 total_registrations: number;
 total_attended: number;
 total_events: number;
 total_depts: number;
 regs_by_event_type: Record<string, number>;
 dept_summary: Array<{ dept_name: string; reg_count: number; attend_count: number }>;
};

type DeptRow = {
 dept_name: string;
 event_count: number;
 total_registrations: number;
 total_attended: number;
 events: Array<{
 event_id: string;
 name: string;
 event_type: string;
 date: string | null;
 reg_count: number;
 attend_count: number;
 }>;
};

type EventRow = {
 event_id: string;
 name: string;
 dept_name: string;
 event_type: string;
 date: string | null;
 reg_count: number;
 attend_count: number;
};

const TYPE_COLORS: Record<string, string> = {
 TECH: "#2563eb",
 CULTURAL: "#dc2626",
 WORKSHOP: "#16a34a",
 SEMINAR: "#ea580c",
 COMPETITION: "#9333ea",
 default: "#0891b2",
};

function getTypeColor(type: string): string {
 return TYPE_COLORS[type.toUpperCase()] || TYPE_COLORS.default;
}

function StatCard({
 label,
 value,
 accent,
}: {
 label: string;
 value: number | string;
 accent?: string;
}) {
 return (
 <div className="border border-slate-200 bg-white p-5">
  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
  <p className={`mt-2 text-3xl font-extrabold ${accent || "text-slate-950"}`}>{value}</p>
 </div>
 );
}

function AttendanceRing({
 attended,
 total,
 size = 120,
}: {
 attended: number;
 total: number;
 size?: number;
}) {
 const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
 const radius = (size - 12) / 2;
 const circumference = 2 * Math.PI * radius;
 const dashLen = (pct / 100) * circumference;

 return (
 <div className="relative inline-flex items-center justify-center">
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
  <circle
   cx={size / 2}
   cy={size / 2}
   r={radius}
   fill="none"
   stroke="#f1f5f9"
   strokeWidth={10}
  />
  <circle
   cx={size / 2}
   cy={size / 2}
   r={radius}
   fill="none"
   stroke="#6366f1"
   strokeWidth={10}
   strokeDasharray={`${dashLen} ${circumference - dashLen}`}
   strokeDashoffset={circumference / 4}
   strokeLinecap="butt"
   style={{ transition: "stroke-dasharray 0.6s ease" }}
  />
  </svg>
  <div className="absolute inset-0 flex flex-col items-center justify-center">
  <span className="text-lg font-black text-slate-950">{pct}%</span>
  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
   Attendance
  </span>
  </div>
 </div>
 );
}

export default function AnalyticsPage() {
 const { user } = useAuth();
 const [collegeData, setCollegeData] = useState<CollegeData | null>(null);
 const [deptData, setDeptData] = useState<DeptRow[] | null>(null);
 const [eventsData, setEventsData] = useState<EventRow[] | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 const showCollege = user?.role === "master_admin" || user?.role === "super_admin";
 const showDept = user?.role === "master_admin" || user?.role === "super_admin" || user?.role === "dept_admin";
 const showEvents = user?.role === "master_admin" || user?.role === "super_admin" || user?.role === "dept_admin" || user?.role === "event_admin";

 useEffect(() => {
 if (!user) return;
 let cancelled = false;

 async function load() {
  setLoading(true);
  setError(null);
  try {
  const promises: Promise<unknown>[] = [];
  if (showCollege) promises.push(getCollegeAnalytics());
  if (showDept) promises.push(getDeptAnalytics());
  if (showEvents) promises.push(getEventsAnalytics());

  const results = await Promise.all(promises);
  let idx = 0;
  if (!cancelled && showCollege) setCollegeData(results[idx++] as CollegeData);
  if (!cancelled && showDept) setDeptData((results[idx++] as { rows: DeptRow[] }).rows);
  if (!cancelled && showEvents) setEventsData((results[idx++] as { rows: EventRow[] }).rows);
  } catch (err) {
  if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load analytics.");
  } finally {
  if (!cancelled) setLoading(false);
  }
 }

 void load();
 return () => { cancelled = true; };
 }, [user, showCollege, showDept, showEvents]);

 if (!user) return null;

 const eventTypeSegments = collegeData
 ? Object.entries(collegeData.regs_by_event_type).map(([type, count]) => ({
  value: count,
  color: getTypeColor(type),
  label: type,
  }))
 : [];

 const deptBarData = collegeData
 ? collegeData.dept_summary.map((d) => ({
  label: d.dept_name,
  registered: d.reg_count,
  attended: d.attend_count,
  }))
 : [];

 return (
 <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div className="mb-8">
  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Analytics</p>
  <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Registration & Attendance</h1>
  </div>

  {loading && (
  <div className="grid place-items-center py-24">
   <div className="text-center">
   <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
   <p className="text-sm font-medium text-slate-500">Loading analytics…</p>
   </div>
  </div>
  )}

  {error && (
  <div className=" border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
   {error}
  </div>
  )}

  {/* ─── College Overview ─── */}
  {!loading && !error && collegeData && showCollege && (
  <section className="mb-10">
   <h2 className="mb-5 text-lg font-bold text-slate-950">College Overview</h2>
   <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
   <StatCard label="Total Registrations" value={collegeData.total_registrations} accent="text-indigo-600" />
   <StatCard label="Attended" value={collegeData.total_attended} accent="text-emerald-600" />
   <StatCard label="Events" value={collegeData.total_events} />
   <StatCard label="Departments" value={collegeData.total_depts} />
   </div>

   {/* Charts row */}
   <div className="mt-6 grid gap-4 sm:grid-cols-2">
   {/* Registration by Event Type - Donut */}
   {eventTypeSegments.length > 0 && (
    <div className="border border-slate-200 bg-white p-6">
    <h3 className="mb-4 text-sm font-bold text-slate-950">Registrations by Type</h3>
    <div className="flex items-center gap-6">
     <DonutChart
     segments={eventTypeSegments}
     centerValue={collegeData.total_registrations}
     centerLabel="total"
     size={150}
     thickness={24}
     />
     <div className="space-y-2">
     {eventTypeSegments.map((seg) => (
      <div key={seg.label} className="flex items-center gap-2">
      <span
       className="inline-block h-3 w-3 flex-shrink-0"
       style={{ backgroundColor: seg.color }}
      />
      <span className="text-xs font-medium capitalize text-slate-600">
       {seg.label.replace(/_/g, " ")}
      </span>
      <span className="text-xs font-bold tabular-nums text-slate-950">
       {seg.value}
      </span>
      </div>
     ))}
     </div>
    </div>
    </div>
   )}

   {/* Attendance Overview - Ring */}
   <div className="border border-slate-200 bg-white p-6">
    <h3 className="mb-4 text-sm font-bold text-slate-950">Overall Attendance</h3>
    <div className="flex items-center gap-6">
    <AttendanceRing
     attended={collegeData.total_attended}
     total={collegeData.total_registrations}
    />
    <div className="space-y-3">
     <div>
     <p className="text-xs font-bold text-slate-400">Registered</p>
     <p className="text-xl font-extrabold text-slate-950">{collegeData.total_registrations}</p>
     </div>
     <div>
     <p className="text-xs font-bold text-slate-400">Attended</p>
     <p className="text-xl font-extrabold text-emerald-600">{collegeData.total_attended}</p>
     </div>
     <div>
     <p className="text-xs font-bold text-slate-400">No-show</p>
     <p className="text-xl font-extrabold text-rose-500">
      {collegeData.total_registrations - collegeData.total_attended}
     </p>
     </div>
    </div>
    </div>
   </div>
   </div>

   {/* Department registrations vs attendance bar chart */}
   {deptBarData.length > 0 && (
   <div className="mt-4 border border-slate-200 bg-white p-6">
    <h3 className="mb-5 text-sm font-bold text-slate-950">Registrations vs Attendance by Department</h3>
    <GroupedBarChart data={deptBarData} />
   </div>
   )}

   {/* Department table */}
   {collegeData.dept_summary.length > 0 && (
   <div className="mt-4 overflow-hidden border border-slate-200 bg-white">
    <div className="border-b border-slate-200 px-5 py-4">
    <h3 className="text-sm font-bold text-slate-950">Department Breakdown</h3>
    </div>
    <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
     <thead>
     <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
      <th className="px-5 py-3">Department</th>
      <th className="px-5 py-3 text-right">Registrations</th>
      <th className="px-5 py-3 text-right">Attended</th>
      <th className="px-5 py-3 w-48">Attendance</th>
     </tr>
     </thead>
     <tbody>
     {collegeData.dept_summary.map((dept) => {
      const pct = dept.reg_count > 0 ? Math.round((dept.attend_count / dept.reg_count) * 100) : 0;
      return (
      <tr key={dept.dept_name} className="border-b border-slate-50 last:border-0">
       <td className="px-5 py-3 font-medium text-slate-950">{dept.dept_name}</td>
       <td className="px-5 py-3 text-right tabular-nums text-slate-600">{dept.reg_count}</td>
       <td className="px-5 py-3 text-right tabular-nums text-slate-600">{dept.attend_count}</td>
       <td className="px-5 py-3">
       <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden bg-slate-100">
        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-bold text-slate-600">{pct}%</span>
       </div>
       </td>
      </tr>
      );
     })}
     </tbody>
    </table>
    </div>
   </div>
   )}
  </section>
  )}

  {/* ─── Departments ─── */}
  {!loading && !error && deptData && showDept && (
  <section className="mb-10">
   <h2 className="mb-5 text-lg font-bold text-slate-950">Departments</h2>
   <div className="space-y-4">
   {deptData.map((dept) => {
    const deptPct = dept.total_registrations > 0
    ? Math.round((dept.total_attended / dept.total_registrations) * 100)
    : 0;
     const eventBarData = dept.events.map((e) => ({
      label: e.name,
      registered: e.reg_count,
      attended: e.attend_count,
      color: getTypeColor(e.event_type),
      }));

    return (
    <div key={dept.dept_name} className="border border-slate-200 bg-white">
     <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
     <div>
      <h3 className="text-sm font-bold text-slate-950">{dept.dept_name}</h3>
      <p className="text-xs text-slate-500">
      {dept.event_count} events · {dept.total_registrations} registrations · {dept.total_attended} attended
      </p>
     </div>
     <div className="flex items-center gap-3">
      <div className="relative inline-flex h-14 w-14 items-center justify-center">
      <svg width={56} height={56} viewBox="0 0 56 56">
       <circle cx={28} cy={28} r={22} fill="none" stroke="#f1f5f9" strokeWidth={6} />
       <circle
       cx={28}
       cy={28}
       r={22}
       fill="none"
       stroke={deptPct >= 70 ? "#10b981" : deptPct >= 40 ? "#f59e0b" : "#ef4444"}
       strokeWidth={6}
       strokeDasharray={`${(deptPct / 100) * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
       strokeDashoffset={2 * Math.PI * 22 * 0.25}
       strokeLinecap="butt"
       />
      </svg>
      <span className="absolute text-[10px] font-black text-slate-950">{deptPct}%</span>
      </div>
     </div>
     </div>

     {eventBarData.length > 0 && (
     <div className="border-b border-slate-100 px-5 py-4">
      <GroupedBarChart data={eventBarData} />
     </div>
     )}

     {dept.events.length > 0 && (
     <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
      <thead>
       <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
       <th className="px-5 py-3">Event</th>
       <th className="px-5 py-3">Type</th>
       <th className="px-5 py-3 text-right">Regs</th>
       <th className="px-5 py-3 text-right">Attended</th>
       <th className="px-5 py-3 w-40">Attendance</th>
       <th className="px-5 py-3" />
       </tr>
      </thead>
      <tbody>
       {dept.events.map((evt) => {
       const evtPct = evt.reg_count > 0 ? Math.round((evt.attend_count / evt.reg_count) * 100) : 0;
       return (
        <tr key={evt.event_id} className="border-b border-slate-50 last:border-0">
        <td className="px-5 py-3 font-medium text-slate-950">{evt.name}</td>
        <td className="px-5 py-3">
         <span className="px-2.5 py-1 text-xs font-bold uppercase" style={{ backgroundColor: getTypeColor(evt.event_type) + "20", color: getTypeColor(evt.event_type) }}>{evt.event_type}</span>
        </td>
        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.reg_count}</td>
        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.attend_count}</td>
        <td className="px-5 py-3">
         <div className="flex items-center gap-3">
         <div className="h-2 flex-1 overflow-hidden bg-slate-100">
          <div className="h-full bg-indigo-500" style={{ width: `${evtPct}%` }} />
         </div>
         <span className="text-xs font-bold text-slate-600">{evtPct}%</span>
         </div>
        </td>
        <td className="px-5 py-3">
         <Link href={`/participants/${evt.event_id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
         Participants
         </Link>
        </td>
        </tr>
       );
       })}
      </tbody>
      </table>
     </div>
     )}
    </div>
    );
   })}
   </div>
  </section>
  )}

  {/* ─── Events-only (for event_admin) ─── */}
  {!loading && !error && eventsData && showEvents && !showDept && (
  <section>
   <h2 className="mb-5 text-lg font-bold text-slate-950">Events</h2>
   <div className="overflow-hidden border border-slate-200 bg-white">
   <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
    <thead>
     <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
     <th className="px-5 py-3">Event</th>
     <th className="px-5 py-3">Department</th>
     <th className="px-5 py-3">Type</th>
     <th className="px-5 py-3 text-right">Regs</th>
     <th className="px-5 py-3 text-right">Attended</th>
     <th className="px-5 py-3 w-40">Attendance</th>
     <th className="px-5 py-3" />
     </tr>
    </thead>
    <tbody>
     {eventsData.map((evt) => {
     const evtPct = evt.reg_count > 0 ? Math.round((evt.attend_count / evt.reg_count) * 100) : 0;
     return (
      <tr key={evt.event_id} className="border-b border-slate-50 last:border-0">
      <td className="px-5 py-3 font-medium text-slate-950">{evt.name}</td>
      <td className="px-5 py-3 text-slate-600">{evt.dept_name}</td>
      <td className="px-5 py-3">
        <span className="px-2.5 py-1 text-xs font-bold uppercase" style={{ backgroundColor: getTypeColor(evt.event_type) + "20", color: getTypeColor(evt.event_type) }}>{evt.event_type}</span>
      </td>
      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.reg_count}</td>
      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.attend_count}</td>
      <td className="px-5 py-3">
       <div className="flex items-center gap-3">
       <div className="h-2 flex-1 overflow-hidden bg-slate-100">
        <div className="h-full bg-indigo-500" style={{ width: `${evtPct}%` }} />
       </div>
       <span className="text-xs font-bold text-slate-600">{evtPct}%</span>
       </div>
      </td>
      <td className="px-5 py-3">
       <Link href={`/participants/${evt.event_id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
       Participants
       </Link>
      </td>
      </tr>
     );
     })}
    </tbody>
    </table>
   </div>
   </div>
  </section>
  )}

  {!loading && !error && !collegeData && !deptData && !eventsData && (
  <div className="grid place-items-center py-24 text-center">
   <p className="text-sm font-medium text-slate-500">No data available for your role.</p>
  </div>
  )}
 </main>
 );
}
