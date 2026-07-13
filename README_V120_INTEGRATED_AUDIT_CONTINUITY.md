# DFP 2.0 Frontend V120 — Integrated audit continuity

## Changes

- The opening of the How It Works preview is now fully static for the first beat:
  - “How do we find the best NGOs in a region?”
  - “You either search the internet or you ask people who know the region.”
  - No word-by-word reveal or separate second slide.
- Human Leads now includes a persistent archive of referrals that were already sent to PM shortlisting or rated.
- Combined Review now allows any rated NGO to be selected and sent to a chosen Final Ranking tier.
- Final Ranking gearbox now supports persistent per-NGO edits:
  - display name
  - organisation profile
  - final view/comment
  - final tier
  - restore original text

## Required backend routes

- `GET /workspace/{region}/human-leads/archive`
- `POST /ranking/final-selection`
- `POST /ranking/final-overrides/update`
- `GET /ranking/compiled-review?region=...`
- `GET /ranking/final-board?region=...`
