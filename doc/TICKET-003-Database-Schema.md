# TASK-003 — Database schema: create tables (MVP Postgres)

## Goal
Create the core MVP schema in the **temporary Postgres instance**:
- `users`
- `feedback_requests`
- `feedback_assignments`
- `feedback_responses`

## What was done / current state (repo evidence)
The MVP schema + seed data are defined in:
- `docker/postgres-init/01_init_schema.sql`

Key schema points (as implemented in the SQL):
1. `users`
   - `id TEXT PRIMARY KEY`
   - `email TEXT UNIQUE NOT NULL`
2. `feedback_requests`
   - `reviewed_person_id TEXT`
   - `status` constrained to `draft/active/closed/archived`
3. `feedback_assignments`
   - `request_id UUID REFERENCES feedback_requests(id)`
   - `reviewer_id TEXT`
   - Unique constraint prevents duplicates: `UNIQUE (request_id, reviewer_id)`
4. `feedback_responses`
   - Links to `feedback_assignments` and stores response content as `jsonb`

Seeded test users:
- 10 users `user-0001` ... `user-0010` with `test.userX@example.com`

## Components involved
1. **Postgres init SQL**
   - Creates and seeds tables in the local MVP environment.
2. **Appsmith queries**
   - `qry_get_all_users` reads from `public.users`
   - `qry_get_requests` joins `feedback_requests` with `users`
3. **Documentation alignment**
   - `TASKS.md` was updated to keep planned user-id types aligned with the actual schema (`TEXT` vs `UUID`).

## Acceptance criteria to verify
- All tables exist after running the local Postgres init.
- The unique index/constraint `UNIQUE (request_id, reviewer_id)` exists on `feedback_assignments`.
- Manual `INSERT` + `SELECT` works for each table (especially `users` and the request joins).

## Key files
- `docker/postgres-init/01_init_schema.sql`
- `TASKS.md` (type alignment notes for user ids)

