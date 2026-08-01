# Frontend v159 — Railway deployment

Deploy after the core-backend and search-worker domains are live.

```text
NEXT_PUBLIC_BACKEND_URL=https://<core-backend>.up.railway.app
NEXT_PUBLIC_SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
NEXT_PUBLIC_STORY_BACKEND_URL=https://<search-worker>.up.railway.app
BACKEND_URL=https://<core-backend>.up.railway.app
SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
STORY_BACKEND_URL=https://<search-worker>.up.railway.app
ADMIN_PASSWORD=<same existing password as both Python services>
NIXPACKS_NODE_VERSION=22
```

`ADMIN_PASSWORD` is server-only. Do not create `NEXT_PUBLIC_ADMIN_PASSWORD`, `NEXT_PUBLIC_DFP2_ADMIN_TOKEN` or any other public credential.

Build configuration:

```text
Node: 22.x
Install: automatic Nixpacks npm ci
Build: npm run build
Start: npm run start -- -p $PORT
```

After deployment, set the final frontend domain as `FRONTEND_ORIGIN` on both Python services.
