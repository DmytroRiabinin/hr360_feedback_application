## Agent guide (Appsmith Git Sync repo)

This repository is an export of an Appsmith app via Git Sync. Code and configuration live under `pages/**` as a set of JSON/JS files. Below are the rules the **agent must follow** so changes reliably sync into the Appsmith UI and do not break Git Sync.

## Extended guides (read these first)

- **How to build in Appsmith**: [APPSMITH_HOW_TO_BUILD.md](APPSMITH_HOW_TO_BUILD.md)
- **Agent playbook**: [APPSMITH_AGENT_PLAYBOOK.md](APPSMITH_AGENT_PLAYBOOK.md)

## Sources of truth (read these first)

- **Product Requirements Document (EN)**: `doc/ts-hr-prd-en.md`
- **HR 360 Feedback spec**: `doc/ts-hr-feedback-360.md`

## Appsmith documentation links

- **Docs (home)**: `https://docs.appsmith.com/`
- **Context7 mirror (fast doc search/snippets)**: `https://context7.com/appsmithorg/appsmith-docs`
- **Dynamic UI / bindings (mustache `{{ }}`)**: `https://docs.appsmith.com/core-concepts/building-ui/dynamic-ui`
- **Widget actions (showAlert, storeValue, navigateTo, modals, clipboard, etc.)**: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions`
  - `showAlert`: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions/show-alert`
  - `storeValue`: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions/store-value`
  - `removeValue`: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions/remove-value`
  - `navigateTo`: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions/navigate-to`
  - `closeModal`: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions/close-modal`
  - `copyToClipboard`: `https://docs.appsmith.com/reference/appsmith-framework/widget-actions/copy-to-clipboard`
- **Navigation between pages**: `https://docs.appsmith.com/build-apps/how-to-guides/navigate-between-pages`
- **Version control / Git Sync**: `https://docs.appsmith.com/advanced-concepts/version-control-with-git`
  - **Git settings reference**: `https://docs.appsmith.com/advanced-concepts/version-control-with-git/reference/git-settings`

## Project structure (important for changes)

Under `pages/<PageName>/`:

- **JSObjects**: `pages/<Page>/jsobjects/<ObjName>/<ObjName>.js` + `metadata.json`
- **Queries/Actions metadata**: `pages/<Page>/queries/<ActionName>/metadata.json`
  - For `pluginId: "mongo-plugin"` this contains the query form/config (FIND/UPDATE/AGGREGATE, etc.).
  - For `pluginId: "js-plugin"` this is *action metadata* (wire-up to a JSObject function via `collectionId`/`fullyQualifiedName`), not the code "body".
- **Widgets DSL**: `pages/<Page>/widgets/**/*.json` (including nested containers).

Note: this repo may contain page directories with spaces in the name. In tools/scripts always escape/quote these paths correctly.

## Mandatory rules for JSObjects (`pages/**/jsobjects/**.js`)

- **Critical**: a JSObject file **must start with** `export default {` **on the very first line of the file**.
  - There must be **nothing** before it: no empty line, no `// comment`, no `/** */`, no `use strict`, no BOM.
  - Otherwise after commit/pull into the Appsmith UI you may get JSObject parsing/loading errors.
- **Allowed**: documentation inside the object (after `export default {`), e.g. JSDoc above methods.
- **UI stability**:
  - Always guard global references: `typeof qry_x !== "undefined"`, `typeof appsmith !== "undefined"`, `tblX?.selectedRow`, etc.
  - Put side effects (queries, `storeValue`, navigation) into `async` methods and use `await` on `*.run()` / `storeValue()` when order matters.
- **Logs**:
  - Don't leave noisy `console.log` in final code (use `console.warn`/`console.error` for real errors/audit).
- **Widget/query references**:
  - Do not rename `widgetName` / query names without updating all usages in bindings (`{{ }}`) and JSObjects.

## Rules for Queries (`pages/**/queries/**/metadata.json`)

- **Don't break JSON**: must remain valid JSON (no comments, no trailing commas).
- **Mongo plugin (`pluginId: "mongo-plugin"`)**:
  - Keep queries minimal: use `projection`, `limit`, `sort` where possible.
  - If you add dynamic bindings (`{{ }}`) into query/document fields, ensure Appsmith treats them as dynamic (UI usually manages this; manual Git Sync edits require extra care).
- **JS plugin actions (`pluginId: "js-plugin"`)**:
  - These are "action" metadata for JSObject methods (see `collectionId`, `fullyQualifiedName`).
  - **Change code in the JSObject file**, not in these metadata files (usually).
- **On page load**:
  - Be careful with `userSetOnLoad: true`: don't auto-run heavy/dangerous queries unless justified.
  - Avoid loops: "load → setState/storeValue → trigger → load again".

## Rules for Widgets (`pages/**/widgets/**/*.json`)

- **General**: this is widget DSL. Manual edits are possible, but minimize them (risk of breaking structure).
- **Dynamic bindings / triggers**:
  - If a prop value contains `{{ ... }}`, that prop should be present in that node's `dynamicBindingPathList`.
  - If you add an action/event (onClick/onChange, etc.) with `{{ ... }}`, it should be present in `dynamicTriggerPathList`.
- **Identifiers**:
  - Don't edit `widgetId` manually.
  - Renaming `widgetName` requires updating all references in `{{ }}` and in JSObjects.

## Bulk operations & query-side logic

When adding features, prefer **bulk operations** and **logic in queries**:

- Replace loops with individual `qry_*.run()` calls by a single bulk query.
- Move filtering, aggregation, and batch updates into MongoDB queries; keep JS minimal (prepare params, call queries).

## Recommended code style for this repo (short)

- **Naming**:
  - Queries: `qry_*` (read), `mut_*` or `qry_*` (write) — follow the project's convention; be consistent within a page.
  - JSObjects: domain nouns, methods are verbs (`get*`, `save*`, `on*`).
- **Appsmith data**:
  - Guard against `null/undefined` because `*.data` may be `undefined` until a query finishes.
  - Normalize IDs (string, trimmed, no surrounding quotes) before using them in keys/comparisons/queries.
- **User messaging**:
  - When an operation can fail: `showAlert(message, "error")`.
  - For "nothing to do" / validation: `"warning"` or `"info"`.

## Common Git Sync pitfalls (reminder)

- **JSObject parsing**: `export default {` must be the first line (see rule above).
- **Spaces in page paths**: be careful with paths that contain spaces.
- **Binding references**: renaming a widget/action without updating all `{{ }}` usages will cause runtime errors in the UI.

## Documentation (agent must follow)

- **After each feature**: Add or update an existing document in `doc/`. Either create a new `.md` or update a relevant existing doc. Describe what was implemented, main APIs/JSObjects, and how it fits the rest of the system.
- **When fixing a bug**: Create a single `.md` file in `doc/` that describes the bug and its fix. Include: what was wrong (symptoms, cause if known), what was changed (files, logic), and how to verify the fix. One file per bug/fix.
