# DFP 2.0 revamp changes

Implemented from the approved landing page and Discovery Engine mockups/specs.

## Frontend changes

- Replaced `/` with the final premium landing page:
  - Hero: `DFP 2.0`, `Find the best NGOs`, internal-use label, scroll cue.
  - `How it works` section with three scroll-in process units.
  - External action-dock CTAs for Discovery, Rankings, Tracker.
  - Watch Preview modal.
- Replaced `/ngo-discovery` with the clean Discovery module flow:
  - Topbar contains only `Back`.
  - Region selection first, Karnataka default, all Indian states/UTs included.
  - After region selection, only two visible paths: `Internet Leads` and `Referrals`.
  - Recovery Run moved into hidden Admin Console.
  - Internet Leads has `General Discovery` and `Bulk Mode` toggle.
  - General/Bulk outputs expose `Download CSV` and `Send to Lead Pool`.
  - Referrals use Google Form CSV structure, notes, and then `Send to Lead Pool`.
  - Lead Pool differentiates Internet / Referral / Recovery and can send to Ranking.

## Backend integration points

The Discovery UI uses the existing backend where available:

- `POST /discovery/start`
- `GET /discovery/results/{run_id}`
- `GET /discovery/export/{run_id}/leads`
- `POST /repository/start?mode=bulk`
- `GET /repository/results/{run_id}`
- `GET /repository/export/{run_id}/repository`

It also supports the new workspace bridge endpoints added in the backend zip:

- `GET /workspace/{region}/lead-pool`
- `POST /workspace/{region}/lead-pool/import`
- `GET /workspace/{region}/lead-pool/export.csv`
- `POST /workspace/{region}/send-to-ranking`
- `GET /ranking/final-output`

If `NEXT_PUBLIC_BACKEND_URL` is not configured, the Discovery UI stays demo-safe and uses preview rows.

## v46 Premium Motion Pass

This pass keeps all approved landing-page copy unchanged and upgrades the feel through motion, texture, and interaction polish only.

Landing upgrades:
- cursor-reactive ambient glow
- slow aurora layers and radial grid orb
- subtle hero pulse and title sheen
- floating accent particles
- card tilt, shimmer, and elevated hover behavior
- richer CTA shimmer / press state
- cinematic preview modal entrance and scan effect

Discovery upgrades:
- cursor-reactive shell glow
- richer glass container depth
- premium card shimmer and hover lift
- stronger output reveal motion
- toast pop feedback
- modal cinematic entrance

No backend contracts changed in this pass.
