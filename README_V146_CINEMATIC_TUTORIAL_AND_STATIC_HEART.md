# DFP 2.0 Frontend v146

## Scoring tutorial

- Rebuilt the first two screens in the dark editorial language used by the landing-page Preview film.
- Intro and framing screens no longer auto-advance; each advances only when the reviewer clicks the screen or presses Enter/Space.
- Replaced the generic-looking replica with a more credible KSV-inspired site: browser shell, organisation header, navigation/dropdown, campus-style hero, annual-report reader and academic-studies page.
- The annual-report view follows the visual language of KSV's 2020–21 report and displays the imported Kalkeri Alumni Outcomes evidence.
- Guided targets remain constrained: only the red-highlighted control responds during evidence steps.
- Evidence capture, scoring reference data, score selection and final screen remain fully static and offline.

## Landing wordmark

- Restored the pre-v143 `DFP 2.0` markup and typography rhythm.
- The heart is again the decimal point between `2` and `0`.
- It is period-sized, baseline-aligned, static and uses only a restrained upper-left gloss.
- Removed the enlarged heart inside the final zero, heartbeat, glow and arrival animation.

## Validation

- `npm run build` passed.
- Existing non-blocking warnings remain in legacy CSS and `AdminUndoRedo.tsx`.
- No iframe or retired Kalkeri tutorial HTML reference exists in the application.
