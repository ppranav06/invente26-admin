import { formatTicketType } from "../lib/ticket";
import type { Ticket } from "../lib/types";

export default function TicketSummary({ ticket }: { ticket: Ticket }) {
 return (
 <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
  <div className="flex flex-wrap items-start justify-between gap-4">
  <div className="min-w-0">
   <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Loaded ticket</p>
   <h2 className="mt-1 break-all font-mono text-sm font-bold text-slate-950">{ticket.ticket_id}</h2>
   <p className="mt-2 text-sm text-slate-600">{ticket.user?.name || "Participant details unavailable"}</p>
   {ticket.user?.email && <p className="text-xs text-slate-500">{ticket.user.email}</p>}
  </div>
  <div className="flex flex-wrap gap-2 text-xs font-bold">
   <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-700">{formatTicketType(ticket.ticket_type, ticket.pass_type)}</span>
   <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">{ticket.status}</span>
  </div>
  </div>
 </div>
 );
}
