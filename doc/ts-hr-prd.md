# PRD: HR 360 Feedback Application (Appsmith)

**Version:** 1.1  
**Date:** 2026-03-18  
**Status:** Approved for MVP (DB details pending; temporary Postgres allowed)  

---

## 1. Overview

The HR 360 Feedback Application is an Appsmith-based internal tool that replaces the current Google Forms workflow. It enables HR specialists to create structured feedback cycles, assign reviewers, collect responses, and track progress — all from a single platform backed by an external database.

### 1.1 Problem Statement

The current Google Forms solution lacks centralized management: HR cannot track completion status, manage reviewer assignments, or audit responses without manual spreadsheet handling. The result is operational overhead and limited visibility into cycle progress.

### 1.2 Solution

Build an Appsmith multi-page application that:
- Provides HR with a dashboard to create and manage feedback cycles
- Serves reviewers a dedicated task list and structured feedback form
- Stores all data in an external database (for MVP we can start with temporary Postgres; final DB TBD)
- Sends Slack DM notifications to reviewers upon assignment

---

## 2. Goals

| ID | Goal |
|----|------|
| G1 | Replace Google Forms with a managed Appsmith UI for feedback collection |
| G2 | Allow HR to create feedback requests with defined reviewers and deadlines |
| G3 | Allow reviewers to complete structured questionnaires via Appsmith |
| G4 | Persist all requests, assignments, and responses in an external database |
| G5 | Provide HR with real-time progress tracking (submitted vs pending) |
| G6 | Notify reviewers of new assignments via Slack DM |
| G7 | Support role-based access: HR sees everything; reviewer sees only their assignments |

---

## 3. Non-Goals (MVP)

- Anonymous feedback masking
- Analytics dashboards or aggregate reporting UI
- Email notifications
- Export to PDF or Excel
- Dynamic form builder (questions are fixed per MVP cycle)
- Multi-language support

---

## 4. Roles & Access

### 4.0 Authentication (Confirmed)
- **Reviewer access requires Appsmith login** (no magic links in MVP).
- Reviewer identity is derived from the logged-in user (e.g. `appsmith.user.email` mapped to external user records).

### 4.1 HR Specialist (membership-driven)
- HR access is determined by the existing membership app (outside of this Appsmith HR 360 app).
- Full access to all feedback cycles
- Can create, edit, activate, and close requests
- Can assign reviewers and reviewed persons
- Can track submission progress

### 4.2 Reviewer
- Can view only their assigned feedback requests
- Can submit (and optionally save as draft) feedback for each assignment
- Cannot see other reviewers' assignments or submissions

### 4.3 Reviewed Person
- May be assigned as a reviewer for their own self-feedback
- Cannot see feedback from other reviewers (unless HR decides to share results)

---

## 5. Functional Requirements

### FR1 — Feedback Request Management (HR)

HR must be able to:
- Create a new feedback cycle with the following fields:
  - **Cycle name** (required)
  - **Reviewed person** — selected from user list loaded from external DB (required)
  - **Request type** — `self`, `peer`, `manager`, `upward` (required)
  - **Reviewer list** — multi-select from user list (required, min 1)
  - **Deadline** — date picker (required)
  - **Status** — `draft`, `active`, `closed`, `archived`
  - **Notes / instructions** — optional free text
  - **Reference link** — optional (e.g. company values page)
- Save request as draft or activate immediately
- Edit any request (change reviewers, deadline, notes) while status is `draft` or `active`
- View all requests in a paginated, filterable list

### FR2 — Assignment Logic

- Each request has exactly **1 reviewed person** and **1 or more reviewers**
- A reviewer can also be the reviewed person (self-feedback) **(Confirmed)**
- No duplicate assignments per cycle (same reviewer cannot be added twice for same reviewed person)
- HR can see per-reviewer submission status (submitted / pending)
- **Reviewed person cannot see the reviewer list** **(Confirmed)**

### FR3 — Feedback Form for Reviewers

The form structure mirrors the current Google Form:

#### General Info Section
- Cycle title (read-only)
- Instructions (read-only)
- Reviewed person (read-only)
- Reviewer email (pre-filled from authenticated user)

#### Text Questions (required unless noted)
1. Describe up to 3 key contributions or results over the last 6 months
2. How effectively does the person handle challenges? (with examples)
3. Describe how the work contributes to the success of the team, project, and/or the company
4. What was difficult or didn't go as planned? What could be improved?
5. What helps the person ensure high quality in their work?
6. What should be the main goals or priorities in development?
7. Recommendations for training, learning, and upskilling *(optional)*
8. Anything else you'd like to share *(optional)*

