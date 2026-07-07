# DFP 2.0 Frontend v15 — design recovery build

This package fixes the dark UI implementation drift and keeps the existing backend contract intact.

What changed:
- Added a consolidated visual recovery layer in `app/globals.css` for the dark glass panels, red glow, spacing, typography, cards, tabs, buttons, progress views, and story/repository modules.
- Removed runtime dependency on external map artwork. Local SVG assets now live in `public/assets/india-map.svg` and `public/assets/karnataka-map.svg`.
- Progress Tracker now defaults to Karnataka so the page opens into the populated dashboard instead of the empty state.
- Added the Progress back button and tightened the Team / PM view header controls.
- Made the “No official website re-check” block visible as a first-class panel, matching the supplied designs, rather than hiding it inside Advanced.
- Removed Google Fonts runtime loading from the layout to avoid build/network dependency; the UI now uses a local system font stack.
- Verified with `npm run build`.

Deployment notes:
- Upload the contents of this folder to the frontend repo root, not the wrapper folder.
- Keep `NEXT_PUBLIC_BACKEND_URL` set to the deployed FastAPI backend URL.
- Set `ADMIN_PASSWORD` plus Upstash/Vercel KV variables only if you want Progress dashboard publishing enabled.
