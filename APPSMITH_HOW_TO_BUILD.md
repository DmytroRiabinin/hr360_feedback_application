# APPSMITH_HOW_TO_BUILD.md
# Universal Guide: How to Build an Appsmith App (for Agents)

> **Audience:** AI agents and developers building new pages, queries, and JS objects  
> **Based on:** real app `ts-appsmith-membership` (Admin Console)  
> **Repo:** Git Sync export — source of truth is the Appsmith UI, not the files  

---

## Table of Contents

1. [Repository Structure](#1-repository-structure)
2. [Queries — How to Build](#2-queries--how-to-build)
3. [JS Objects — How to Build](#3-js-objects--how-to-build)
4. [Widgets — How to Build and Edit DSL](#4-widgets--how-to-build-and-edit-dsl)
5. [UI Page Patterns](#5-ui-page-patterns)
6. [RBAC / In-App Authorization](#6-rbac--in-app-authorization)
7. [Navigation Between Pages](#7-navigation-between-pages)
8. [Page State (storeValue)](#8-page-state-storevalue)
9. [Common Pitfalls (Git Sync)](#9-common-pitfalls-git-sync)
10. [Definition of Done Checklist](#10-definition-of-done-checklist)
11. [Real Examples from This Project](#11-real-examples-from-this-project)

---

## 1. Repository Structure

```
pages/
  <PageName>/
    <PageName>.json          ← page metadata (do not edit manually)
    queries/
      <qry_name>/
        metadata.json        ← query config (FIND/UPDATE/INSERT/AGGREGATE, SQL, REST)
    jsobjects/
      <ObjName>/
        <ObjName>.js         ← JS object CODE (the main place for logic)
        metadata.json        ← metadata (wire-up to object methods; do not edit)
    widgets/
      **/*.json              ← widget DSL (UI structure)
```

### What to edit where

| What | Where |
|---|---|
| Logic (RBAC, data prep, side-effects) | `jsobjects/<Obj>.js` |
| DB / REST requests | `queries/<name>/metadata.json` |
| UI structure | `widgets/**/*.json` (or in Appsmith UI) |

> ⚠️ **JS plugin actions** (queries with `pluginId: "js-plugin"`) are wire-ups to JS object methods. The code lives in the `.js` file, **not** in `metadata.json`.

---

## 2. Queries — How to Build

### 2.1 Naming conventions

| Prefix | Purpose |
|---|---|
| `qry_*` | reads (FIND, SELECT, GET) |
| `qry_*` or `mut_*` | writes (INSERT, UPDATE, DELETE) — follow the project convention |
| `qry_acl_*` | Appsmith ACL operations (permissionGroup, policyMap) |
| `api_*` | REST API calls |

### 2.2 `metadata.json` structure — Mongo FIND

```json
{
  "pluginId": "mongo-plugin",
  "pluginType": "DB",
  "unpublishedAction": {
    "actionConfiguration": {
      "formData": {
        "collection": { "data": "ts_groups" },
        "command": { "data": "FIND" },
        "find": {
          "limit": { "data": "100" },
          "projection": { "data": "" },
          "query": { "data": "{ \"isDefault\": { \"$ne\": true } }" },
          "sort": { "data": "{ \"name\": 1 }" },
          "skip": { "data": "" }
        },
        "smartSubstitution": { "data": true }
      },
      "timeoutInMillisecond": 10000
    },
    "dynamicBindingPathList": [],
    "name": "qry_list_groups",
    "pageId": "<PageName>",
    "runBehaviour": "MANUAL",
    "userSetOnLoad": false
  }
}
```

### 2.3 Mongo UPDATE with params

```json
{
  "command": { "data": "UPDATE" },
  "updateMany": {
    "limit": { "data": "SINGLE" },
    "query": { "data": "{ \"_id\": { \"$oid\": \"{{this.params.documentId}}\" } }" },
    "update": {
      "data": "{ \"$set\": { \"policyMap\": {{JSON.parse(this.params.policyMapJson || '{}')}}, \"updatedAt\": {{Date.now()}} } }"
    }
  }
}
```

> ⚠️ When passing an array or object via params — **always serialize to a JSON string** and use `JSON.parse(...)` in the query body. For example: `policyMapJson`, `policiesJson`, `assignedToUserIdsJson`.

### 2.4 Dynamic bindings in queries

If `query.data` or `update.data` contains `{{ }}` — that key **must** be listed in `dynamicBindingPathList`:

```json
"dynamicBindingPathList": [
  { "key": "actionConfiguration.formData.find.query.data" }
]
```

### 2.5 Passing params (how to run a query from code)

```js
// From a JS object
await qry_acl_find_permission_group.run({ permissionGroupName: "grp_abc_acl" });

// Access in the query body:
// { "name": "{{this.params.permissionGroupName}}" }
```

### 2.6 On-page-load rules

- `"userSetOnLoad": true` — only for lightweight, safe READ queries.
- **Do not** auto-run heavy queries or any query with side effects.
- Avoid loops: load → storeValue → re-trigger load.

### 2.7 Bulk instead of loops

```js
// ❌ Bad: loop calling qry.run()
for (const id of ids) {
  await qry_delete_item.run({ id });
}

// ✅ Good: one bulk query
await qry_delete_items_bulk.run({ idsJson: JSON.stringify(ids) });
```

---

## 3. JS Objects — How to Build

### 3.1 Critical rule #1 — first line

```js
export default {
```

This line **must be the first line of the file**. Nothing before it:
- no blank line
- no comments (`//`, `/* */`)
- no `"use strict"`
- no BOM

Violating this = the JSObject fails to load after Git Sync.

### 3.2 JS object structure

```js
export default {
  // --- Getters (synchronous, used in widget bindings) ---

  getSelectedGroupName() {
    return tblGroups?.selectedRow?.name ?? "—";
  },

  // --- Async actions (side-effects: run queries, navigate, showAlert) ---

  async saveGroup() {
    const name = inpGroupName.text?.trim();
    if (!name) {
      showAlert("Name is required", "warning");
      return;
    }
    try {
      await qry_insert_group.run({ name, createdAt: Date.now() });
      await qry_list_groups.run();
      closeModal("mdlCreateGroup");
      showAlert("Group created", "success");
    } catch (e) {
      showAlert("Error saving group: " + e.message, "error");
    }
  },

  async deleteGroup() {
    const row = tblGroups.selectedRow;
    if (!row) { showAlert("Select a group first", "warning"); return; }
    if (row.isDefault) { showAlert("Cannot delete default group", "error"); return; }
    await qry_delete_group.run({ groupId: row._id });
    await qry_list_groups.run();
  }
};
```

### 3.3 Naming conventions

| Type | Example |
|---|---|
| JS object | domain noun: `groupsActions`, `tagAuth`, `assignmentsAccessState` |
| Read method | `get*`, `is*`, `compute*` |
| Action method | `on*`, `save*`, `load*`, `apply*`, `clear*` |

### 3.4 Guard against undefined

```js
// ✅ Always use optional chaining + nullish coalescing
const id = tblGroups?.selectedRow?._id ?? null;
const data = qry_list_groups?.data ?? [];

// ✅ Normalize _id from Mongo (can be { $oid: "..." } or a string)
normalizeId(raw) {
  if (!raw) return "";
  if (typeof raw === "object") return raw.$oid || raw.oid || String(raw);
  return String(raw).replace(/^"|"$/g, "").trim();
}
```

### 3.5 Console log rules

```js
// ❌ Do not leave debug logs in production code
console.log("debug:", data);

// ✅ Allowed for real errors
console.error("[groupsActions.saveGroup] failed:", e);
console.warn("[assignmentsActions] groupId missing, skipping");
```

### 3.6 One JSObject per page domain

Don't put all logic into one object. Instead:

```
groupsActions.js      ← CRUD for groups, navigation
tagAuth.js            ← Access checks (isSuperAdmin, canManageGroup)
tagScopeResolver.js   ← Scope computation for local admins
```

---

## 4. Widgets — How to Build and Edit DSL

### 4.1 When to edit DSL manually

Prefer the Appsmith UI for editing. Edit manually only when:
- fixing a binding broken after a rename
- adding missing `dynamicBindingPathList` / `dynamicTriggerPathList`

### 4.2 Rule: dynamic bindings must be declared

If a property contains `{{ ... }}`:
```json
{
  "text": "{{ groupsActions.getSelectedGroupName() }}",
  "dynamicBindingPathList": [
    { "key": "text" }
  ]
}
```

If an event handler (onClick, onChange) contains `{{ ... }}`:
```json
{
  "onClick": "{{ groupsActions.saveGroup() }}",
  "dynamicTriggerPathList": [
    { "key": "onClick" }
  ]
}
```

### 4.3 Never edit `widgetId` manually.

### 4.4 Renaming `widgetName` → update all references

After renaming, update:
- all `{{ widgetOldName.prop }}` in other widgets
- JS objects that reference the old name
- queries that reference widget values

### 4.5 Mustache bindings — rules

```js
// ✅ Simple computed label
{{ (qry_list_groups?.data ?? []).length + " groups" }}

// ✅ Safe selectedRow reference
{{ tblGroups?.selectedRow?.name ?? "—" }}

// ❌ Complex logic directly in a binding — move it to a JSObject
{{ (qry_list_groups?.data ?? []).filter(g => g.workspaceId && ...) }}
// Better: {{ groupsActions.getFilteredGroups() }}
```

---

## 5. UI Page Patterns

### 5.1 Recommended page layout

```
[Header container]
  - Page title (Text)
  - Action buttons (Button row)

[Filters / Search container]
  - Search Input
  - Status / workspace Select

[Main content]
  - Table / List
  - (opt.) Detail panel alongside

[Modals]
  - mdlCreate* — create form
  - mdlEdit*   — edit form
  - mdlConfirm* — delete confirmation
```

### 5.2 CRUD page pattern (example: Groups)

| Widget | Name | Binding |
|---|---|---|
| Table | `tblGroups` | `{{ qry_list_groups.data }}` |
| Button "Create" | `btnCreateGroup` | onClick: `showModal('mdlCreateGroup')` |
| Button "Edit" | `btnEditGroup` | disabled: `{{ !tblGroups.selectedRow }}` |
| Button "Delete" | `btnDeleteGroup` | disabled: `{{ !tblGroups.selectedRow \|\| tblGroups.selectedRow.isDefault }}` |
| Modal | `mdlCreateGroup` | — |
| Input in modal | `inpGroupName` | — |
| Select | `selWorkspace` | options: `{{ qry_list_workspaces.data }}`, labelKey: `displayName`, valueKey: `_id` |
| Button "Save" | `btnSaveGroup` | onClick: `{{ groupsActions.saveGroup() }}` |
| Button "Cancel" | `btnCancelGroup` | onClick: `closeModal('mdlCreateGroup')` |

### 5.3 Form with validation (JSObject pattern)

```js
export default {
  getPayload() {
    return {
      name: inpName.text?.trim(),
      description: inpDescription.text?.trim(),
      workspaceId: selWorkspace.selectedOptionValue || null,
    };
  },

  validate() {
    const p = this.getPayload();
    if (!p.name) return { ok: false, message: "Name is required" };
    return { ok: true };
  },

  async submit() {
    const v = this.validate();
    if (!v.ok) { showAlert(v.message, "warning"); return; }
    const p = this.getPayload();
    try {
      await qry_insert_record.run(p);
      closeModal("mdlCreate");
      showAlert("Saved successfully", "success");
      await qry_list_records.run();
    } catch (e) {
      showAlert("Error: " + e.message, "error");
    }
  }
};
```

### 5.4 Workspace dropdown in Select

```js
// Label: "displayName", Value: "_id"

// Default selected value in Edit modal:
{{ tblGroups?.selectedRow?.workspaceId?.replace(/^"|"$/g, "") }}

// Computed "Workspace" column in table:
{{ (function() {
  const id = currentRow.workspaceId?.replace?.(/^"|"$/g,"") ?? currentRow.workspaceId;
  if (!id) return "Global";
  const ws = (qry_list_workspaces?.data ?? []).find(w => w._id === id);
  return ws?.displayName ?? id;
})() }}
```

---

## 6. RBAC / In-App Authorization

### 6.1 General approach (this project)

All auth logic lives in the `tagAuth` JS object:

```js
export default {
  isOperatorSuperAdmin() {
    const admins = qry_super_admins_check?.data ?? [];
    const email = appsmith?.user?.email ?? "";
    return admins.some(a => a.email === email);
  },

  canManageGroup(groupTagIds = []) {
    if (this.isOperatorSuperAdmin()) return true;
    const opTags = this.getOperatorTags().map(t => t._id?.toString?.() ?? t._id);
    return groupTagIds.some(id => opTags.includes(id?.toString?.()));
  },

  getOperatorTags() {
    return qry_user_tags_list?.data ?? [];
  }
};
```

### 6.2 Page-level gating

```js
async onLoad() {
  const isSA = tagAuth.isOperatorSuperAdmin();
  if (!isSA) {
    showAlert("Access denied", "error");
    navigateTo("Groups", {}, "SAME_WINDOW");
    return;
  }
  await qry_list_all_tags.run();
}
```

> ⚠️ **Don't rely on hidden UI elements alone.** Always enforce checks in JS actions and query filters.

### 6.3 Hiding UI by role

```json
{
  "isVisible": "{{ tagAuth.isOperatorSuperAdmin() }}",
  "dynamicBindingPathList": [{ "key": "isVisible" }]
}
```

---

## 7. Navigation Between Pages

### 7.1 Basic navigation

```js
// Simple navigation
navigateTo("Groups", {}, "SAME_WINDOW");

// Navigation with params
navigateTo("Assignments", { groupId: normalizedId }, "SAME_WINDOW");
```

### 7.2 Reading params on the target page

```js
getGroupIdFromUrl() {
  const raw = appsmith?.URL?.queryParams?.groupId ?? "";
  return String(raw).replace(/^"|"$/g, "").trim();
}
```

### 7.3 Guard before navigating

```js
async openAssignments() {
  const row = tblGroups.selectedRow;
  if (!row) { showAlert("Select a group first", "warning"); return; }

  const groupId = this.normalizeId(row._id);
  if (!groupId) { showAlert("Group id is empty", "error"); return; }

  navigateTo("Assignments", { groupId }, "SAME_WINDOW");
}
```

---

## 8. Page State (storeValue)

### 8.1 Storing state

```js
// Store
await storeValue("assignmentsAccessDraft", JSON.stringify(draft));
await storeValue("assignmentsAccessDraftGroupId", groupId);

// Read
const raw = appsmith.store.assignmentsAccessDraft;
const draft = raw ? JSON.parse(raw) : {};
```

### 8.2 Clear state on page exit

```js
async clearAccessDraft() {
  await storeValue("assignmentsAccessDraft", null);
  await storeValue("assignmentsAccessDraftGroupId", null);
  await storeValue("assignmentsAccessDraftVersion", 0);
}
```

> 💡 To force a table to re-render after a draft update — store a `draftVersion` counter and bind `tblX.tableData` to it.

### 8.3 Scope state by groupId

```js
loadDraft(groupId) {
  const cachedId = appsmith.store.assignmentsAccessDraftGroupId;
  if (cachedId !== groupId) return null; // stale state for a different group
  const raw = appsmith.store.assignmentsAccessDraft;
  return raw ? JSON.parse(raw) : null;
}
```

---

## 9. Common Pitfalls (Git Sync)

| Pitfall | Symptom | Fix |
|---|---|---|
| `export default {` not on line 1 | JSObject fails to load | Remove everything before `export default {` |
| Binding present but missing from `dynamicBindingPathList` | Binding not evaluated | Add the key to the list |
| Path with spaces (`pages/Tag Assignments/`) | Script / git errors | Always quote such paths |
| Rename `widgetName` without updating references | Runtime errors in `{{ }}` | Update all `widgetOldName` in JSObjects and widget DSL |
| Object/array in params without JSON.stringify | "No valid mongo command found" | Serialize: `JSON.stringify(obj)`, `JSON.parse(...)` in query body |
| `qry.data` without guard | `undefined` errors on page load | Always use `qry?.data ?? []` |
| `userSetOnLoad: true` on a heavy query | Slow load, trigger loops | Set to `false` for heavy or side-effecting queries |

---

## 10. Definition of Done Checklist

- [ ] JSObject: `export default {` is the first line
- [ ] No noisy `console.log` (only `console.error`/`console.warn` for real errors)
- [ ] All queries are parameterized — no string concatenation in JSON bodies
- [ ] No `qry.run()` loops — replaced with bulk operations
- [ ] Access gating enforced in JS (not only via hidden buttons)
- [ ] `dynamicBindingPathList` / `dynamicTriggerPathList` updated (if DSL was edited manually)
- [ ] Edge cases tested: no data, unauthorized access, double submit
- [ ] A `docs/*.md` file added or updated describing what was implemented

---

## 11. Real Examples from This Project

### 11.1 Navigation with guards (`groupsActions.js`)

```js
export default {
  openAssignments() {
    const row = tblGroups.selectedRow;
    if (!row) { showAlert("Select a group first", "warning"); return; }

    const rawId = row._id;
    const groupId =
      rawId && typeof rawId === "object"
        ? (rawId.$oid || rawId.oid || String(rawId))
        : String(rawId || "");
    if (!groupId) { showAlert("Group id is empty", "error"); return; }

    navigateTo("Assignments", { groupId }, "SAME_WINDOW");
  }
};
```

### 11.2 Mongo FIND with params (`qry_acl_find_permission_group`)

```json
{
  "find": {
    "limit": { "data": "1" },
    "query": { "data": "{ \"name\": \"{{this.params.permissionGroupName}}\" }" }
  },
  "dynamicBindingPathList": [
    { "key": "actionConfiguration.formData.find.query.data" }
  ]
}
```

Calling from a JS object:
```js
await qry_acl_find_permission_group.run({ permissionGroupName: "grp_abc_acl" });
const pg = qry_acl_find_permission_group.data?.[0] ?? null;
```

### 11.3 Mongo UPDATE with JSON-serialized params (`qry_acl_set_application_acl`)

```json
{
  "updateMany": {
    "query": { "data": "{ \"_id\": { \"$oid\": \"{{this.params.documentId}}\" } }" },
    "update": {
      "data": "{ \"$set\": { \"policyMap\": {{JSON.parse(this.params.policyMapJson || '{}')}}, \"policies\": {{JSON.parse(this.params.policiesJson || '[]')}} } }"
    }
  }
}
```

Calling from a JS object:
```js
await qry_acl_set_application_acl.run({
  documentId: appId,
  policyMapJson: JSON.stringify(updatedPolicyMap),
  policiesJson: JSON.stringify(updatedPolicies),
});
```

### 11.4 Super admin check (`tagAuth`)

```js
export default {
  isOperatorSuperAdmin() {
    const admins = qry_super_admins_check?.data ?? [];
    const email = appsmith?.user?.email ?? "";
    return admins.some(a => a.email === email);
  }
};
```

### 11.5 Normalizing MongoDB `_id`

```js
normalizeId(raw) {
  if (!raw) return "";
  if (typeof raw === "object") return raw.$oid || raw.oid || String(raw);
  return String(raw).replace(/^"|"$/g, "").trim();
}
```

### 11.6 Workspace dropdown in Select

```js
// Label: "displayName", Value: "_id"

// On insert:
selWorkspaceCreate.selectedOptionValue || null

// On edit (default value):
tblGroups?.selectedRow?.workspaceId?.replace?.(/^"|"$/g, "")

// Computed column in table:
{{ (function() {
  const id = currentRow.workspaceId?.replace?.(/^"|"$/g,"") ?? currentRow.workspaceId;
  if (!id) return "Global";
  return (qry_list_workspaces?.data ?? []).find(w => w._id === id)?.displayName ?? id;
})() }}
```

---

## Useful Links

- [Appsmith Docs](https://docs.appsmith.com/)
- [Dynamic UI / bindings](https://docs.appsmith.com/core-concepts/building-ui/dynamic-ui)
- [Widget actions (showAlert, storeValue, navigateTo…)](https://docs.appsmith.com/reference/appsmith-framework/widget-actions)
- [Git Sync / Version Control](https://docs.appsmith.com/advanced-concepts/version-control-with-git)

---

*This guide is built from the real Appsmith app `ts-appsmith-membership`. When new patterns are added to the project, update this file.*
