# DFP 2.0 Frontend v154 — Railway release

This is the complete Next.js frontend.

## Main changes

- Separate Karnataka Recovery control centre in NGO Discovery.
- One-account Serper controls with a 59,000-credit ceiling and account preflight.
- Permanent NGO IDs displayed across Lead Pool, PM Workstream, combined/final rankings, Contact Tracker and recovery/repository previews.
- Historical NGO ID status, backfill and registry-export controls.
- Prepared recovery queues and regression-test guidance built into the UI.

## Railway

Required variables:

```text
NEXT_PUBLIC_BACKEND_URL=https://<core-backend>.up.railway.app
NEXT_PUBLIC_SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
NEXT_PUBLIC_STORY_BACKEND_URL=https://<search-worker>.up.railway.app
BACKEND_URL=https://<core-backend>.up.railway.app
NEXT_PUBLIC_DFP2_ADMIN_TOKEN=<shared token>
DFP2_ADMIN_TOKEN=<shared token>
```

The ZIP root contains `railway.json`, `Procfile`, `package.json` and `package-lock.json`.

See `RAILWAY_DEPLOYMENT.md` and `README_V154_NGO_ID_SINGLE_SERPER.md`.
