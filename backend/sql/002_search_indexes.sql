-- Run once against the shared participant database. The application does not
-- execute schema changes automatically.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Exact, case-insensitive ticket lookup by participant email.
CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON public.users (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_ticket_payments_user_id
  ON public.ticket_payments (user_id);

-- Set-based ticket detail aggregation and participant filtering.
CREATE INDEX IF NOT EXISTS idx_ticket_event_ticket_id
  ON public.ticket_event (ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_event_event_id_ticket_id
  ON public.ticket_event (event_id, ticket_id);

CREATE INDEX IF NOT EXISTS idx_users_name_trgm
  ON public.users USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_email_trgm
  ON public.users USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_phone_trgm
  ON public.users USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_users_college_name_trgm
  ON public.users USING gin (college_name gin_trgm_ops);
