# TASKS — HR 360 Feedback (Appsmith)

> **Version:** 2.0 (updated 2026-03-19)  
> **Based on:** `doc/ts-hr-prd-en.md` v1.1, `doc/ts-hr-feedback-360.md`, `Agent.md`
>
> **How to use with an agent:**  
> Pick a task and open it together with `Agent.md`, `APPSMITH_HOW_TO_BUILD.md`,  
> and `APPSMITH_AGENT_PLAYBOOK.md`. Each task is self-contained: it lists acceptance  
> criteria, page/file names, and required query/JSObject names.

---

## Key PRD decisions (important for the agent)

| Topic | Decision |
|-------|----------|
| HR role | Determined by the **external membership app**; no Admin page in this app |
| Authentication | Appsmith login required for all roles (no magic links) |
| Identity | Current user = `appsmith.user.email`, mapped to `users.email` in external DB |
| HR admin | No HR-user management page in this app |
| Draft | Unlimited retention, no expiry |
| Post-submit edit | Not allowed |
| Anonymity | None |
| DB | **Postgres** for both MVP and production; final schema is unknown and will be provided later — the MVP schema below is provisional and will need to be adapted |

---

## TASK-001 — Project scaffold: new Appsmith app + Git Sync

**Goal:** Bootstrap the project so further tasks can be done via Git Sync commits.

**Steps:**
1. Create a new Appsmith application named `HR 360 Feedback`.
2. Connect it to this Git repository via Appsmith Git Sync (Settings → Git Sync).
3. Verify that the `pages/` directory appears in the repo after the first pull/commit.
4. Rename the default page to `HR Dashboard`.

**Acceptance criteria:**
- `pages/` directory exists in the repo with at least one page folder.
- Git Sync works in both directions (commit from UI → visible in repo; commit to repo → visible in UI).

---

## TASK-002 — Datasource: PostgreSQL connection

**Goal:** Add and configure the external PostgreSQL datasource in Appsmith.

> ⚠️ **Blocking:** connection details must be provided before this task starts (host, port, DB name, credentials).
>
> **Note:** The final production DB is also Postgres, but the exact schema is not yet known. We connect to a temporary Postgres instance for MVP. Once the real schema is shared, datasource config and queries will need to be updated accordingly.

**Steps:**
1. Add a new PostgreSQL datasource named `feedback_db`.
2. Store credentials in Appsmith environment (do not hardcode in query bodies).
3. Test the connection — it must show green "Connected".
4. If needed, add a separate `users_db` datasource (if users live in a different DB).

**Acceptance criteria:**
- Datasource(s) show "Connected" status in Appsmith.
- Test query `SELECT 1` runs successfully.

---

## TASK-003 — Database schema: create tables

**Goal:** Create the three core tables per the data model (PRD §7) on the **temporary MVP Postgres instance**.

> ⚠️ **Provisional schema.** The final production database is also Postgres, but its exact schema (table names, column names, existing tables) is not yet known. This SQL is a working placeholder. When the real schema is provided, this task will require a follow-up migration task to align queries, column references, and joins with the production structure.

**SQL:**

```sql
-- Users (if not already in external DB, or adapt to existing schema)
CREATE TABLE IF NOT EXISTS users (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  slack_user_id TEXT
);

-- Feedback requests
CREATE TABLE IF NOT EXISTS feedback_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_name          TEXT NOT NULL,
  reviewed_person_id  UUID REFERENCES users(id),
  request_type        TEXT CHECK (request_type IN ('self','peer','manager','upward')) NOT NULL,
  status              TEXT CHECK (status IN ('draft','active','closed','archived')) NOT NULL DEFAULT 'draft',
  deadline            DATE NOT NULL,
  notes               TEXT,
  reference_link      TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Reviewer assignments
CREATE TABLE IF NOT EXISTS feedback_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID REFERENCES feedback_requests(id),
  reviewer_id  UUID REFERENCES users(id),
  status       TEXT CHECK (status IN ('pending','submitted')) NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  UNIQUE (request_id, reviewer_id)   -- prevents duplicates
);

-- Submitted responses
CREATE TABLE IF NOT EXISTS feedback_responses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id      UUID REFERENCES feedback_assignments(id),
  request_id         UUID REFERENCES feedback_requests(id),
  reviewed_person_id UUID REFERENCES users(id),
  reviewer_id        UUID REFERENCES users(id),
  text_answers       JSONB DEFAULT '{}',
  ratings            JSONB DEFAULT '{}',
  submitted_at       TIMESTAMPTZ DEFAULT now()
);
```

