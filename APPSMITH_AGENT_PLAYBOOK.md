# Appsmith Agent Playbook (Reusable)

This document is a **reusable** guide for building Appsmith applications using **Git Sync exports** (Appsmith repo structure under `pages/**`). It is written for an AI agent (and humans) to build pages, queries, and JSObjects reliably and avoid common Git Sync pitfalls.

---

## Core assumptions

- The app is developed in Appsmith UI and synced via Git Sync into a repository.
- The repository contains:
  - `pages/<PageName>/widgets/**/*.json` — Widget DSL
  - `pages/<PageName>/queries/<ActionName>/metadata.json` — Query/action metadata
  - `pages/<PageName>/jsobjects/<ObjName>/<ObjName>.js` — JSObject code
- The source of truth is the Appsmith UI. Manual edits are possible, but must be **careful** and follow the rules below.

---

## Repository structure (what to edit where)

### JSObjects
- Location: `pages/<Page>/jsobjects/<Obj>/<Obj>.js`
- Metadata: `pages/<Page>/jsobjects/<Obj>/metadata.json`

**Important**: JS plugin actions are defined by `pages/<Page>/queries/<ActionName>/metadata.json` but their body typically points to a JSObject method — the code lives in the JSObject `.js` file.

### Queries
- Location: `pages/<Page>/queries/<ActionName>/metadata.json`
- Contains the query config for plugins (DB plugins, REST APIs, JS plugin action wiring).

### Widgets
- Location: `pages/<Page>/widgets/**/*.json`
- This is widget DSL; prefer editing in Appsmith UI whenever possible.

---

## Mandatory rules for JSObjects (do not break these)

### 1) `export default {` must be the first line
The JSObject file **must start with** exactly:

```js
export default {
```

on **line 1**. Nothing before it:
- no empty line
- no comments
- no BOM
- no `"use strict"`

Otherwise Appsmith may fail to parse/load the JSObject after sync.

### 2) Guard everything that can be undefined
Appsmith evaluates bindings as data loads; `qry_*.data` can be undefined until the query completes.

Use safe access:
- `qry_x?.data`
- `tbl?.selectedRow`
- `typeof qry_x !== "undefined"`
- `typeof appsmith !== "undefined"`

### 3) Side effects must be in `async` methods
Any action with side effects must be in an async method and awaited:
- `await qry_x.run()`
- `await storeValue("k", v)`
- `await navigateTo("Page", params)`

Avoid race conditions by always awaiting when order matters.

### 4) Keep JSObjects small and composable
Pattern:
- One JSObject per page domain (e.g. `reviewerFormActions`, `hrDashboardState`).
- Methods are verbs: `load()`, `saveDraft()`, `submit()`, `validate()`.
- Keep UI state derivation in JS, heavy work in queries.

---

## Mustache bindings (`{{ }}`) best practices

### Rules of thumb
- Use mustache bindings for **small** computed values (labels, booleans, simple maps).
- Move anything complex into a JSObject method or computed getter-like function.
- Avoid expensive computations on every render.

### Avoid runtime errors
Always handle undefined:
- `{{ (qry_get_user?.data ?? []).map(...) }}`
- `{{ tblUsers?.selectedRow?.id ?? null }}`

---

## Building pages (recommended layout patterns)

### Page layout
Use a predictable, maintainable structure:
- **Header** container: title, breadcrumbs, user context (optional)
- **Filters/actions** container: search, status filters, primary actions
- **Main content**: table/list, forms, details panel
- **Footer actions** (for forms): Save Draft / Submit / Cancel

### Form pages
Recommended approach:
- Widgets store raw values.
- A JSObject provides:
  - `getPayload()` (reads widget values, normalizes)
  - `validate()` (returns `{ ok, message }`)
  - `saveDraft()` / `submit()` (calls queries)

**Do not** implement a large amount of data transformation directly inside widget bindings.

---

## Queries (how to build them safely)

