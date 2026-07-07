# Frontend v59 hardening fixes

Changes made over v58 after code review:

- Adds `X-DFP2-ADMIN-TOKEN` to mutating backend requests when `NEXT_PUBLIC_DFP2_ADMIN_TOKEN` is configured, matching backend v40's optional guard.
- Polling no longer treats mere download-link existence as a completed run. It now waits for terminal backend states.
- CSV parsing now supports quoted commas and quoted newlines better than the prior line-split parser.
- Frontend-generated CSV values are neutralized against spreadsheet formula injection.
- Lead Pool delete confirmation now shows the selected count and warns that deletion cannot be undone.
- Removed the stale React hook warning in the discovery page.

Remaining production caveats:

- `NEXT_PUBLIC_DFP2_ADMIN_TOKEN` is visible to browser users; use it only as a simple internal gate, not a real auth model.
- `npm audit --omit=dev` still reports Next/PostCSS vulnerabilities that require a breaking `next@16` upgrade to clear.
