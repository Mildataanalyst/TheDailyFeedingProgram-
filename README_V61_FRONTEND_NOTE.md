# DFP 2.0 Frontend v61

No functional frontend changes were required for the v42 backend persistent job registry. The existing v60 UI continues to call the existing status endpoints, which now include durable job metadata from the backend.

The new backend job endpoints are available for a future lightweight admin jobs page:

- `GET /jobs`
- `GET /jobs/{run_id}`
- `POST /jobs/{run_id}/cancel`
