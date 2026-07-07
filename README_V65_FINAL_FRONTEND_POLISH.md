# Frontend v65 — Final polish for discovery/ranking journey

Changes:
- Removed the central raised pill/rectangle from the landing hero text area while preserving the circular orbit/glimmer treatment.
- Added a Go to Rankings action inside the Lead Pool view.
- Added archive/history sent markers: a gold star appears beside archive rows after they are sent to Lead Pool from the frontend.
- Ranking Center now uses the state-gate + three-module journey layout: PM Shortlists, Combined Review, Final Shortlist.
- Final Shortlist can send buckets to Contact Tracker and links directly to Tracker.
- Final board rows from the backend are grouped into final buckets on the frontend when the backend returns a flat rows payload.

Use with Backend v44 archive/import existing-ranking guard.
