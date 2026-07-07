# Frontend v67 — Final Ranking editorial cleanup

Changes:
- Final Ranking view no longer shows ranking numbers attached to NGOs.
- Removed top Open Tracker action; added bottom-right Go to Tracker CTA.
- Trend Analysis renamed to In-depth and styled as a gold-accent button.
- Added a small gearbox in the Final Ranking header for editing page/tier copy locally.
- Removed journey/funnel metric strip from Final Ranking.
- Final tiers are shown as vertical lists with equal-weight NGO rows.
- Highest Transformation Potential sentence shortened to the requested line.
- Great NGOs uses the same vertical list structure.
- Third tier renamed to Needs More Context.
- Buckets show the first four NGOs by default with Show full / Show less.

Validation:
- npm run lint -- --no-cache passed with existing Lexend font warning.
- npx tsc --noEmit passed.
- npm run build compiled successfully and then timed out during final build/type-check phase in sandbox; Vercel should be treated as the final build authority.
