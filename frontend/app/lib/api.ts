import type {
  AssignmentResponse,
  AttendanceResponse,
  CatalogEvent,
  TicketResponse,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "/organizers/api";

const ACCESS_TOKEN_KEY = "invente_access_token";
const REFRESH_TOKEN_KEY = "invente_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

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
  const accessToken = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> || {}),
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        const refreshData = await rawRequest<{ access_token: string }>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        setTokens(refreshData.access_token, refreshToken);
        headers["Authorization"] = `Bearer ${refreshData.access_token}`;
        response = await fetch(`${API_BASE}${path}`, {
          ...init,
          cache: "no-store",
          headers,
        });
      } catch {
        clearTokens();
        if (typeof window !== "undefined") {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = "/login";
        }
        throw new ApiError("Session expired", 401, "TOKEN_EXPIRED");
      }
    } else {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/login";
      }
      throw new ApiError("Not authenticated", 401, "MISSING_TOKEN");
    }
  }

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

async function rawRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> || {}),
    },
  });

  const body = (await response.json().catch(() => null)) as T | null;
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

export function apiLogin(firebaseIdToken: string) {
  return rawRequest<{
    access_token: string;
    refresh_token: string;
    user: {
      user_id: string;
      email: string;
      role: string;
      event_id: string | null;
      dept_name: string | null;
    };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ firebase_id_token: firebaseIdToken }),
  });
}

export function apiLoginLocal(email: string, password: string) {
  return rawRequest<{
    access_token: string;
    refresh_token: string;
    user: {
      user_id: string;
      email: string;
      role: string;
      event_id: string | null;
      dept_name: string | null;
    };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function apiRefresh(refreshToken: string) {
  return rawRequest<{ access_token: string }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function apiLogout(refreshToken: string) {
  return request<{ ok: true }>("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
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

export function getCollegeAnalytics() {
  return request<{
    total_registrations: number;
    total_attended: number;
    total_events: number;
    total_depts: number;
    regs_by_event_type: Record<string, number>;
    dept_summary: Array<{ dept_name: string; reg_count: number; attend_count: number }>;
  }>("/analytics/college");
}

export function getDeptAnalytics(dept?: string) {
  const query = dept ? `?dept=${encodeURIComponent(dept)}` : "";
  return request<{
    rows: Array<{
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
    }>;
  }>(`/analytics/dept${query}`);
}

export function getEventsAnalytics(dept?: string) {
  const query = dept ? `?dept=${encodeURIComponent(dept)}` : "";
  return request<{
    rows: Array<{
      event_id: string;
      name: string;
      dept_name: string;
      event_type: string;
      date: string | null;
      reg_count: number;
      attend_count: number;
    }>;
  }>(`/analytics/events${query}`);
}

export function getEventAnalyticsById(eventId: string) {
  return request<{
    event_id: string;
    name: string;
    dept_name: string;
    event_type: string;
    date: string | null;
    reg_count: number;
    attend_count: number;
    regs_by_day: Array<{ day: string; count: number }>;
    status_counts: Record<string, number>;
  }>(`/analytics/events/${encodeURIComponent(eventId)}`);
}

export type Participant = {
  name: string;
  email: string;
  phone: string | null;
  college_name: string | null;
  year_of_study: number | null;
  gender: string | null;
  ticket_id: string;
  ticket_type: string;
  payment_status: string;
  registered_at: string | null;
  attendance: boolean;
  attendance_timestamp: string | null;
};

export function getParticipants(
  eventId: string,
  options?: { page?: number; limit?: number; status?: string; college?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (options?.page) params.set("page", String(options.page));
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.status) params.set("status", options.status);
  if (options?.college) params.set("college", options.college);
  if (options?.search) params.set("search", options.search);
  const query = params.toString() ? `?${params.toString()}` : "";
  return request<{
    page: number;
    limit: number;
    total: number;
    rows: Participant[];
  }>(`/events/${encodeURIComponent(eventId)}/participants${query}`);
}

export function exportParticipantsUrl(
  eventId: string,
  options?: { status?: string; college?: string; search?: string },
) {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.college) params.set("college", options.college);
  if (options?.search) params.set("search", options.search);
  const query = params.toString() ? `?${params.toString()}` : "";
  return `${API_BASE}/events/${encodeURIComponent(eventId)}/participants/export${query}`;
}

export type AdminUserType = {
  user_id: string;
  email: string;
  role: string;
  event_id: string | null;
  dept_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function listAdminUsers() {
  return request<{ rows: AdminUserType[] }>("/users");
}

export function createAdminUser(data: {
  email: string;
  role: string;
  event_id?: string;
  dept_name?: string;
}) {
  return request<{
    user: AdminUserType;
    password_reset_link: string | null;
    firebase_created: boolean;
  }>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateAdminUser(
  userId: string,
  data: { role?: string; event_id?: string | null; dept_name?: string | null },
) {
  return request<{ user: AdminUserType }>(`/users/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteAdminUser(userId: string) {
  return request<{ ok: true }>(`/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export type ExternalEvent = {
  event_id: string;
  name: string;
  event_type: string;
  date: string;
};

export async function fetchEvents(): Promise<ExternalEvent[]> {
  const res = await fetch("https://inventeapi.buildapp.in/api/v1/events", {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}
