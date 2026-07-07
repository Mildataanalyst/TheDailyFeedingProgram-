# v69 — Story Preview Overlay

Frontend-only update on top of v68.

Changes:
- Renamed landing CTA from `Video preview` to `Preview`.
- Replaced the small preview modal with a full story-led overlay.
- Integrated the supplied structured overlay concept into the app aesthetic.
- Story flow now explains:
  1. How do we find the best NGOs in a region?
  2. Two paths: search the internet and add human leads.
  3. Internet discovery searches relevant child-focused institution types.
  4. Human leads come from Eternal / DFP / NGO networks.
  5. Everything enters one Lead Pool.
  6. DFP team curates and removes irrelevant leads.
  7. DFP team reviews NGOs one at a time using a slider and written response.
  8. AI checks whether the reviewer fully explained the rating.
  9. Combined output collates reviews.
  10. Shortlisted NGOs move to final review.
- Replaced all “people review” wording with “DFP team reviews”.
- Kept NGO text white in the opening question.
- Strengthened green and red accents while staying within the same DFP 2.0 dark visual system.

Validation:
- `npm run lint -- --no-cache` passed with existing Lexend warning.
- `npx tsc --noEmit` passed.
- `npm run build` passed with existing Google Fonts/autoprefixer warnings.
