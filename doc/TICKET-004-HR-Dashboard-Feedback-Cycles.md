# TASK-004 — Page 0 (HR): HR Dashboard — feedback cycles list

## Goal
Give HR specialists a paginated, filterable view of all feedback cycles, with navigation to:
- **Create Request** (empty form)
- **Request Detail** (selected cycle/request)

## Page / Audience
- **Page name:** `HR Dashboard`
- **Audience:** HR Specialist

## What was implemented (repo evidence)

### 1) JSObject: table data loading, filter logic, and navigation
- **JSObject file:** `pages/HR Dashboard/jsobjects/eventHandler/eventHandler.js`

Key functions:
1. `onPageLoad()`
   - Guards local usage.
   - Ensures user list query runs: `qry_get_all_users.run()`.
   - Populates the “Reviewed person” Select via `loadReviewedPersonOptions()`.
   - Loads cycles: `loadRequests()` (runs `qry_get_requests`).
2. `getFilteredRequestsData(statusRaw, deadlineRaw, searchRaw)`
   - Applies **client-side filtering** over `qry_get_requests.data`:
     - status match
     - deadline match (`YYYY-MM-DD`)
     - reviewed-person match (uses `reviewed_person_name` and `reviewed_person_email`)
   - Treats `ALL` as “no filter”.
3. `onOpenRequest(requestId)`
   - Normalizes selected request id.
   - Stores `selectedRequestId`.
   - Navigates to `Request Detail`.
4. `onCreateNew()`
   - Stores `selectedRequestId = null`.
   - Navigates to `Create Request`.

### 2) Queries
- `qry_get_requests`
  - **Location:** `pages/HR Dashboard/queries/qry_get_requests/metadata.json` (+ `.txt`)
  - **Responsibility:** fetches feedback cycles and reviewer/user fields used by the table and filters.
- `qry_get_all_users`
  - **Location:** `pages/HR Dashboard/queries/qry_get_all_users/metadata.json` (+ `.txt`)
  - **Responsibility:** provides the selectable “Reviewed person” values.

### 3) Widgets: filters and cycles table
Filters:
- `sel_status` — `pages/HR Dashboard/widgets/sel_status.json`
  - Select widget with status options.
- `dp_deadline` — `pages/HR Dashboard/widgets/dp_deadline.json`
  - DatePicker for deadline filtering.
- `select_reviewed_person_search` — `pages/HR Dashboard/widgets/select_reviewed_person_search.json`
  - Select with:
    - `optionLabel: "name"`
    - `optionValue: "email"`
  - Runtime options are populated using:
    - `onDropdownOpen: {{ eventHandler.loadReviewedPersonOptions() }}`

Table:
- `tbl_requests` — `pages/HR Dashboard/widgets/tbl_requests.json`
  - `tableData` binding:
    - `{{ eventHandler.getFilteredRequestsData(sel_status?.selectedOptionValue ?? '', dp_deadline?.selectedDate ?? '', select_reviewed_person_search?.selectedOptionValue ?? '') }}`
  - Row click:
    - `onRowClick` calls `eventHandler.onOpenRequest(...)`
  - Hardened computed column fallbacks to avoid `ReferenceError` when data is initially empty.

CTA Button:
- `btn_create_new_cycle` — `pages/HR Dashboard/widgets/btn_create_new_cycle.json`
  - `onClick: {{ eventHandler.onCreateNew() }}`

### 4) Navigation targets
The dashboard’s JS expects pages to exist with names:
- `Create Request`
- `Request Detail`

If Git Sync/import does not include these page definitions, navigation will fail even if the dashboard UI works.

## Debugging notes (important — avoids repeating past errors)
The “Reviewed person” Select required a very specific setup in Appsmith:
- `sourceData` had to be kept **static and linter-safe** (so design-time validation doesn’t fail).
- Real options are loaded at runtime via `onDropdownOpen`.
- `loadReviewedPersonOptions()` must not return a Promise from the trigger binding (Appsmith can log validation/type errors).
- `setOptions()` items must include the required keys (`email` for value key) and match the widget configuration.

## Acceptance criteria checklist
- Table loads data on page open.
- `Status`, `Deadline`, and `Reviewed person` filters narrow the table correctly.
- Clicking a row navigates to Request Detail with the correct request id.
- “Create New Cycle” navigates to Create Request with an empty form.

## Key files (quick index)
- `pages/HR Dashboard/jsobjects/eventHandler/eventHandler.js`
- `pages/HR Dashboard/widgets/tbl_requests.json`
- `pages/HR Dashboard/widgets/select_reviewed_person_search.json`
- `pages/HR Dashboard/widgets/sel_status.json`
- `pages/HR Dashboard/widgets/dp_deadline.json`
- `pages/HR Dashboard/widgets/btn_create_new_cycle.json`
- `pages/HR Dashboard/queries/qry_get_requests/metadata.json`
- `pages/HR Dashboard/queries/qry_get_all_users/metadata.json`