#### Rating Questions (1–5 scale)

Scale:
- 1 = Below Expectations
- 2 = Partially Meets Expectations  
- 3 = Meets Expectations (baseline)
- 4 = Exceeds Expectations
- 5 = Significantly Exceeds Expectations

Rated dimensions:
1. Demonstrates main strengths and professional skills at work
2. Demonstrates practices that ensure high quality of work
3. Open to feedback and demonstrates a growth mindset
4. Aligns with company valued behaviors and team culture *(with reference link to definitions)*

#### Form Behavior
- Required field validation (submit blocked until all required fields are complete)
- Multiline text inputs for open questions
- Clear visual star/radio rating UI
- **Save as draft and return later** **(Confirmed)**
  - Draft retention: **unlimited** (no expiry logic in MVP)
- **Edit submission after submit**: **not allowed** (editable only before submit) **(Confirmed)**

### FR4 — External User Integration

- Reviewed person selector and reviewer multi-select must load users from external DB
- Minimum required user fields: `id`, `name`, `email`
- User list must be searchable

### FR5 — Feedback Storage

All responses stored in external DB. Separate entities:

| Entity | Key Fields |
|--------|-----------|
| `feedback_requests` | id, cycle_name, reviewed_person_id, type, deadline, status, notes, link, created_by, created_at |
| `feedback_assignments` | id, request_id, reviewer_id, status (pending/submitted), submitted_at |
| `feedback_responses` | id, assignment_id, request_id, reviewed_person_id, reviewer_id, text_answers (JSON), ratings (JSON), submitted_at |

Audit/metadata (MVP):
- Track **author/creator** for requests (`created_by`) **(Confirmed)**
- No additional audit trail requirements in MVP (e.g. change history not required)

### FR6 — Progress Tracking (HR)

HR Dashboard must show:
- List of all feedback cycles with: name, reviewed person, status, deadline, completed/total reviewers
- Per-cycle detail: list of reviewers with submission status and timestamp

### FR7 — Access Control

| Role | Access |
|------|--------|
| HR Specialist | HR pages: create/edit requests, view all assignments, track progress |
| Reviewer | Reviewer pages: tasks + feedback form for own assignments only |
| Reviewed Person | No dedicated view in MVP (may have Reviewer role if self-feedback assigned) |

### FR8 — Slack Notification

- When a reviewer is assigned to an active feedback request → send Slack DM to reviewer
- Message must include: reviewer name, reviewed person name, deadline, link to the Feedback Form
- Implementation: Appsmith Slack API integration using an existing bot token

Confirmed constraints:
- Reviewer receives DM with a link to the form, and must authenticate in Appsmith to proceed.

---

## 6. Suggested Application Pages

### Page 0 — HR Dashboard
- **Audience:** HR
- Paginated list of feedback cycles
- Filters: status, deadline, reviewed person
- "Create New Request" button
- Per-row: status badge, completion counter, quick actions

### Page 1 — Create / Edit Request
- **Audience:** HR
- Form for cycle name, reviewed person, type, reviewers (multi-select), deadline, notes, link
- Buttons: "Save Draft" / "Activate"
- Reviewer assignment list with ability to add/remove

### Page 2 — Request Detail & Progress
- **Audience:** HR
- Cycle metadata (read-only)
- Table: reviewer email, submission status, submitted_at
- Actions: close cycle, re-notify reviewer (optional)

