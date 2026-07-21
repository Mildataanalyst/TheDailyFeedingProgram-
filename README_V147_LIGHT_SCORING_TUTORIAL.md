# Frontend v147 — High-contrast light scoring tutorial

## Fix

The scoring tutorial has been moved from a near-black presentation surface to a warm white, high-contrast presentation system. This resolves inherited transparent/gradient heading styles that made the intro, framing and completion copy nearly invisible in production.

## Changes

- Warm white tutorial background across Intro, Evidence, Score and Done stages.
- Explicit black text rendering, including `-webkit-text-fill-color`, to prevent global cinematic text rules from making headings transparent.
- Dark controls and stage indicator on the light surface.
- White evidence dock with readable dark evidence text.
- White score/reference panels with restrained shadows and red-only interaction accents.
- Existing guided flow, KSV replica, static assets, four-click logic and offline behaviour are unchanged.
