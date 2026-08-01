# Frontend v159 status/proxy hotfix

- Karnataka Recovery polling uses the same-origin `/api/dfp-proxy/search/...` route.
- Karnataka Recovery downloads use the same proxy instead of browser cross-origin requests.
- The UI visibly shows `UI v159` so the deployed build can be verified.
- Requires server-side `SEARCH_BACKEND_URL` (or `NEXT_PUBLIC_SEARCH_BACKEND_URL`) in Railway.
