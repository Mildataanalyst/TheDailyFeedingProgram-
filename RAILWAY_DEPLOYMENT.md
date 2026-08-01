# Frontend v154 — Railway deployment

Deploy after both backend URLs are live.

Required Railway Variables:

```text
NEXT_PUBLIC_BACKEND_URL=https://<core-backend>.up.railway.app
NEXT_PUBLIC_SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
NEXT_PUBLIC_STORY_BACKEND_URL=https://<search-worker>.up.railway.app
BACKEND_URL=https://<core-backend>.up.railway.app
```

For the existing internal mutation-token setup, also set the same token used by the backends:

```text
NEXT_PUBLIC_DFP2_ADMIN_TOKEN=<same token>
DFP2_ADMIN_TOKEN=<same token>
```

`NEXT_PUBLIC_*` values are visible in the browser, so this is suitable only for the existing internal/demo protection model; a public deployment should sit behind proper access control.

After deployment, add the final frontend domain to `FRONTEND_ORIGIN` on both Python services and redeploy those services if needed.
