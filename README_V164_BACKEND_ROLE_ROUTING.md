# Frontend v164

- Resolves the actual search worker using `/health` service-role/capability metadata.
- Prefers `NEXT_PUBLIC_SEARCH_BACKEND_URL` over a potentially stale server-side `SEARCH_BACKEND_URL`.
- Falls back to the configured story-worker URL when necessary.
- Adds proxy diagnostics headers and a specific Avika routing error message.