### Page 3 — Reviewer Tasks
- **Audience:** Reviewer
- List of assigned requests (filtered by logged-in user's email/ID)
- Shows: reviewed person name, request type, deadline, status (pending/submitted)
- "Open Form" button for pending assignments

### Page 4 — Feedback Form
- **Audience:** Reviewer
- Full questionnaire as described in FR3
- Submit button (with confirmation dialog)
- "Save Draft" button

---

## 7. Data Model (Suggested)

### `feedback_requests`
```
id               UUID / ObjectId
cycle_name       string
reviewed_person_id  string (ref to users)
request_type     enum: self | peer | manager | upward
status           enum: draft | active | closed | archived
deadline         date
notes            text (optional)
reference_link   string (optional)
created_by       string (HR user id)
created_at       timestamp
updated_at       timestamp
```

### `feedback_assignments`
```
id               UUID / ObjectId
request_id       string (ref to feedback_requests)
reviewer_id      string (ref to users)
status           enum: pending | submitted
submitted_at     timestamp (nullable)
```

### `feedback_responses`
```
id               UUID / ObjectId
assignment_id    string
request_id       string
reviewed_person_id  string
reviewer_id      string
text_answers     JSON object (question_key → answer string)
ratings          JSON object (dimension_key → integer 1–5)
submitted_at     timestamp
```

> **Note:** If the existing Google Forms database already stores partial data, the schema above may need to be adapted based on HR's answer about data migration.

---

## 8. AppSmith Implementation Notes

### Datasources
- External user DB (source of user list)
- External feedback DB (source of truth for requests, assignments, responses)
- Slack API (for DM notifications)

### Suggested Query Names

| Query | Description |
|-------|-------------|
| `qry_get_users` | Load user list for selectors |
| `qry_get_requests` | HR dashboard list |
| `qry_create_request` | Insert new cycle |
| `qry_update_request` | Edit cycle or change status |
| `qry_create_assignments` | Bulk insert reviewer assignments |
| `qry_get_reviewer_tasks` | Reviewer's pending/submitted list |
| `qry_get_form_context` | Load cycle + assignment data for form |
| `qry_submit_response` | Insert feedback response + update assignment status |
| `qry_get_request_progress` | HR progress tracking per cycle |
| `mut_notify_reviewer_slack` | Slack DM via API |

### AppSmith Store
Use `storeValue` to pass context between pages:
- `selectedRequestId`
- `selectedAssignmentId`
- `currentReviewedPersonId`

---

## 9. Non-Functional Requirements

| Area | Requirement |
|------|-------------|
| Usability | Clear and minimal UI; reviewers should complete form without training |
| Validation | All required fields validated before submission; no silent failures |
| Data Integrity | No duplicate submissions per assignment (enforce at DB level) |
| Security | Reviewer cannot access another reviewer's form or HR pages |
| Maintainability | Modular AppSmith JS objects; queries follow `qry_*` naming convention |
| Git Sync | New repository connected to Appsmith via Git Sync from day one |

Confirmed MVP decisions:
- No anonymity.
- Reviewed person does not see reviewer list.
- Questions are fixed (no form builder).
- No recurring/scheduled cycles (manual creation only).
- No reporting/aggregation UI in MVP (may be added as improvement).
- Draft retention is unlimited (no expiry), and version history is not required.
- Submission is editable only before submit; post-submit editing is not allowed.
- Reviewer must authenticate in Appsmith to open and submit the form.
- Audit requirement in MVP is minimal: track request author (`created_by`) only.
- Data retention and deletion policies are handled outside the app (external DB); no in-app deletion required for MVP.

---

## 10. Open Questions

### 10.1 Blocking (must answer before implementation)
- **DB choice and access**: Postgres vs Mongo, connection details, environments (MVP can start on temporary Postgres).
- **User source**: where the canonical user list lives; required fields available (`id`, `name`, `email`, and ideally `slack_user_id`).
- **Slack integration inputs**: whether `slack_user_id` is available; otherwise confirm that email-based Slack lookup is allowed in the workspace.
- **HR role source of truth**: provided by the existing membership app (outside of this HR 360 Appsmith app).

### 10.2 Non-blocking (can be handled later)
- What HR should see after completion (aggregation/summary/reporting) — improvement.
- Exports (CSV/PDF) — not MVP.
- Results view for reviewed persons — not MVP.

---

## 11. Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC1 | HR can create a feedback request, select a reviewed person, assign reviewers, set a deadline, and activate |
| AC2 | Reviewer sees only their own assigned feedback requests |
| AC3 | Reviewer can complete and submit the full feedback form (text + ratings) |
| AC4 | Submitted responses are stored in the external database |
| AC5 | HR can view per-reviewer submission status on the Request Detail page |
| AC6 | Reviewer receives a Slack DM when assigned to a request |
| AC7 | Duplicate submissions are prevented (one response per assignment) |
| AC8 | User list is loaded from external DB in all selector fields |

---

## 12. Out of Scope (v1)

- Anonymous feedback masking
- Email notifications
- Export to PDF / Excel
- Form builder (dynamic questions)
- Analytics or aggregate score dashboards
- Results view for reviewed persons
- Multi-language support

---

## 13. Release Plan (MVP)

1. **Setup** — New Appsmith app, Git Sync, DB datasource(s), user integration
2. **Data model** — Create DB schema (feedback_requests, assignments, responses)
3. **HR pages** — Dashboard, Create/Edit Request, Request Detail
4. **Reviewer pages** — Reviewer Tasks, Feedback Form
5. **Integrations** — Slack DM notification on assignment
6. **Access control** — Page-level gating by role
7. **Testing & Stabilization** — QA, bug fixes, edge case handling
