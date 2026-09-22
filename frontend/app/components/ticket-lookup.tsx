"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, getTicket, searchTicketsByEmail } from "../lib/api";
import { normalizeTicketId } from "../lib/ticket";
import type { TicketResponse } from "../lib/types";
import QrScanner from "./qr-scanner";

type Props = {
 onLoaded: (ticket: TicketResponse) => void;
 onLoadingChange?: (loading: boolean) => void;
 brightness?: number;
 zoom?: number;
};

type LookupMode = "ticketId" | "email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TicketLookup({ onLoaded, onLoadingChange, brightness, zoom }: Props) {
 const [lookupMode, setLookupMode] = useState<LookupMode>("ticketId");
 const [lookupValue, setLookupValue] = useState("");
 const [loading, setLoading] = useState(false);
 const [emailSearching, setEmailSearching] = useState(false);
 const [emailResults, setEmailResults] = useState<TicketResponse[]>([]);
 const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
 const [error, setError] = useState<string | null>(null);
 const inFlight = useRef(new Set<string>());
 const lastRequest = useRef({ id: "", at: 0 });
 const emailCache = useRef(new Map<string, TicketResponse[]>());
 const emailInFlight = useRef(new Map<string, Promise<TicketResponse[]>>());
 const emailRequestSequence = useRef(0);

 const loadTicket = useCallback(async (rawValue: string) => {
  const ticketId = normalizeTicketId(rawValue);
  if (!ticketId) {
   setError("Enter or scan a valid ticket UUID.");
   return;
  }

  const now = Date.now();
  if (inFlight.current.has(ticketId) || (lastRequest.current.id === ticketId && now - lastRequest.current.at < 700)) {
   return;
  }

 inFlight.current.add(ticketId);
  lastRequest.current = { id: ticketId, at: now };
  emailRequestSequence.current += 1;
  setLookupMode("ticketId");
  setEmailResults([]);
  setEmailSearching(false);
  emailCache.current.clear();
  setLoading(true);
  onLoadingChange?.(true);
  setError(null);
  setSelectedTicketId(ticketId);

  try {
   const ticket = await getTicket(ticketId);
   setLookupValue(ticketId);
   onLoaded(ticket);
  } catch (requestError) {
   setError(requestError instanceof ApiError ? requestError.message : "Could not load this ticket.");
  } finally {
   inFlight.current.delete(ticketId);
   setLoading(false);
   onLoadingChange?.(false);
  }
 }, [onLoaded, onLoadingChange]);

 const runEmailSearch = useCallback(async (email: string, requestId: number) => {
  setEmailSearching(true);
  setError(null);

  let request = emailInFlight.current.get(email);
  if (!request) {
   request = searchTicketsByEmail(email).then((response) => response.rows);
   emailInFlight.current.set(email, request);
  }

  try {
   const rows = emailCache.current.get(email) || await request;

   if (emailRequestSequence.current !== requestId) return;

   if (!emailCache.current.has(email)) {
    if (emailCache.current.size >= 10) {
     const oldestKey = emailCache.current.keys().next().value as string | undefined;
     if (oldestKey) emailCache.current.delete(oldestKey);
    }
    emailCache.current.set(email, rows);
   }

   setEmailResults(rows);
   if (rows.length === 0) {
    setError("No tickets were found for this email address.");
   }
  } catch (requestError) {
   if (emailRequestSequence.current !== requestId) return;
   setError(requestError instanceof ApiError ? requestError.message : "Could not search tickets.");
  } finally {
   if (emailInFlight.current.get(email) === request) {
    emailInFlight.current.delete(email);
   }
   if (emailRequestSequence.current === requestId) {
    setEmailSearching(false);
   }
  }
 }, []);

 const submitEmailSearch = useCallback(async () => {
  const email = lookupValue.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
   setError("Enter a complete email address to search.");
   return;
  }

  const requestId = ++emailRequestSequence.current;
  await runEmailSearch(email, requestId);
 }, [lookupValue, runEmailSearch]);

 const selectEmailResult = (ticket: TicketResponse) => {
  setSelectedTicketId(ticket.ticket.ticket_id);
  setError(null);
  onLoaded(ticket);
 };

 const handleLookupValueChange = (value: string) => {
  setLookupValue(value);
  if (lookupMode === "email") {
   emailRequestSequence.current += 1;
   setEmailResults([]);
   setSelectedTicketId(null);
   setEmailSearching(false);
   setError(null);
   emailCache.current.clear();
  }
 };

 const switchMode = (mode: LookupMode) => {
  emailRequestSequence.current += 1;
  setLookupMode(mode);
  setLookupValue("");
  setEmailResults([]);
  setEmailSearching(false);
  emailCache.current.clear();
  setSelectedTicketId(null);
  setError(null);
 };

 const emailIsComplete = EMAIL_PATTERN.test(lookupValue.trim());
 const busy = loading || emailSearching;

 return (
 <div className="space-y-5">
  <div>
  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Ticket lookup</p>
  <h2 className="text-xl font-bold text-slate-950">Scan or search a ticket</h2>
  <p className="mt-1 text-sm leading-6 text-slate-500">Scanning or searching loads every event linked to the ticket. Choose the event you want to update.</p>
  </div>

   <QrScanner onDecoded={loadTicket} disabled={busy} brightness={brightness} zoom={zoom} />

  <div className="relative flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
  <span className="h-px flex-1 bg-slate-200" />
  or enter a ticket ID or email
  <span className="h-px flex-1 bg-slate-200" />
  </div>

  <form
  className="space-y-3"
  onSubmit={(event) => {
   event.preventDefault();
   if (lookupMode === "ticketId") void loadTicket(lookupValue);
   else void submitEmailSearch();
  }}
  >
  <div className="flex flex-col gap-3 sm:flex-row">
   <select
    value={lookupMode}
    onChange={(event) => switchMode(event.target.value as LookupMode)}
    disabled={busy}
    className="border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 sm:w-40"
    aria-label="Ticket lookup type"
   >
    <option value="ticketId">Ticket ID</option>
    <option value="email">Email address</option>
   </select>
   <input
    value={lookupValue}
    onChange={(event) => handleLookupValueChange(event.target.value)}
    type={lookupMode === "email" ? "email" : "text"}
    placeholder={lookupMode === "email" ? "participant@example.com" : "Ticket UUID"}
    autoComplete="off"
    className="min-w-0 flex-1 border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
    aria-label={lookupMode === "email" ? "Participant email address" : "Ticket UUID"}
   />
   {lookupMode === "ticketId" && (
    <button type="submit" disabled={loading || !lookupValue.trim()} className="bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
     {loading ? "Loading…" : "Load ticket"}
    </button>
   )}
   {lookupMode === "email" && (
    <button type="submit" disabled={busy || !emailIsComplete} className="bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
     {emailSearching ? "Searching…" : "Search tickets"}
    </button>
   )}
  </div>
  {lookupMode === "email" && (
   <p className="text-xs text-slate-500">
    {emailSearching ? "Searching tickets…" : emailIsComplete ? "Click Search tickets or press Enter." : "Enter a complete email address to search."}
   </p>
  )}
  </form>

  {lookupMode === "email" && emailResults.length > 0 && (
   <div className="space-y-2" role="listbox" aria-label="Tickets associated with this email address">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Matching tickets</p>
    {emailResults.map((result) => {
     const ticket = result.ticket;
     const eventNames = result.events.map((event) => event.name).join(", ");
     const selected = selectedTicketId === ticket.ticket_id;
     return (
      <button
       key={ticket.ticket_id}
       type="button"
       role="option"
       aria-selected={selected}
       onClick={() => selectEmailResult(result)}
       className={`w-full border p-4 text-left transition ${selected ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50/70 hover:border-indigo-300 hover:bg-white"}`}
      >
       <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
         <p className="font-semibold text-slate-950">{ticket.user?.name || "Unnamed participant"}</p>
         <p className="mt-1 break-all font-mono text-xs text-slate-500">{ticket.ticket_id}</p>
         <p className="mt-2 text-xs text-slate-600">{eventNames || "No events associated"}</p>
        </div>
        <div className="shrink-0 text-left text-xs sm:text-right">
         <p className="font-bold uppercase text-indigo-700">{ticket.ticket_type}</p>
         <p className="mt-1 text-slate-500">{ticket.status}</p>
        </div>
       </div>
      </button>
     );
    })}
   </div>
  )}

  {error && <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>}
 </div>
 );
}
