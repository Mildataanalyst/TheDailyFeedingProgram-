# DFP 2.0 V110 — One Surface System

This release removes the competing white shades and top-strip card accents from NGO Discovery and Rankings.

## Visual changes
- One solid neutral canvas across operational pages.
- One exact pure-white surface for mastheads, state selectors, journey cards, controls, tiers and rows.
- NGO Discovery and Ranking Center now share the landing-page card treatment.
- Removed the red/black top strip from all six journey cards.
- Replaced circular solid badges with the landing-style red dot + step label.
- Removed the large blank white navigation slab; only the compact navigation pill remains.
- Removed pink, beige and charcoal card variants.
- Explicit contrast lock prevents white text on white cards.
- Final Ranking tiers and command surfaces use the same exact white.
- Gold In-depth animation remains the only intentional secondary accent.

## Build
Production build passed on Next.js 14.2.35. Existing non-blocking warnings remain for the Google font download, two old autoprefixer declarations, the layout font lint warning, and the AdminUndoRedo hook dependency.
