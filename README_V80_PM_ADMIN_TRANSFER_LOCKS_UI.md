# Frontend v80 — PM admin transfer + edit locks UI

Adds controls inside the existing inconspicuous PM view gear.

## Added to PM view gear

1. **Transfer shortlist assignment**
   - Transfer one item or an inclusive 1-based range from one PM to another.
   - Example: `15` to `27` from Avika to Milan.
   - Option to move already submitted responses with the transferred tasks.

2. **Lock PM edits**
   - Lock edits for all PMs or selected PMs.
   - Locked PMs can still view their shortlist, but submit/edit/delete buttons are disabled.

3. **Open PM at last submitted item**
   - Opening a PM shortlist now lands on the last submitted NGO instead of always starting at NGO 1.

Uses existing `ADMIN_PASSWORD`.
