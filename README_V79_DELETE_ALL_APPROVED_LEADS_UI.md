# v79 — Delete all Approved Leads UI

Adds a destructive admin action inside the Lead Pool screen.

## UI behaviour

- The button appears only when the Lead Pool tab is set to `Approved Leads`.
- Uses the existing `Admin password` field.
- On click, the user must confirm deletion in a browser confirmation dialog.
- Calls the backend endpoint `POST /workspace/{region}/approved-leads/delete-all`.
- Deletes approved Lead Pool rows from backend memory only; PM ranking submissions remain untouched.
- The existing Admin Undo / Redo panel can restore the Lead Pool if this was clicked by mistake.
