"use client";

import { useCallback, useState } from "react";
import { ApiError, markAttendance } from "../lib/api";
import type { TicketEvent, TicketResponse } from "../lib/types";
import { useAuth } from "../lib/authContext";
import TicketLookup from "./ticket-lookup";
import TicketSummary from "./ticket-summary";

function EventCard({ event, busy, onMark, canMark }: { event: TicketEvent; busy: boolean; onMark: () => void; canMark: boolean }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-indigo-200 hover:bg-white sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">Event {event.position}</span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">{event.event_type}</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-slate-950">{event.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{event.dept_name}</p>
        </div>
        {event.attendance ? (
          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-xs text-white">✓</span>
            Present
          </div>
        ) : canMark ? (
          <button type="button" onClick={onMark} disabled={busy} className="shrink-0 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:bg-slate-300">
            {busy ? "Marking…" : "Mark attendance"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function ScanAttendance() {
  const { user } = useAuth();
  const [data, setData] = useState<TicketResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canMarkAttendance = user?.role === "master_admin" || user?.role === "event_admin";

  const onLoaded = useCallback((nextData: TicketResponse) => {
    setData(nextData);
    setMessage(null);
  }, []);

  const handleMark = async (eventId: string) => {
    if (!data || busyEventId) return;
    setBusyEventId(eventId);
    setMessage(null);

    try {
      const result = await markAttendance(data.ticket.ticket_id, eventId);
      setData((current) => current
        ? {
            ...current,
            events: current.events.map((event) => event.event_id === eventId
              ? { ...event, ...result.event, attendance: true }
              : event),
          }
        : current);
      setMessage(result.already_attended ? "Attendance was already marked for that event." : "Attendance marked successfully.");
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Attendance could not be marked.");
    } finally {
      setBusyEventId(null);
    }
  };

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:px-8 lg:py-8">
      <section className="panel p-5 sm:p-6">
        <TicketLookup onLoaded={onLoaded} onLoadingChange={setLoading} />
      </section>

      <section className="panel min-h-[32rem] overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Attendance</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Choose an event</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">A ticket may contain several events. Mark only the event the participant is entering now.</p>
        </div>

        {message && <div className="mx-5 mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800 sm:mx-6" role="status">{message}</div>}

        {loading && <div className="grid place-items-center px-6 py-24 text-sm font-medium text-slate-500">Loading ticket events…</div>}
        {!loading && !data && <div className="grid place-items-center px-6 py-24 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600">⌁</div><p className="mt-4 font-bold text-slate-700">No ticket loaded</p><p className="mt-1 text-sm text-slate-500">Scan a QR code or enter a ticket UUID to begin.</p></div></div>}
        {!loading && data && (
          <>
            <TicketSummary ticket={data.ticket} />
            <div className="space-y-3 p-5 sm:p-6">
              {data.events.length === 0 && <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No events are associated with this ticket.</p>}
              {data.events.map((event) => <EventCard key={event.event_id} event={event} busy={busyEventId === event.event_id} onMark={() => void handleMark(event.event_id)} canMark={canMarkAttendance} />)}
            </div>
            {data.hackathon_teams.length > 0 && (
              <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
                <p className="text-sm font-bold text-slate-950">Team details</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {data.hackathon_teams.flatMap((team) => team.members).map((member) => <div key={member.member_id} className="rounded-xl bg-slate-50 px-3 py-2 text-sm"><p className="font-semibold text-slate-800">{member.name}{member.is_lead ? " · Lead" : ""}</p><p className="text-xs text-slate-500">{member.email}</p></div>)}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