**Acceptance criteria:**
- All tables exist in the DB.
- `UNIQUE (request_id, reviewer_id)` constraint is present on `feedback_assignments`.
- Manual `INSERT` + `SELECT` works for each table.

---

## TASK-004 — Page 0 (HR): HR Dashboard — feedback cycles list

**Goal:** Give HR specialists a paginated, filterable view of all feedback cycles.

**Page name:** `HR Dashboard`  
**Audience:** HR Specialist

> **RBAC note:** The HR role is verified via the external membership app. In Appsmith, check that the current user belongs to the `HR` Appsmith Group or verify via a query to the external DB — align with the team before implementation.

**Queries:**
- `qry_get_requests` —
  ```sql
  SELECT fr.*, u.name AS reviewed_person_name,
         COUNT(fa.id) AS total,
         COUNT(fa.id) FILTER (WHERE fa.status = 'submitted') AS completed
  FROM feedback_requests fr
  JOIN users u ON u.id = fr.reviewed_person_id
  LEFT JOIN feedback_assignments fa ON fa.request_id = fr.id
  GROUP BY fr.id, u.name
  ```
  Plus optional filters by status / deadline.

**JSObject:** `jsHrDashboard`
- `onPageLoad()` — guard HR access, then run `qry_get_requests`.
- `loadRequests()` — runs `qry_get_requests` with current filter values.
- `onCreateNew()` — `storeValue('selectedRequestId', null)` + `navigateTo('Create Request')`.
- `onOpenRequest(requestId)` — `storeValue('selectedRequestId', requestId)` + `navigateTo('Request Detail')`.

**Widgets:**
- Filters row: status dropdown (`sel_status`), deadline date-picker (`dp_deadline`), reviewed person search input.
- Table `tbl_requests` columns: Cycle Name, Reviewed Person, Type, Status (badge), Deadline, Completed/Total, Actions.
- "Create New Cycle" button (top-right).

**Acceptance criteria (AC1, AC5):**
- Table loads all requests on page open.
- Status and deadline filters work.
- Clicking a row navigates to Request Detail with the correct `selectedRequestId`.
- "Create New Cycle" navigates to Create Request page with an empty form.

---

## TASK-005 — Page 1 (HR): Create / Edit Feedback Request

**Goal:** HR can create a new feedback cycle or edit an existing one.

**Page name:** `Create Request`  
**Audience:** HR Specialist

**Queries:**
- `qry_get_users` — `SELECT id, name, email FROM users ORDER BY name` (for selectors).
- `qry_get_request_by_id` — `SELECT * FROM feedback_requests WHERE id = '{{this.params.id}}'` (edit mode).
- `qry_get_assignments_by_request` — `SELECT reviewer_id FROM feedback_assignments WHERE request_id = '{{this.params.requestId}}'` (load current reviewer list in edit mode).
- `qry_create_request` — `INSERT INTO feedback_requests (...) VALUES (...) RETURNING id`.
- `qry_update_request` — `UPDATE feedback_requests SET ... WHERE id = '{{this.params.id}}'`.
- `qry_create_assignments` — bulk `INSERT INTO feedback_assignments (request_id, reviewer_id) VALUES ...`.
- `qry_delete_assignments_by_request` — `DELETE FROM feedback_assignments WHERE request_id = '{{this.params.requestId}}'` (for reviewer list refresh on re-activate).

**JSObject:** `jsCreateRequest`
- `onPageLoad()` — if `appsmith.store.selectedRequestId` exists, load existing data for edit mode.
- `getPayload()` — collect and normalize all widget values.
- `validate()` — check required fields; return `{ ok, message }`.
- `saveDraft()` — upsert request with status=`draft`; show success alert.
- `activate()` — upsert with status=`active` → bulk-create assignments → notify reviewers (TASK-009).
- `addReviewer(userId)` / `removeReviewer(userId)` — manage local reviewer list state.

**Widgets:**
- Text input: Cycle Name (required) — `inp_cycle_name`.
- Select: Reviewed Person (searchable, `qry_get_users`) — `sel_reviewed_person`.
- Select: Request Type — `sel_request_type` (options: self / peer / manager / upward).
- MultiSelect: Reviewers (searchable, `qry_get_users`) — `msel_reviewers`.
- DatePicker: Deadline (required) — `dp_deadline`.
- Textarea: Notes (optional) — `ta_notes`.
- Text input: Reference Link (optional) — `inp_ref_link`.
- Buttons: `btn_save_draft`, `btn_activate`.