### Naming conventions
Use consistent naming:
- `qry_*` for reads
- `mut_*` (or `qry_*` if the codebase convention uses it) for writes
- `api_*` for REST calls
- `js_*` for JS plugin actions (optional)

### Prefer bulk operations
Avoid loops calling `*.run()` many times:
- one query with bulk insert/update is safer and faster

### Parameterization strategy
Preferred:
- Pass params via `query.run({ paramName: value })` and reference them as bindings in the query config.

Avoid:
- String concatenation in SQL or JSON docs that risks injection or quoting errors.

### On-page-load queries
Be conservative with `userSetOnLoad: true`:
- don’t auto-run heavy queries
- avoid loops where query success triggers storeValue that retriggers a query

### Data integrity rules
Enforce invariants at DB level where possible:
- unique constraints for “one response per assignment”
- foreign keys (if Postgres) or equivalent integrity checks

---

## Widget DSL pitfalls (Git Sync)

### Dynamic bindings must be declared
If a widget property contains `{{ ... }}`, the widget JSON should include that path in:
- `dynamicBindingPathList`

If an event handler uses `{{ ... }}`, it should be listed in:
- `dynamicTriggerPathList`

If you add bindings manually and forget these lists, Appsmith may not evaluate them correctly.

### Do not edit identifiers
Avoid changing:
- `widgetId`
- complex nested widget tree structures

Renaming `widgetName` requires updating all references across:
- other widgets’ bindings
- JSObjects
- queries (when referenced)

---

## Role-based access patterns (RBAC / gating)

### Recommended (most stable) approach
Use **Appsmith Groups** / platform RBAC as the source of truth.

Inside the app:
- Gate pages and sensitive actions via a JSObject, e.g. `auth.isHR()` / `auth.isAdmin()`.
- Keep gating logic centralized in one place.

### Common patterns
- Hide navigation links for unauthorized users (UX).
- Still enforce checks in JS actions and queries (security).
- On page load: if unauthorized, `navigateTo("Unauthorized")` or show a full-page message.

### Do not rely on “hidden UI” only
Hiding a button is not access control. Always validate on the server/DB side if possible, and in query filters.

---

## Slack / external API integration (typical flow)

### Common DM flow
1. Resolve Slack user identity:
   - preferred: store `slack_user_id` in your user table
   - fallback: lookup by email (if allowed by workspace policy)
2. Open/ensure DM channel (`conversations.open`)
3. Send message (`chat.postMessage`) with a link to the Appsmith page

### Link security
Prefer **Appsmith login required**.
Even with login, always validate that:
- the current user owns the assignment (`assignment.reviewer_email == appsmith.user.email`)

---

## Debugging playbook (common failures)

### “JSObject failed to load”
Most common cause: `export default {` is not on line 1.

### “Binding is not evaluating”
Likely causes:
- missing `dynamicBindingPathList` / `dynamicTriggerPathList`
- JSON became invalid (trailing commas, comments)
- referenced widget/query was renamed

### “Undefined errors in UI”
Cause: not guarding `qry.data`, `selectedRow`, etc.
Fix: always use optional chaining and defaults.

### “Page loads but data is empty”
Check:
- query filters use the right identity (`appsmith.user.email` vs external user id)
- on-page-load queries run order and dependencies
- environment variables / datasource config

---

## Definition of done (quick checklist)

- JSObjects parse (line-1 rule satisfied)
- No noisy `console.log`
- Queries are parameterized; no unsafe string concat
- No query loops (bulk ops where possible)
- Page gating enforced (not only hidden UI)
- All required bindings declared in widget DSL (if edited manually)
- Happy path + a few edge cases tested:
  - missing data / unauthorized access
  - double submit
  - slow query / retry

---

## Porting this playbook to another project

Copy this file into `docs/` of the target Appsmith Git Sync repo and optionally:
- add local naming conventions
- add datasource-specific query patterns (Postgres vs Mongo)
- add project-specific RBAC rules and user mapping notes

