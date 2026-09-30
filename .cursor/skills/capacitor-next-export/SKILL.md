---
name: capacitor-next-export
description: Capacitor + Next.js static export for apps/client-app. Use when changing Next config, native sync, or mobile packaging for the traveler app.
---

# Capacitor + Next static export

Full mobile pipeline (versioning, secrets, splash): see project skill **`capacitor`**.

## Required Next config (`apps/client-app`)

```ts
output: 'export';
images: {
  unoptimized: true;
}
```

## Capacitor

- App id: `com.travelbug.client`
- `webDir`: `out`
- Platforms: `ios/`, `android/`
- Config: `capacitor.config.ts` (schemes, keyboard, splash, backgroundColor)

## Workflow

```bash
cd apps/client-app

# Recommended release pipeline
pnpm build-mobile              # production
pnpm build-mobile -- staging

# Dev iteration
pnpm build && pnpm cap:sync
pnpm cap:ios / pnpm cap:android
```

## Constraints

- No Next Route Handlers / SSR-only features that break static export.
- Prefer client-side or remote Nest API calls for dynamic data (`NEXT_PUBLIC_API_URL`).
- Mobile secrets: `.env.mobile-secrets.{staging|production}.local` → `.env.production.local` via `setup-mobile-env.mjs`.
