# DFP 2.0 Frontend v160 — Final Karnataka Recovery UI

Complete Next.js frontend for Core Backend v88 and Search Worker v76.

## Included

- Production recovery buttons shown in the exact run order, beginning with zero-query verification.
- The historical 44-NGO audit is not shown as a normal production stage and is not required to start work.
- Provider preflight displays the worker's built-in ownership guard.
- Historical URLs are described as evidence that is reverified, never as trusted official sites.
- Permanent NGO IDs remain visible across recovery, Lead Pool, PM workstreams, rankings and Contact Tracker.
- All mutating browser actions use a same-origin Next.js server proxy. `ADMIN_PASSWORD` remains server-only.
- Node 22 Railway build fix: Nixpacks installs once and the build command is only `npm run build`.

## Required variables

```text
NEXT_PUBLIC_BACKEND_URL=https://<core-backend>.up.railway.app
NEXT_PUBLIC_SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
NEXT_PUBLIC_STORY_BACKEND_URL=https://<search-worker>.up.railway.app
BACKEND_URL=https://<core-backend>.up.railway.app
SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
STORY_BACKEND_URL=https://<search-worker>.up.railway.app
ADMIN_PASSWORD=<same existing password as both Python services; server-only>
NIXPACKS_NODE_VERSION=22
```

There is no public mutation token and no `NEXT_PUBLIC_ADMIN_PASSWORD` variable.
