# Frontend v162 — Railway deployment

Deploy this repository to the existing frontend Railway service.

## Variables

```text
NEXT_PUBLIC_BACKEND_URL=https://<core-backend>.up.railway.app
NEXT_PUBLIC_SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
NEXT_PUBLIC_STORY_BACKEND_URL=https://<search-worker>.up.railway.app
BACKEND_URL=https://<core-backend>.up.railway.app
SEARCH_BACKEND_URL=https://<search-worker>.up.railway.app
STORY_BACKEND_URL=https://<search-worker>.up.railway.app
ADMIN_PASSWORD=<existing password>
NIXPACKS_NODE_VERSION=22
```

`ADMIN_PASSWORD` is server-only and is used only by unrelated protected proxy actions. Avika Fit Review, Shortlisting Pool curation, PM dispatch, Karnataka Recovery and NGO-ID backfill do not show a password prompt.

## Build

Nixpacks installs dependencies. The configured build command is only:

```text
npm run build
```

Start command:

```text
npm run start -- -p $PORT
```

After deployment, hard-refresh and verify the Karnataka Recovery heading shows `UI v162`.