**Acceptance criteria (AC1, AC8):**
- Form validates required fields before submission (submit blocked if incomplete).
- "Save Draft" saves with status=`draft`, shows success alert, stays on form.
- "Activate" saves with status=`active`, creates assignments, navigates to HR Dashboard.
- In edit mode, existing data pre-fills the form.
- User list is loaded from external DB in all selector fields.

---

## TASK-006 — Page 2 (HR): Request Detail & Progress

**Goal:** HR can view per-reviewer submission status for a specific feedback cycle.

**Page name:** `Request Detail`  
**Audience:** HR Specialist

**Queries:**
- `qry_get_request_progress` —
  ```sql
  SELECT fa.id, u.name, u.email, fa.status, fa.submitted_at
  FROM feedback_assignments fa
  JOIN users u ON u.id = fa.reviewer_id
  WHERE fa.request_id = '{{this.params.requestId}}'
  ORDER BY u.name
  ```
- `qry_get_request_by_id` — load request metadata.
- `qry_close_request` — `UPDATE feedback_requests SET status='closed', updated_at=now() WHERE id='{{this.params.id}}'`.

**JSObject:** `jsRequestDetail`
- `onPageLoad()` — load request metadata + reviewer progress.
- `closeCycle()` — confirmation modal → `qry_close_request.run()` → reload.
- `renotifyReviewer(reviewerId)` — (optional) re-send Slack DM.

**Widgets:**
- Read-only header: Cycle Name, Reviewed Person, Type, Status badge, Deadline, Notes.
- Table `tbl_progress` columns: Reviewer Name, Email, Status (badge), Submitted At.
- Buttons: `btn_close_cycle`, `btn_back` (navigate to HR Dashboard).
- Confirmation modal `mdl_confirm_close`.

**Acceptance criteria (AC5):**
- All assigned reviewers shown with correct submission status.
- "Close Cycle" changes status to `closed`.
- Reviewer list is visible to HR only (not to the Reviewed Person).

---

## TASK-007 — Page 3 (Reviewer): My Tasks list

**Goal:** Reviewer sees only their own assigned feedback requests.

**Page name:** `Reviewer Tasks`  
**Audience:** Reviewer (any authenticated Appsmith user)

**Queries:**
- `qry_resolve_user_by_email` — `SELECT id FROM users WHERE email = '{{this.params.email}}'` — resolve `reviewer_id` from `appsmith.user.email`.
- `qry_get_reviewer_tasks` —
  ```sql
  SELECT fa.id AS assignment_id, fr.id AS request_id,
         u.name AS reviewed_person_name, fr.request_type,
         fr.deadline, fa.status
  FROM feedback_assignments fa
  JOIN feedback_requests fr ON fr.id = fa.request_id
  JOIN users u ON u.id = fr.reviewed_person_id
  WHERE fa.reviewer_id = '{{this.params.reviewerId}}'
    AND fr.status = 'active'
  ORDER BY fr.deadline
  ```

**JSObject:** `jsReviewerTasks`
- `onPageLoad()` — resolve userId via `qry_resolve_user_by_email`, then load tasks.
- `openForm(assignmentId, requestId)` — `storeValue('selectedAssignmentId', assignmentId)` + `storeValue('selectedRequestId', requestId)` + `navigateTo('Feedback Form')`.

**Widgets:**
- Table/List `tbl_tasks` columns: Reviewed Person Name, Request Type, Deadline, Status (badge).
- "Open Form" button per row (disabled if status=`submitted`).

**Acceptance criteria (AC2):**
- Only the logged-in reviewer's assignments are shown.
- Submitted tasks show "Submitted" badge; "Open Form" is disabled.
- "Open Form" navigates to Feedback Form with correct context.

---

## TASK-008 — Page 4 (Reviewer): Feedback Form

**Goal:** Reviewer completes and submits the structured questionnaire.

**Page name:** `Feedback Form`  
**Audience:** Reviewer

**Queries:**
- `qry_get_form_context` —
  ```sql
  SELECT fr.cycle_name, fr.notes, fr.reference_link, fr.deadline,
         u.name AS reviewed_person_name,
         fa.status AS assignment_status
  FROM feedback_assignments fa
  JOIN feedback_requests fr ON fr.id = fa.request_id
  JOIN users u ON u.id = fr.reviewed_person_id
  WHERE fa.id = '{{this.params.assignmentId}}'
  ```
