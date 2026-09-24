"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import {
 getParticipants,
 exportParticipants,
 ApiError,
 type Participant,
} from "@/app/lib/api";
import type { CatalogEvent } from "@/app/lib/types";

type ParticipantsResponse = Awaited<ReturnType<typeof getParticipants>>;

const CACHE_TTL_MS = 30_000;

export default function ParticipantsPage({
 params,
}: {
 params: Promise<{ eventId: string }>;
}) {
 const { eventId } = use(params);
 const { user } = useAuth();
 const [participants, setParticipants] = useState<Participant[]>([]);
 const [total, setTotal] = useState(0);
 const [page, setPage] = useState(1);
 const [limit] = useState(50);
  const [status, setStatus] = useState("");
  const [attended, setAttended] = useState("");
  const [college, setCollege] = useState("");
 const [search, setSearch] = useState("");
 const [appliedSearch, setAppliedSearch] = useState("");
 const [appliedCollege, setAppliedCollege] = useState("");
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [exporting, setExporting] = useState(false);
 const [event, setEvent] = useState<CatalogEvent | null>(null);
  const requestSequence = useRef(0);
  const lastRequestKey = useRef("");
  const cacheRef = useRef(
    new Map<string, { data: ParticipantsResponse; expiresAt: number }>(),
  );
  const inflightRef = useRef(
    new Map<string, Promise<ParticipantsResponse>>(),
  );

  const applyFilters = () => {
  const nextSearch = search.trim().slice(0, 100);
  const nextCollege = college.trim().slice(0, 100);
  setAppliedSearch(nextSearch.length >= 2 ? nextSearch : "");
  setAppliedCollege(nextCollege.length >= 2 ? nextCollege : "");
  setPage(1);
 };

 const loadParticipants = useCallback(async () => {
 if (!user) return;
 const requestKey = [eventId, page, limit, status, attended, appliedCollege, appliedSearch].join("\u0000");
 if (lastRequestKey.current === requestKey) return;
 lastRequestKey.current = requestKey;
 const requestId = ++requestSequence.current;

 const cached = cacheRef.current.get(requestKey);
 if (cached && cached.expiresAt > Date.now()) {
  if (requestSequence.current === requestId) {
   setParticipants(cached.data.rows);
   setTotal(cached.data.total);
   setEvent(cached.data.event);
   setError(null);
   setLoading(false);
  }
  return;
 }

 setLoading(true);
 setError(null);
 try {
  const filters: { page: number; limit: number; status?: string; college?: string; search?: string; attended?: string } = { page, limit };
  if (status) filters.status = status;
  if (attended) filters.attended = attended;
  if (appliedCollege) filters.college = appliedCollege;
  if (appliedSearch) filters.search = appliedSearch;

  let promise = inflightRef.current.get(requestKey);
  if (!promise) {
   promise = getParticipants(eventId, filters);
   inflightRef.current.set(requestKey, promise);
   promise.finally(() => {
    inflightRef.current.delete(requestKey);
   });
  }

  const data = await promise;
  if (requestSequence.current !== requestId) return;
  cacheRef.current.set(requestKey, {
   data,
   expiresAt: Date.now() + CACHE_TTL_MS,
  });
  setParticipants(data.rows);
  setTotal(data.total);
  setEvent(data.event);
 } catch (err) {
  if (requestSequence.current !== requestId) return;
  lastRequestKey.current = "";
  setError(err instanceof ApiError ? err.message : "Failed to load participants.");
 } finally {
  if (requestSequence.current === requestId) setLoading(false);
 }
  }, [eventId, page, limit, status, attended, appliedCollege, appliedSearch, user]);

 useEffect(() => {
 const timer = setTimeout(() => {
  void loadParticipants();
 }, 0);
 return () => clearTimeout(timer);
 }, [loadParticipants]);

 const totalPages = Math.ceil(total / limit);

 const handleExport = async () => {
  setExporting(true);
  try {
    const blob = await exportParticipants(eventId, {
     status: status || undefined,
     college: appliedCollege || undefined,
     search: appliedSearch || undefined,
     attended: attended || undefined,
    });
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = `participants_${event?.name?.replace(/[^a-z0-9]/gi, "_") || eventId}.xlsx`;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
  } catch (err) {
   alert(err instanceof ApiError ? err.message : "Export failed.");
  } finally {
   setExporting(false);
  }
 };

 return (
 <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
  <div className="mb-6">
  <Link
   href="/analytics"
   className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-indigo-600"
  >
   <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
   <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
   </svg>
   Back to Analytics
  </Link>
  <h1 className="text-2xl font-black tracking-tight text-slate-950">
   {event ? event.name : "Event Participants"}
  </h1>
  {event && (
   <p className="mt-1 text-sm text-slate-500">
   {event.dept_name} · {event.event_type} · {event.reg_count} registrations
   </p>
  )}
  </div>

  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex flex-col gap-3 sm:flex-row">
   <div className="relative">
   <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
   </svg>
   <input
    type="text"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder="Search by name, email, or phone…"
    className="w-full border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-72"
   />
   </div>
   <input
   type="text"
   value={college}
   onChange={(e) => setCollege(e.target.value)}
   placeholder="Filter by college…"
   className="w-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-56"
   />
   <select
   value={status}
   onChange={(e) => {
    setStatus(e.target.value);
    setPage(1);
   }}
   className=" border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
   >
   <option value="">All payment statuses</option>
   <option value="NotVerified">Not Verified</option>
   <option value="Accepted">Accepted</option>
   <option value="Rejected">Rejected</option>
   <option value="PendingPayment">PendingPayment</option>
   </select>
   <select
   value={attended}
   onChange={(e) => {
    setAttended(e.target.value);
    setPage(1);
   }}
   aria-label="Filter by attendance"
   className=" border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
   >
   <option value="">All attendance</option>
   <option value="true">Attended: Yes</option>
   <option value="false">Attended: No</option>
   </select>
   <button
    type="button"
    onClick={applyFilters}
    className="bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700"
   >
    Search
   </button>
  </div>
   <button
    type="button"
    onClick={() => void handleExport()}
    disabled={exporting}
    className="self-start bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
   >
    {exporting ? "Exporting…" : "Export to Excel"}
   </button>
  </div>

  {loading && (
  <div className="grid place-items-center py-24">
   <div className="text-center">
   <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
   <p className="text-sm font-medium text-slate-500">Loading participants…</p>
   </div>
  </div>
  )}

  {error && (
  <div className=" border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">
   {error}
  </div>
  )}

  {!loading && !error && (
  <>
   <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
   {total} participant{total !== 1 ? "s" : ""} found
   </p>

   <div className="overflow-hidden border border-slate-200 bg-white">
   <div className="overflow-x-auto">
    <table className="w-full text-left text-sm">
    <thead>
     <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
      <th className="px-5 py-3">Name</th>
      <th className="px-5 py-3">Email</th>
      <th className="px-5 py-3">Phone</th>
      <th className="px-5 py-3">College</th>
     <th className="px-5 py-3">Year</th>
     <th className="px-5 py-3">Ticket Type</th>
     <th className="px-5 py-3">Payment</th>
     <th className="px-5 py-3">Attended</th>
     </tr>
    </thead>
    <tbody>
     {participants.length === 0 && (
     <tr>
      <td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-500">
      No participants match the current filters.
      </td>
     </tr>
     )}
     {participants.map((p, i) => (
     <tr key={`${p.ticket_id}-${i}`} className="border-b border-slate-50 last:border-0">
      <td className="px-5 py-3 font-medium text-slate-950">{p.name}</td>
      <td className="px-5 py-3 text-slate-600">{p.email}</td>
      <td className="px-5 py-3 text-slate-600">{p.phone || "—"}</td>
      <td className="px-5 py-3 text-slate-600">{p.college_name || "—"}</td>
      <td className="px-5 py-3 text-slate-600">{p.year_of_study ?? "—"}</td>
      <td className="px-5 py-3">
      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase text-indigo-700">
       {p.ticket_type}
      </span>
      </td>
      <td className="px-5 py-3">
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
       p.payment_status === "Accepted"
       ? "bg-emerald-50 text-emerald-700"
       : p.payment_status === "Rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600"
      }`}>
       {p.payment_status}
      </span>
      </td>
      <td className="px-5 py-3">
      {p.attendance ? (
       <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
       <span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">✓</span>
       Yes
       </span>
      ) : (
       <span className="text-xs font-medium text-slate-400">No</span>
      )}
      </td>
     </tr>
     ))}
    </tbody>
    </table>
   </div>
   </div>

   {totalPages > 1 && (
   <div className="mt-4 flex items-center justify-between">
    <p className="text-xs text-slate-500">
    Page {page} of {totalPages}
    </p>
    <div className="flex gap-2">
    <button
     type="button"
     onClick={() => setPage((p) => Math.max(1, p - 1))}
     disabled={page === 1}
     className=" border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
    >
     Previous
    </button>
    <button
     type="button"
     onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
     disabled={page === totalPages}
     className=" border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
    >
     Next
    </button>
    </div>
   </div>
   )}
  </>
  )}
 </main>
 );
}
