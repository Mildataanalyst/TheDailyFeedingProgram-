# Frontend v131 — Run Deletion UI + Disk Badge

Pairs with worker v67 / backend v79.

Adds to app/ngo-discovery/page.tsx:
- A "Delete" button on every archive row (discovery + bulk), which calls
  POST /repository/runs/delete with an admin-password prompt + confirm.
- A disk-usage badge in the archive toolbar showing volume % used, MB in
  runs, and MB free. Turns red above 80%.
- loadDiskUsage() polls GET /repository/runs/disk-usage on mount and after
  each delete.

CSS added to app/globals.css (.disk-badge, .archive-del).

No other files changed.
