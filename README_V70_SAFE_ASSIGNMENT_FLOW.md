# Frontend v70 — Safe Lead Pool assignment flow

Adds the operational guardrails requested for moving discovery/referral/archive leads into PM Ranking.

## Changes
- Lead Pool now has an Import Lead CSV button for direct/manual imports.
- Import and archive sends show a clear popup: added vs already there / not duplicated.
- Lead rows now have Edit and Delete actions.
- Send Approved to Ranking now requires the admin password.
- Assignment options: send to everyone, split across PMs, or send to a specific PM.
- Send confirmation explains that existing assigned/rated NGOs will be skipped and existing responses will not be overwritten.
- Ranking send popup shows PM task count, lead count, skipped/already-existing count, and assignment split.

Use with backend v45.
