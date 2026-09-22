# Invente'26 Attendance Admin

This repository contains the focused Invente'26 attendance admin: ticket scanning, per-event attendance marking, and ticket-event replacement.

## Shared database

The backend consumes the existing PostgreSQL schema. It does not run migrations.
The database container must already be running on the external Docker network:

```text
container: invente-postgres-dev
database: invente_payment_db
network: server-only-compose_backend-network
```

Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL` with the runtime password. Do not commit that file.

The live schema already indexes ticket IDs, ticket-event relationships, and
hackathon registrations. If `hackathon_members(team_id)` is not indexed in a
deployment, run `backend/sql/001_performance_indexes.sql` once as a database
maintenance operation. For email lookup and participant substring search,
also run `backend/sql/002_search_indexes.sql` once as a database maintenance
operation.

## Local development

```bash
cp backend/.env.example backend/.env
cd backend && npm install && npm test && npm run dev
```

In another terminal:

```bash
cd frontend
pnpm install
BACKEND_INTERNAL_URL=http://localhost:4000 pnpm dev
```

Open <http://localhost:3000>. The frontend proxies `/organizers/api/*` to the backend.

## Docker

Start the shared database/network first, then run:

```bash
docker compose up --build
```

The frontend is available on port `3000` and the backend health endpoint is available on port `4000`.

## API behavior

Scanning a QR code loads the raw ticket UUID. One ticket may have multiple `ticket_event` rows. Attendance is marked only for the event selected in the UI; scanning never marks attendance automatically.
