# V143 — Profile Cards and Anchored Heartbeat

## PM Shortlists board
- Removed the responsibility paragraph above each PM action.
- Each PM card now shows the existing About PM profile image, the PM name, the Shortlist / NGO Details action, and About PM.
- Added an initial-based portrait fallback for profiles without an uploaded image.

## Landing hero
- Rebuilt the `2.0` lock-up so the final `0` is its own relative inline-block.
- The heart is absolutely anchored at `top: 50%; left: 50%` inside that zero and uses no margin or page-relative offset.
- Heart dimensions are defined in `em`, at approximately 40–50% of the zero height.
- Replaced the old morph/pulse with a two-beat lub-dub cycle and a synchronized soft red glow.
- Added a one-time scale-in with overshoot on page load.
- Preserved a reduced-motion state.
