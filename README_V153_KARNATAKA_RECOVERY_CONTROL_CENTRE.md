# V153 — Karnataka Recovery Control Centre

Adds a separate **Karnataka Recovery** module under:

**NGO Discovery → Internet Leads → Advanced**

The legacy Fast / Deep Recovery interface remains below it for old-run compatibility.

## Stage buttons

1. Technical test run
2. Verify known URLs
3. Verify saved candidates
4. Run the missing query only
5. New / unlinked Darpan records
6. Enhanced historical recovery
7. Same-name identity collisions
8. Firecrawl retry — optional

Each stage shows the matching prepared CSV filename and its maximum logical-query treatment.

## Controls

- CSV upload and stage start.
- Requested row concurrency.
- Serper concurrency per funded key.
- Provider-key preflight.
- Per-row deadline.
- Optional selective Firecrawl and hard credit ceiling.
- Optional Avika/DFP-fit pass.
- Provider-capacity check before starting.
- Pause, resume, end-and-save.
- Progress, logical query count, provider attempts, effective concurrency and Firecrawl credits.
- Masked provider-key state table.
- Results/audit/query-plan/manual-review/no-site/retry/Avika downloads.
- Send verified repository output to Lead Pool.
- Recent Karnataka Recovery runs and local last-run restoration after refresh.

## Validation

- The new component passed TypeScript transpilation and isolated TypeScript checking.
- Full `next lint` / `next build` could not be executed in this container because the configured package mirror did not provide required public npm tarballs; no `node_modules` are included in the release zip.
