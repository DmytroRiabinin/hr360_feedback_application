# TASK-002 — Datasource: PostgreSQL connection

## Goal
Add/configure the external PostgreSQL datasource in Appsmith for query execution (MVP uses a temporary Postgres instance).

## What was done / current state (repo evidence)
- Appsmith queries are configured to use the Postgres plugin (`postgres-plugin`).
- Query metadata references a datasource named `hr360_feedback_application` in the HR Dashboard area.

## Components involved
1. **PostgreSQL datasource**
   - Name (referenced by queries): `hr360_feedback_application`
2. **Appsmith queries (Postgres plugin)**
   - Example: `qry_get_all_users` uses the Postgres plugin and `hr360_feedback_application`.
3. **HR Dashboard JSObjects**
   - `eventHandler` calls query `.run()` methods:
     - `qry_get_all_users.run()`
     - `qry_get_requests.run()`

## Acceptance criteria to verify in Appsmith
- Datasource shows **green “Connected”**.
- Test query `SELECT 1` succeeds.
- `qry_get_all_users` and `qry_get_requests` can run without datasource errors.

## Key files
- `pages/HR Dashboard/queries/qry_get_all_users/metadata.json`
- `pages/HR Dashboard/queries/qry_get_requests/metadata.json`
- `pages/HR Dashboard/jsobjects/eventHandler/eventHandler.js`