- `qry_get_draft_response` — `SELECT text_answers, ratings FROM feedback_responses WHERE assignment_id = '{{this.params.assignmentId}}' AND submitted_at IS NULL LIMIT 1`.
- `qry_upsert_draft_response` — `INSERT ... ON CONFLICT (assignment_id) DO UPDATE SET text_answers=..., ratings=...` (only while `submitted_at IS NULL`).
- `qry_submit_response` — two steps:
  1. `INSERT INTO feedback_responses (..., submitted_at = now())`.
  2. `UPDATE feedback_assignments SET status='submitted', submitted_at=now() WHERE id=...`.

**JSObject:** `jsFeedbackForm`
- `onPageLoad()` — load form context; if a draft exists, restore saved answers into widgets.
- `getPayload()` — collect all widget answers into `{ text_answers: {...}, ratings: {...} }`.
- `saveDraft()` — call `qry_upsert_draft_response.run(this.getPayload())`.
- `validate()` — check 6 required text questions + 4 ratings; return `{ ok, missing[] }`.
- `submitForm()` — `validate()` → confirmation modal → `qry_submit_response.run()` → `navigateTo('Reviewer Tasks')`.

**Form sections (per PRD FR3):**

*General Info (read-only):*
- Cycle Name, Instructions/Notes, Reviewed Person Name, Reviewer Email.

*Text questions (multiline textarea; required unless marked optional):*
1. `q1` — Key contributions / results over the last 6 months — **required**
2. `q2` — How effectively does the person handle challenges? (with examples) — **required**
3. `q3` — Contribution to the success of the team, project, and/or company — **required**
4. `q4` — What was difficult or didn't go as planned? What could be improved? — **required**
5. `q5` — What helps the person ensure high quality in their work? — **required**
6. `q6` — Main goals or priorities for development — **required**
7. `q7` — Training and upskilling recommendations — *optional*
8. `q8` — Anything else you'd like to share — *optional*

*Rating questions (Radio Group or Star widget, scale 1–5, all required):*
1. `r1` — Demonstrates main strengths and professional skills at work
2. `r2` — Demonstrates practices that ensure high quality of work
3. `r3` — Open to feedback and demonstrates a growth mindset
4. `r4` — Aligns with company valued behaviors and team culture *(with reference link)*

*Scale:* 1 = Below Expectations … 5 = Significantly Exceeds Expectations

**Widgets:**
- Textarea per question `q1`–`q8`: `rea_q1` … `rea_q8`.
- Radio Group or Star widget per rating `r1`–`r4`: `rg_r1` … `rg_r4`.
- Buttons: `btn_save_draft`, `btn_submit`.
- Confirmation modal: `mdl_confirm_submit`.

**Acceptance criteria (AC3, AC4, AC7):**
- Submit is blocked until all required fields are complete.
- "Save Draft" saves partial answers; reopening the form restores them.
- After submit, the form becomes read-only; "Submit" is disabled.
- `feedback_responses` record is created; `feedback_assignments.status` = `submitted`.
- Duplicate submission is prevented (DB unique constraint + UI guard).

---

## TASK-009 — Slack DM: notify reviewer on assignment

**Goal:** When a request is activated and a reviewer is assigned, send them a Slack DM.

**Depends on:** TASK-005 (activate step)

**Datasource:** Slack API — add as an Authenticated API datasource using the existing bot token.

**Queries:**
- `api_slack_post_message` — `POST https://slack.com/api/chat.postMessage`
  - Headers: `Authorization: Bearer {{slack_bot_token}}`
  - Body: `{ "channel": "{{this.params.slackUserId}}", "text": "{{this.params.message}}" }`

