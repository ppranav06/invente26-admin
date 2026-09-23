"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addTicketEvent, ApiError, getEvents, replaceTicketEvent } from "../lib/api";
import { compatibleEventType, isTicketAccepted } from "../lib/ticket";
import type { CatalogEvent, TicketEvent, TicketResponse } from "../lib/types";
import { useAuth } from "../lib/authContext";
import TicketLookup from "./ticket-lookup";
import TicketSummary from "./ticket-summary";

function candidateEvents(ticketType: string, current: TicketEvent, events: CatalogEvent[], assignedIds: Set<string>) {
 const requiredType = compatibleEventType(ticketType, current.event_type);
 return events.filter((event) => event.event_id !== current.event_id
 && !assignedIds.has(event.event_id)
 && (!requiredType || event.event_type.toUpperCase() === requiredType));
}

export default function ModifyEvents() {
 const { user } = useAuth();
 const [data, setData] = useState<TicketResponse | null>(null);
 const [catalog, setCatalog] = useState<CatalogEvent[]>([]);
 const [catalogLoading, setCatalogLoading] = useState(true);
 const [catalogError, setCatalogError] = useState<string | null>(null);
 const [pending, setPending] = useState<Record<string, string>>({});
 const [savingId, setSavingId] = useState<string | null>(null);
 const [newEventId, setNewEventId] = useState("");
 const [adding, setAdding] = useState(false);
 const [message, setMessage] = useState<string | null>(null);

 const canAssign = user?.role === "master_admin" || user?.role === "volunteer";
 const ticketAccepted = data ? isTicketAccepted(data.ticket.status) : false;

 useEffect(() => {
 let cancelled = false;
 getEvents()
  .then((response) => {
  if (!cancelled) setCatalog(response.rows);
  })
  .catch((error) => {
  if (!cancelled) setCatalogError(error instanceof ApiError ? error.message : "Events could not be loaded.");
  })
  .finally(() => {
  if (!cancelled) setCatalogLoading(false);
  });
 return () => {
  cancelled = true;
 };
 }, []);

 const onLoaded = useCallback((nextData: TicketResponse) => {
 setData(nextData);
 setPending({});
 setNewEventId("");
 setMessage(null);
 }, []);

 const assignedIds = useMemo(() => new Set(data?.events.map((event) => event.event_id) || []), [data]);
 const isTechPass = data?.ticket.ticket_type.toUpperCase() === "TECHPASS";
 const addOptions = useMemo(() => catalog.filter((event) => event.event_type.toUpperCase() === "TECH" && !assignedIds.has(event.event_id)), [assignedIds, catalog]);

 const handleSave = async (currentEvent: TicketEvent) => {
 if (!data || !ticketAccepted) return;
 const nextEventId = pending[currentEvent.event_id];
 if (!nextEventId || savingId) return;

 setSavingId(currentEvent.event_id);
 setMessage(null);
 try {
  const result = await replaceTicketEvent(data.ticket.ticket_id, currentEvent.event_id, nextEventId);
  setData((current) => current
  ? {
   ...current,
   events: current.events.map((event) => event.event_id === currentEvent.event_id
    ? { ...event, ...result.event, position: event.position }
    : event),
   }
  : current);
  setPending((current) => {
  const next = { ...current };
  delete next[currentEvent.event_id];
  return next;
  });
  setMessage("Event assignment updated successfully.");
 } catch (error) {
  setMessage(error instanceof ApiError ? error.message : "Event assignment could not be updated.");
 } finally {
 setSavingId(null);
 }
 };

 const handleAdd = async () => {
 if (!data || !ticketAccepted || !newEventId || adding) return;

 setAdding(true);
 setMessage(null);
 try {
  const result = await addTicketEvent(data.ticket.ticket_id, newEventId);
  setData((current) => current
  ? {
   ...current,
   events: [...current.events, result.event].sort((left, right) => left.position - right.position),
  }
  : current);
  setNewEventId("");
  setMessage("Event added to the ticket successfully.");
 } catch (error) {
  setMessage(error instanceof ApiError ? error.message : "Event could not be added to the ticket.");
 } finally {
  setAdding(false);
 }
 };

 return (
 <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:px-8 lg:py-8">
  <section className="panel p-5 sm:p-6">
  <TicketLookup onLoaded={onLoaded} />
  <div className="mt-6 bg-amber-50 p-4 text-sm leading-6 text-amber-800"><strong>Safety rule:</strong> attended events cannot be replaced, a ticket cannot contain the same event twice, and a TECHPASS can have at most four events.</div>
  </section>

  <section className="panel min-h-[32rem] overflow-hidden">
  <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
   <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-600">Event assignments</p>
   <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Modify ticket events</h1>
   <p className="mt-2 text-sm leading-6 text-slate-500">Replace only un-attended events, or add an unassigned technical event to an incomplete TECHPASS.</p>
  </div>

  {message && <div className="mx-5 mt-5 border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-800 sm:mx-6" role="status">{message}</div>}
  {catalogError && <div className="mx-5 mt-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 sm:mx-6" role="alert">{catalogError}</div>}
  {data && !ticketAccepted && <div className="mx-5 mt-5 border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 sm:mx-6" role="status">This ticket is not accepted. Event changes are unavailable until its status is Accepted.</div>}

  {!data && <div className="grid place-items-center px-6 py-24 text-center"><div><div className="mx-auto grid h-14 w-14 place-items-center bg-amber-50 text-2xl text-amber-600">↔</div><p className="mt-4 font-bold text-slate-700">No ticket loaded</p><p className="mt-1 text-sm text-slate-500">Scan a ticket to see its current event assignments.</p></div></div>}
  {data && (
   <>
   <TicketSummary ticket={data.ticket} />
   <div className="space-y-3 p-5 sm:p-6">
    {data.events.length === 0 && <p className=" bg-slate-50 p-5 text-sm text-slate-500">No events are associated with this ticket.</p>}
    {data.events.map((event) => {
    const options = candidateEvents(data.ticket.ticket_type, event, catalog, assignedIds);
    const selected = pending[event.event_id] || "";
    return (
     <article key={event.event_id} aria-disabled={!ticketAccepted} className={`border border-slate-200 p-4 sm:p-5 ${ticketAccepted ? "bg-slate-50/70" : "cursor-not-allowed bg-slate-100 opacity-60 grayscale"}`}>
     <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2"><span className=" bg-white px-2.5 py-1 text-xs font-bold text-slate-500 shadow-sm">Event {event.position}</span>{event.attendance && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Attended · locked</span>}</div>
      <h2 className="mt-3 font-bold text-slate-950">{event.name}</h2>
      <p className="mt-1 text-sm text-slate-500">{event.dept_name} · {event.event_type}</p>
      </div>
      {!event.attendance && canAssign && (
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:w-[28rem]">
       <select value={selected} onChange={(change) => setPending((current) => ({ ...current, [event.event_id]: change.target.value }))} disabled={!ticketAccepted || catalogLoading || savingId === event.event_id} className="min-w-0 flex-1 border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100">
       <option value="">{catalogLoading ? "Loading events…" : options.length ? "Choose replacement" : "No compatible events"}</option>
       {options.map((option) => <option key={option.event_id} value={option.event_id}>{option.name} · {option.dept_name}</option>)}
       </select>
       <button type="button" onClick={() => void handleSave(event)} disabled={!ticketAccepted || !selected || savingId !== null} className=" bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300">{savingId === event.event_id ? "Saving…" : "Save"}</button>
      </div>
      )}
     </div>
    </article>
    );
    })}
    {canAssign && isTechPass && (
     <section aria-disabled={!ticketAccepted} className={`border border-indigo-200 p-4 sm:p-5 ${ticketAccepted ? "bg-indigo-50/60" : "cursor-not-allowed bg-slate-100 opacity-60 grayscale"}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
       <div>
        <div className="flex flex-wrap items-center gap-2">
         <span className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Add event</span>
         <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-indigo-700">{data.events.length}/4 assigned</span>
        </div>
        {data.events.length >= 4
         ? <p className="mt-2 text-sm text-slate-600">This TECHPASS already has the maximum four events.</p>
         : <p className="mt-2 text-sm text-slate-600">Choose an unassigned technical event to fill the next available slot.</p>}
       </div>
       {data.events.length < 4 && (
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row lg:w-[28rem]">
         <select value={newEventId} onChange={(change) => setNewEventId(change.target.value)} disabled={!ticketAccepted || catalogLoading || adding} className="min-w-0 flex-1 border border-indigo-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100">
          <option value="">{catalogLoading ? "Loading events…" : addOptions.length ? "Choose technical event" : "No unassigned technical events"}</option>
          {addOptions.map((option) => <option key={option.event_id} value={option.event_id}>{option.name} · {option.dept_name}</option>)}
         </select>
         <button type="button" onClick={() => void handleAdd()} disabled={!ticketAccepted || !newEventId || adding || catalogLoading} className="bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">{adding ? "Adding…" : "Add event"}</button>
        </div>
       )}
      </div>
     </section>
    )}
   </div>
   </>
  )}
  </section>
 </main>
 );
}
