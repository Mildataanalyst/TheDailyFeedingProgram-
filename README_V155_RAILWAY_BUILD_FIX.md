# Frontend v155 — Railway build fix

This release fixes the Railway deployment failure:

```text
EBUSY: resource busy or locked, rmdir '/app/node_modules/.cache'
```

## Root cause

Nixpacks already runs `npm ci` in its install phase. Frontend v154 also configured:

```text
npm ci && npm run build
```

as the custom build command. The second `npm ci` attempted to remove Nixpacks' mounted/cached
`node_modules/.cache` directory and failed with `EBUSY`.

## Changes

- `railway.json` build command is now `npm run build`.
- Node is pinned to major version 22 through `package.json` and `.nvmrc`.
- No application behavior or Karnataka Recovery logic was removed.

## Deploy

Extract this ZIP into the frontend repository root, commit, push, and redeploy the frontend service.
The repository root must directly contain `package.json`, `railway.json`, `app/`, and `components/`.

Do not set a dashboard build command containing `npm ci`. The config in `railway.json` will override it.