**JSObject (add to `jsCreateRequest`):**
- `async notifyReviewer(reviewer)`:
  ```js
  const slackId = reviewer.slack_user_id;
  if (!slackId) { console.warn("No slack_user_id for", reviewer.email); return; }
  const msg = `Hi ${reviewer.name}! 👋\nYou've been assigned to provide 360 feedback for *${reviewedPersonName}*.\n📅 Deadline: ${deadline}\n🔗 Open the form: ${formUrl}`;
  await api_slack_post_message.run({ slackUserId: slackId, message: msg });
  ```
- `async notifyAllReviewers(assignmentList)` — iterates the list, calls `notifyReviewer` for each.
- Called inside `activate()` after assignments are successfully created.

**Acceptance criteria (AC6):**
- Reviewer receives a Slack DM when a request is activated.
- Message includes reviewer name, reviewed person name, deadline, and a link to Feedback Form.
- If the Slack call fails → HR sees a warning alert; the activation process **does not stop**.
- If `slack_user_id` is missing → skip silently, log `console.warn`.

---

## TASK-010 — Access control: page-level role guards

**Goal:** Ensure HR pages are accessible only to HR users, and the Feedback Form only to the assigned reviewer.

**Approach:** Centralized `jsAuth` JSObject (shared across pages or per-page guard).

**Queries:**
- `qry_check_hr_role` — query to the external membership app or Appsmith Group confirming the HR role for the current user.  
  > ⚠️ **Open question:** exact mechanism (Appsmith Groups vs external `hr_roles` DB table) — align with team before implementation. Until resolved, use a placeholder (hardcoded email list or Appsmith Group).
- `qry_check_assignment_owner` — `SELECT 1 FROM feedback_assignments WHERE id = '{{this.params.assignmentId}}' AND reviewer_id = (SELECT id FROM users WHERE email = '{{this.params.email}}')`.

**JSObject `jsAuth`:**
```js
export default {
  async requireHR() {
    await qry_check_hr_role.run({ email: appsmith.user.email });
    if (!(qry_check_hr_role.data?.length > 0)) {
      showAlert("Access denied", "error");
      navigateTo("Reviewer Tasks", {}, "SAME_WINDOW");
      return false;
    }
    return true;
  },

  async requireAssignmentOwner(assignmentId) {
    await qry_check_assignment_owner.run({
      assignmentId,
      email: appsmith.user.email
    });
    if (!(qry_check_assignment_owner.data?.length > 0)) {
      showAlert("Access denied", "error");
      navigateTo("Reviewer Tasks", {}, "SAME_WINDOW");
      return false;
    }
    return true;
  }
};
```

**Guard table:**

| Page | Guard |
|------|-------|
| `HR Dashboard` | `jsAuth.requireHR()` in `onPageLoad` |
| `Create Request` | `jsAuth.requireHR()` in `onPageLoad` |
| `Request Detail` | `jsAuth.requireHR()` in `onPageLoad` |
| `Reviewer Tasks` | Any authenticated user (filtered by email, no redirect) |
| `Feedback Form` | `jsAuth.requireAssignmentOwner(assignmentId)` in `onPageLoad` |

**Acceptance criteria (AC from PRD FR7):**
- A non-HR user opening `HR Dashboard` is redirected to `Reviewer Tasks`.
- A reviewer cannot open another reviewer's Feedback Form (ownership check).
- Hiding UI elements is an additional UX measure — **not the only line of defense**.

---

## TASK-011 — Documentation: update doc/ after each task

**Goal:** Keep `doc/` up to date after each implemented feature (per `Agent.md` documentation rules).

**Rules:**
- After each task above: create or update a `.md` file in `doc/`.
- For bug fixes: create a dedicated `doc/bugfix-<short-name>.md`.
- Each doc must include: what was built, key queries/JSObjects involved, how to verify.

**Template:**
```markdown
# [Feature / Fix Name]

## What was implemented
...

## Changed files
- `pages/<Page>/jsobjects/...`
- `pages/<Page>/queries/...`

## Key queries / JSObjects
- `qry_xxx` — description
- `jsXxx.methodName()` — description

## How to verify
1. Step one
2. Step two
```

**Acceptance criteria:**
- Every merged feature has a corresponding entry in `doc/`.
- No orphaned features without documentation.

---

## Suggested execution order

```
TASK-001 (scaffold — first)
  └─ TASK-002 (DB connection)
       └─ TASK-003 (schema)
            ├─ TASK-004 (HR Dashboard)
            ├─ TASK-005 (Create/Edit Request) ──→ TASK-009 (Slack)
            ├─ TASK-006 (Request Detail)
            ├─ TASK-007 (Reviewer Tasks)
            └─ TASK-008 (Feedback Form)
                 └─ TASK-010 (Access control — apply to all pages)

TASK-011 (docs) — ongoing after each task
```

---

## Open questions (blocking — resolve before implementation)

| # | Question | Affects |
|---|----------|---------|
| OQ1 | DB connection details (host, port, creds, environment) | TASK-002 |
| OQ2 | Users table: where is the canonical user list, and does it have `slack_user_id`? | TASK-003, TASK-009 |
| OQ3 | Slack: is `slack_user_id` available, or should we use email-based lookup? | TASK-009 |
| OQ4 | HR role check: Appsmith Groups or external DB table? | TASK-010 |
