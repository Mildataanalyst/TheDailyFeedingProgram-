# DFP 2.0 Frontend v87 — Story Preview Director's Cut

This build integrates the v85 `How it works` preview into the existing frontend codebase.

Changed files:

- `app/how-it-works/page.tsx`
- `app/globals.css`

What changed:

- Replaced the previous 10-slide preview with the 8-slide director's-cut story.
- Added full-bleed bookend/midpoint slides.
- Added the protagonist thread using Shanti Bhavan Educational Trust.
- Added the human-lead counterpart using Kalkeri Sangeet Vidyalaya.
- Added the funnel counter animation: 37,930 NGOs scanned → 496 shortlisted for ranking.
- Added the final `Like this.` ending frame.
- Preserved the existing `story-v72` base styling and added the new choreography under `story-v85`.

Implementation notes:

- No backend or worker changes are required.
- The page continues to live at `/how-it-works`.
- Existing keyboard navigation, pause/resume, dots, previous/next controls, and progress bar remain.
- The old v84 choreography block was replaced by the v85 block to avoid duplicate story-preview CSS/keyframes.
