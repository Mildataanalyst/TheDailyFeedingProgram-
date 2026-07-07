# DFP 2.0 Frontend v60 — Hardening Pass 2

Changes over v59:
- Added shared client backend helper: `lib/backendClient.ts`.
- Added shared server backend helper: `lib/backendServerClient.ts`.
- Repository, Story Discovery, NGO Discovery, Dashboard backend updates, and Workstream mutations now route through shared helpers.
- Story and Repository polling no longer infer terminal readiness from download links/partial rows.
- Frontend CSV formula neutralization now checks `trimStart()` before formula sigils.
- Server-side dashboard backend update uses server-only `DFP2_ADMIN_TOKEN` when present.

Important note:
- `NEXT_PUBLIC_DFP2_ADMIN_TOKEN` is visible in browser bundles. Use it only as a light internal/demo mutation gate. Real production hardening should use an auth proxy/SSO and keep backend credentials server-side.

Validation:
- `npm run lint -- --no-cache` passed with the existing Lexend font warning.
- `npm run build` passed with the existing Google Fonts optimization warning.
