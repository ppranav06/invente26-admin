-- Run once against the shared participant database if this index is absent.
-- The application never runs schema changes automatically.
CREATE INDEX IF NOT EXISTS idx_hackathon_members_team_id
  ON public.hackathon_members (team_id);
