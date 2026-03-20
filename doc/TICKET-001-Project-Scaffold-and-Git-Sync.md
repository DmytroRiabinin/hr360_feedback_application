# TASK-001 — Project scaffold: new Appsmith app + Git Sync

## Goal
Bootstrap the HR 360 Feedback Appsmith application so changes can be managed via **Git Sync** between:
- the Appsmith UI (pages/widgets/queries/JSObjects)
- the repository (`pages/`, `doc/`, `docker/` artifacts).

## What was done / current state (repo evidence)
1. Appsmith page artifacts exist in the repository under `pages/`, including:
   - `pages/HR Dashboard/HR Dashboard.json`
   - widget JSON files in `pages/HR Dashboard/widgets/`
   - query JSON/metadata in `pages/HR Dashboard/queries/`
   - JSObject JSON/metadata in `pages/HR Dashboard/jsobjects/`
2. Query/JSObject metadata contains Appsmith `gitSyncId` values, indicating the Appsmith workspace is wired for Git Sync.

## Components involved
1. **Appsmith application**
   - The app itself is the container for pages, widgets, queries and JSObjects.
2. **Git Sync**
   - Handles pushing repo state into Appsmith and pulling Appsmith updates back into the repository.
3. **Repository structure**
   - `pages/` holds Appsmith exports (page definitions, widgets, queries, JSObjects).

## Acceptance criteria to verify in Appsmith
- `pages/` directory appears in the repo after the first sync.
- Editing in Appsmith + Git Sync correctly updates the repo.
- Committing changes in the repo makes them visible in Appsmith after pull/sync.

