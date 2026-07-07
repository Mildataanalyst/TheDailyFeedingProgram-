# DFP 2.0 Frontend v16 Pixel Polish

This package fixes the Progress Tracker and map fidelity issues raised after the v15 design recovery pass.

## Fixes included

- Replaced the incorrect placeholder India and Karnataka maps with local fail-safe assets in `public/assets/`.
  - `india-map.svg` is generated from packaged GeoJSON data and does not depend on any external runtime URL.
  - `karnataka-map.svg` is a local silhouette traced from the approved design reference; no external image fetch is used at runtime.
- Changed Team View behavior:
  - Summary page now shows metric cards + selected NGO overview only.
  - Clicking **Know more** reveals the shortlisting funnel and lead-source section.
  - The funnel **i** button opens the Karnataka sector snapshot.
- Rebuilt the shortlisting funnel to look like a real stacked funnel/trapezoid rather than flat bars.
- Rebuilt sector snapshot color mapping:
  - No official website = red
  - Wrong / mismatched website = rose
  - Website unreachable = slate/grey
  - Enough public information = green
- Improved sector snapshot map lockup, metric cards, 3D bar blocks, legend/table color dots, and modal spacing.

## Verification

`npm run build` passes locally.
