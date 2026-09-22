"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, getTicket } from "../lib/api";
import { normalizeTicketId } from "../lib/ticket";
import type { TicketResponse } from "../lib/types";
import QrScanner from "./qr-scanner";

type Props = {
 onLoaded: (ticket: TicketResponse) => void;
 onLoadingChange?: (loading: boolean) => void;
};

export default function TicketLookup({ onLoaded, onLoadingChange }: Props) {
 const [manualId, setManualId] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const inFlight = useRef(new Set<string>());
 const lastRequest = useRef({ id: "", at: 0 });

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
 setLoading(true);
 onLoadingChange?.(true);
 setError(null);

 try {
  const ticket = await getTicket(ticketId);
  setManualId(ticketId);
  onLoaded(ticket);
 } catch (requestError) {
  setError(requestError instanceof ApiError ? requestError.message : "Could not load this ticket.");
 } finally {
  inFlight.current.delete(ticketId);
  setLoading(false);
  onLoadingChange?.(false);
 }
 }, [onLoaded, onLoadingChange]);

 return (
 <div className="space-y-5">
  <div>
  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Ticket lookup</p>
  <h2 className="text-xl font-bold text-slate-950">Scan a ticket QR</h2>
  <p className="mt-1 text-sm leading-6 text-slate-500">Scanning loads every event linked to the ticket. Choose the event you want to update.</p>
  </div>

  <QrScanner onDecoded={loadTicket} disabled={loading} />

  <div className="relative flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
  <span className="h-px flex-1 bg-slate-200" />
  or enter ticket ID
  <span className="h-px flex-1 bg-slate-200" />
  </div>

  <form
  className="flex flex-col gap-3 sm:flex-row"
  onSubmit={(event) => {
   event.preventDefault();
   void loadTicket(manualId);
  }}
  >
  <input
   value={manualId}
   onChange={(event) => setManualId(event.target.value)}
   placeholder="Ticket UUID"
   autoComplete="off"
   className="min-w-0 flex-1 border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
   aria-label="Ticket UUID"
  />
  <button type="submit" disabled={loading || !manualId.trim()} className=" bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300">
   {loading ? "Loading…" : "Load ticket"}
  </button>
  </form>

  {error && <div className=" border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" role="alert">{error}</div>}
 </div>
 );
}
