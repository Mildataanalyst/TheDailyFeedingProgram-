# V86 — Story Preview Choreography

Updated `app/how-it-works/page.tsx` and appended the additive `.story-v84` choreography layer to `app/globals.css`.

What changed:
- The How It Works preview now runs as a cinematic 10-slide story.
- Existing v72 styling remains as the fallback base.
- Visible copy, slide order, palette, typography, and layout are preserved.
- Added slide-specific motion, simulated cursor moments, ambient lead particles, and continuous per-slide progress timing.
- Pause/resume, arrow navigation, dots, previous/next buttons, progress bar, and back link remain intact.

No backend or worker changes were required.
