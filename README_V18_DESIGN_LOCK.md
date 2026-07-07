# V18 Design Lock Patch

This patch tightens the frontend against the supplied dark executive reference screens.

## Main changes

- Added the uploaded India outline image as `public/assets/india-outline-map.png` while retaining the polished filled map used on the landing screen.
- Added `/ngo-discovery` as an alias route for the existing repository module.
- Tightened global sizing, hero spacing, glass cards, crimson glow, and map/dot overlays to better match the supplied screens.
- Progress Tracker interaction changed:
  - The `Selected NGOs overview` no longer appears by default.
  - Clicking `Know more` on `Total NGOs scanned` or `Shortlisted NGOs` reveals the shortlisting funnel.
  - The same details section now includes the lead-source row and a shortlisted NGO carousel.
  - The carousel uses horizontal scroll-snap, native touch swiping, and smooth arrow navigation.
- Added more default shortlisted NGO cards so the carousel has enough cards to swipe through.

## Build check

`npm run build` completed successfully locally.
