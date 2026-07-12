# V118 — Deep Enrichment Frontend Integration

This release adds Deep Enrichment controls to **Combined Review** and connects them to the Railway search worker. It does not add research logic to the frontend and does not change PM ratings.

## Combined Review workflow

The new `Deep enrichment` action opens a selection workspace where the user can:

- select individual NGOs
- select all currently rated NGOs
- select all NGOs with rating 1, 2, 3, 4, or 5 in any combination
- choose a 30, 50, 70, or 100 official-page ceiling
- choose 22, 35, 50, or 60 Serper searches per NGO
- enable or disable the optional Haiku preliminary pass
- see the maximum Firecrawl estimate before starting

## Live job controls

The modal displays:

- processed NGOs and total NGOs
- current NGO and current worker step
- Firecrawl credits consumed
- Serper queries consumed
- official-site pages collected
- external sources collected
- cancel and resume controls
- persisted run ID so the same run reopens after the browser is closed or refreshed

## Downloads

When ready, the interface exposes:

- GPT/Fable Markdown packet
- full research ZIP
- JSONL dossiers
- master CSV

## Vercel variables

```env
NEXT_PUBLIC_SEARCH_BACKEND_URL=https://<your-railway-worker-domain>
```

Use the existing mutation-token configuration only when the worker is already protected with `DFP2_ADMIN_TOKEN`:

```env
NEXT_PUBLIC_DFP2_ADMIN_TOKEN=
```

`NEXT_PUBLIC_` variables are visible in the browser. Firecrawl, Serper, and Anthropic keys must never be placed in the frontend or in Vercel public variables.

## Validation completed

- Next.js production build passed.
- Existing non-blocking font/lint warnings remain unchanged.
