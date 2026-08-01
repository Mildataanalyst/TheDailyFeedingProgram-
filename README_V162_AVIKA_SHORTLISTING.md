# DFP 2.0 Frontend v162 — Avika Fit Review and Shortlisting Pool

Complete Railway-ready Next.js repository.

## Main workflow

```text
Discovery / Karnataka Recovery / Referrals
→ Avika Fit Review
→ human selection
→ grouped Shortlisting Pool
→ approve and assign to PMs
```

## Avika Fit Review

- Upload a verified-website CSV or open a discovery/recovery result directly.
- Runs the worker's zero-Serper compact Avika mode.
- Shows Strong fit, Needs review and Not fit separately.
- Selects strong-fit rows by default, while keeping the final decision human-controlled.
- Sends only selected rows to the Shortlisting Pool.

## Shortlisting Pool

- Groups NGOs into collapsible source batches.
- Preserves NGO ID, source-record ID, source module, run and Avika result.
- Supports multi-select, approve, follow-up, hold, remove and PM distribution.
- Existing assigned or rated NGOs are skipped instead of duplicated.

## Railway

- Node 22.
- Nixpacks installs dependencies once.
- Build command: `npm run build`.
- Start command: `npm run start -- -p $PORT`.

See `RAILWAY_DEPLOYMENT.md` for variables.
