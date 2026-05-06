# UniHub Workshop Backend

ExpressJS API with Supabase PostgreSQL.

## Setup

1. In Supabase SQL Editor, run `src/database/supabase-schema.sql`.
2. Copy `.env.example` to `.env` and fill:
   - `SUPABASE_DB_URL`
   - `JWT_SECRET`
3. Install and run:

```bash
npm install
npm run dev
```

## API Base

`http://localhost:4000/api`

## Notifications (Outbox Worker)

- On free workshop registration success and paid workshop payment success, backend writes `REGISTRATION_CONFIRMED` events into `outbox_events`.
- A background worker (started by `src/index.js`) processes pending outbox events every 5s.
- Worker writes delivered records to `notifications` for both:
  - `IN_APP` channel
  - `EMAIL` (simulated) channel

## Login endpoint

Use `POST /api/auth/login` with:
- `email`
- `password`

Seed credentials after running `src/database/supabase-schema.sql`:
- `student@unihub.local` / `UniHub@123`
- `admin@unihub.local` / `UniHub@123`
- `checker@unihub.local` / `UniHub@123`

## Supabase connection string

Use the Postgres connection string from Supabase:
- Supabase dashboard -> Project Settings -> Database -> Connection string
- Prefer Transaction pooler connection string for app workloads.
