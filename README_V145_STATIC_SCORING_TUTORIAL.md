# V145 — Static guided scoring tutorial

## What changed

- Added `components/ScoringTutorial.tsx` as a client-side guided walkthrough.
- Replaced the previous standalone-document tutorial modal in `app/progress/WorkstreamPanel.tsx`.
- Relabelled the existing PM-surface trigger to `Scoring tutorial`.
- Added a single-step state machine covering intro, evidence collection, scoring and completion.
- Added the static Kalkeri site/report replica, two evidence captures, reference rubric and practice score interaction.
- Added reduced-motion handling, Escape/close reset and cancellable auto-advance timers.
- Exported `METRICS` from `components/MetricScoring.tsx` while retaining `METRIC_DEFINITIONS` as a compatibility alias.
- Removed the retired standalone tutorial asset and external runtime font links.

## Validation

- `npm run build` passes.
- Tutorial component contains no network API calls or remote asset references.
- The retired tutorial route is absent from the repository.
- All metric questions, rubric rows and NGO examples are read from `METRICS`.
