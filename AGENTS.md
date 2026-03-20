# AGENTS.md

## Appsmith: `select_reviewed_person_search` (Reviewed person) — fixed approach

Goal: make the Select reliably show users (with `optionLabel: "name"` and `optionValue: "email"`) without Appsmith debug/validation/type errors.

### Rules (do these)
1. Keep `sourceData` **static and valid** for the linter:
   - `sourceData` should be a real JSON array (not a conditional `{{ ... }}` expression that can evaluate to `undefined` at design-time).
   - Each option object must include the `value` key (`email` in this widget).
2. Populate real options at runtime on dropdown open:
   - Trigger: `onDropdownOpen: {{ eventHandler.loadReviewedPersonOptions() }}`
   - In `eventHandler.loadReviewedPersonOptions()`, run the query first: `await qry_get_all_users.run()` (or `.run().then(...)`).
3. `setOptions(...)` format:
   - Provide options that match both:
     - widget config: `{ name, email }` (because `optionLabel/optionValue` are `name/email`)
     - `setOptions` expectations: also include `{ label, value }` (some Appsmith builds validate these)
   - Example option shape:
     - `{ name: "...", email: "...", label: "...", value: "..." }`
4. Avoid Promise returned from the trigger:
   - Ensure the handler called by `onDropdownOpen` does not return an `async` Promise value.
   - Prefer side-effect execution (non-`async` function + `.then/.catch`) so the binding doesn’t evaluate to `Promise`.

### Files touched in this fix
- `pages/HR Dashboard/widgets/select_reviewed_person_search.json`
- `pages/HR Dashboard/jsobjects/eventHandler/eventHandler.js`

