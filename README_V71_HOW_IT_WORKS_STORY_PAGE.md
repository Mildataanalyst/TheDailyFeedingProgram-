# v71 — How It Works Story Page

Frontend-only update.

## Changes

- Replaced the landing-page `Preview` action with a silver `Click here` action.
- `Click here` now opens a dedicated `/how-it-works` full-screen story page instead of the previous overlay.
- Added auto-advancing story slides with Back / Next / Pause controls and keyboard support.
- First slide is fully black with only the question text.
- Rewrote the story to be tighter and less redundant:
  - How do we find the best NGOs in a region?
  - There are two ways: search the internet and add human leads.
  - Internet discovery looks for educational models and unique child-focused organisations.
  - Bulk lists can be scanned automatically.
  - Human leads can be added directly.
  - Everything enters one Lead Pool.
  - DFP team curates the pool and removes non-relevant leads.
  - DFP team reviews one NGO at a time using slider + rationale.
  - AI checks only the quality/completeness of the review explanation and gives suggestions.
  - Reviews are collated in one combined output.
- Strengthened green and red visual states in the curation slides.
- Kept design aligned with the existing DFP 2.0 dark premium aesthetic.

## Validation

- `npm run lint -- --no-cache` passed with existing Lexend font warning.
- `npx tsc --noEmit` passed.
- `npm run build` passed with existing Google Fonts/autoprefixer warnings.
