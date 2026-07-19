# DFP 2.0 Frontend — V107 Clean Upload

This is the clean source package for the DFP 2.0 frontend.

## Upload to GitHub

Upload the **contents of this folder** to the repository root. This package contains fewer than 100 files and excludes generated/development folders.

## Intentionally excluded

- `node_modules/`
- `.next/`
- old version-specific README files
- unused landing/map image assets
- operating-system cache files

GitHub/Railway will recreate dependencies and build output from `package.json` and `package-lock.json`.

## Local commands

```bash
npm ci
npm run build
npm run dev
```

## Required deployment configuration

Keep the existing frontend environment variables configured in Railway/Vercel, including the deployed backend URL and any Redis/admin variables already used by the project.!
