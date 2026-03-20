# HR 360 Feedback Application — Local Docker Setup

This folder runs:
- Appsmith CE (for the HR 360 app UI)
- A temporary **PostgreSQL** database for HR 360 feedback data: `hr360_feedback_application`

MongoDB and Redis for Appsmith are **embedded inside the Appsmith container** (no external Mongo/Redis containers).

## Quick start

```bash
cd docker
docker compose up -d
```

After ~2-3 minutes, open Appsmith:
- http://localhost

## Connection strings (Postgres for HR 360 data)

### From the host machine (for debugging with psql/Compass)
- `postgresql://hr360:hr360@localhost:5433/hr360_feedback_application`

### From inside the Docker network (Appsmith datasource)
- `postgresql://hr360:hr360@postgres:5432/hr360_feedback_application`

## Common commands

```bash
# Start
docker compose up -d

# Stop (keeps data)
docker compose down

# Stop + remove volumes (destroys Postgres/Appsmith data)
docker compose down -v

# Logs
docker logs -f hr360-appsmith
docker logs -f hr360-postgres
```

## Notes
- Host port for Postgres is mapped as `5433 -> 5432` to reduce chance of conflicts with a local Postgres.
- The Postgres schema is initialized via `postgres-init/01_init_schema.sql` on first container startup.

