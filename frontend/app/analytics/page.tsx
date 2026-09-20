"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { getCollegeAnalytics, getDeptAnalytics, getEventsAnalytics, ApiError } from "@/app/lib/api";

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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function PercentBar({ attended, total }: { attended: number; total: number }) {
  const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600">{pct}%</span>
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && collegeData && showCollege && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-950">College Overview</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Registrations" value={collegeData.total_registrations} />
            <StatCard label="Attended" value={collegeData.total_attended} />
            <StatCard label="Events" value={collegeData.total_events} />
            <StatCard label="Departments" value={collegeData.total_depts} />
          </div>

          {collegeData.dept_summary.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                    {collegeData.dept_summary.map((dept) => (
                      <tr key={dept.dept_name} className="border-b border-slate-50 last:border-0">
                        <td className="px-5 py-3 font-medium text-slate-950">{dept.dept_name}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{dept.reg_count}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">{dept.attend_count}</td>
                        <td className="px-5 py-3"><PercentBar attended={dept.attend_count} total={dept.reg_count} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {!loading && !error && deptData && showDept && (
        <section className="mb-8">
          <h2 className="mb-4 text-lg font-bold text-slate-950">Departments</h2>
          <div className="space-y-4">
            {deptData.map((dept) => (
              <div key={dept.dept_name} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-950">{dept.dept_name}</h3>
                    <p className="text-xs text-slate-500">{dept.event_count} events · {dept.total_registrations} registrations · {dept.total_attended} attended</p>
                  </div>
                </div>
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
                        {dept.events.map((evt) => (
                          <tr key={evt.event_id} className="border-b border-slate-50 last:border-0">
                            <td className="px-5 py-3 font-medium text-slate-950">{evt.name}</td>
                            <td className="px-5 py-3">
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase text-indigo-700">{evt.event_type}</span>
                            </td>
                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.reg_count}</td>
                            <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.attend_count}</td>
                            <td className="px-5 py-3"><PercentBar attended={evt.attend_count} total={evt.reg_count} /></td>
                            <td className="px-5 py-3">
                              <Link href={`/participants/${evt.event_id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                                Participants
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && !error && eventsData && showEvents && !showDept && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-950">Events</h2>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                  {eventsData.map((evt) => (
                    <tr key={evt.event_id} className="border-b border-slate-50 last:border-0">
                      <td className="px-5 py-3 font-medium text-slate-950">{evt.name}</td>
                      <td className="px-5 py-3 text-slate-600">{evt.dept_name}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase text-indigo-700">{evt.event_type}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.reg_count}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{evt.attend_count}</td>
                      <td className="px-5 py-3"><PercentBar attended={evt.attend_count} total={evt.reg_count} /></td>
                      <td className="px-5 py-3">
                        <Link href={`/participants/${evt.event_id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                          Participants
                        </Link>
                      </td>
                    </tr>
                  ))}
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
