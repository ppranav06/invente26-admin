import type {
  AssignmentResponse,
  AttendanceResponse,
  CatalogEvent,
  TicketResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/organizers/api";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const body = (await response.json().catch(() => null)) as
    | { error?: string; code?: string }
    | T
    | null;

  if (!response.ok) {
    const errorBody = body as { error?: string; code?: string } | null;
    throw new ApiError(
      errorBody?.error || "The request could not be completed.",
      response.status,
      errorBody?.code,
    );
  }

  return body as T;
}

export function getTicket(ticketId: string) {
  return request<TicketResponse>(`/scan/${encodeURIComponent(ticketId)}`);
}

export function getEvents() {
  return request<{ rows: CatalogEvent[] }>("/events");
}

export function markAttendance(ticketId: string, eventId: string) {
  return request<AttendanceResponse>(`/scan/${encodeURIComponent(ticketId)}/attend`, {
    method: "POST",
    body: JSON.stringify({ event_id: eventId }),
  });
}

export function replaceTicketEvent(ticketId: string, currentEventId: string, eventId: string) {
  return request<AssignmentResponse>(`/scan/${encodeURIComponent(ticketId)}/assign`, {
    method: "POST",
    body: JSON.stringify({ current_event_id: currentEventId, event_id: eventId }),
  });
}
