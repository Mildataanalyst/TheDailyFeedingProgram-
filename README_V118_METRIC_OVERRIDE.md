# V118 — Per-metric override

Each PM metric now contains an optional **Override this metric** control.

Stored inside `responses.<task_index>.metric_scores.<metric_key>`:

- `rank`
- `reason`
- `override`
- `override_reason`

Rules:

- The normal score rationale remains mandatory at 100 characters.
- Turning on the override makes the override rationale mandatory at 100 characters.
- When a score exceeds the evidence pack's recommended ceiling, an override and rationale are required.
- Existing overall ranking memory remains read-only and unchanged.
