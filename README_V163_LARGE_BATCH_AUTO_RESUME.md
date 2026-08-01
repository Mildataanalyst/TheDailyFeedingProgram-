# Frontend v163 — 15,000-row recovery and automatic resume

This complete Next.js repository retains the v162 Avika Fit Review and grouped Shortlisting Pool and adds:

- a visible UI v163 marker;
- 100 MB CSV support for Karnataka Recovery and Avika Fit Review;
- streamed same-origin proxy uploads instead of buffering the full CSV in the frontend process;
- a default-on “Automatically resume checkpoints” control;
- live automatic-resume status, retry countdown and attempt count;
- polling that remains active while the worker is waiting to auto-resume;
- explicit-user-pause messaging: a deliberate pause stays paused;
- enhanced-recovery file guidance for the 15,000-row next batch.
