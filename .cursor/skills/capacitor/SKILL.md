---
name: capacitor
description: >-
  Guides native iOS/Android app development using Capacitor 8 for the Travel Bug
  traveler app (Next.js static export). Use when working on mobile builds, splash/
  icons, keyboard, safe areas, plugins, deep links, or versioning; or when the user
  mentions iOS, Android, Capacitor, or mobile.
---

# Capacitor Mobile Development

Native iOS/Android via Capacitor 8. The traveler Next.js app is statically exported to `out/` and synced into native projects.

Companion skill for Next export constraints: `capacitor-next-export`. Capawesome installed skills (`capacitor-app-development`, `capacitor-react`, `capacitor-expert`) cover generic Capacitor patterns.

## When to Activate

- Mobile builds, sync, or opening Xcode / Android Studio
- Splash screens, app icons, safe area, keyboard
- Capacitor plugins / native permissions / deep links
- Version bumps for store submissions
- User mentions: Capacitor, iOS, Android, mobile build, native app

## Project Configuration

### App Identity

- **App ID**: `com.travelbug.client`
- **App Name**: Travel Bug
- **iOS Scheme**: `travelbug://`
- **Android Scheme**: `https`
- **webDir**: `out` (Next `output: 'export'`)

### Config Files

- Main config: [`apps/client-app/capacitor.config.ts`](../../../apps/client-app/capacitor.config.ts)
- iOS native: [`apps/client-app/ios/App/`](../../../apps/client-app/ios/App/)
- Android native: [`apps/client-app/android/`](../../../apps/client-app/android/)
- Versioning: [`apps/client-app/docs/VERSIONING.md`](../../../apps/client-app/docs/VERSIONING.md)

## One-Time Setup

```bash
cd apps/client-app
cp .env.mobile-secrets.example .env.mobile-secrets.staging.local
cp .env.mobile-secrets.example .env.mobile-secrets.production.local
# Fill NEXT_PUBLIC_API_URL (and any other NEXT_PUBLIC_*) per environment
```

Secrets files are gitignored via `.env*.local`.

Place source art in `apps/client-app/assets/` before generating icons/splash:

- `assets/icon.png` (1024×1024)
- `assets/splash.png` / optional `assets/splash-dark.png`
- `assets/logo.png` / optional `assets/logo-dark.png`

Then: `pnpm update-assets`

## Build Commands

```bash
cd apps/client-app

# Full mobile pipeline (version sync + env + next build + cap sync)
pnpm build-mobile              # production secrets
pnpm build-mobile -- staging

# Dev iteration (web already built)
pnpm build && pnpm cap:sync
pnpm cap:ios
pnpm cap:android

# Versioning
pnpm bump-version patch|minor|major|build
pnpm sync-version

# Splash / icons from assets/
pnpm update-assets
```

### `build-mobile` steps

0. Timestamp `buildNumber` (seconds since 2020-01-01 UTC) → `sync-version.mjs`
1. `setup-mobile-env.mjs` → writes `.env.production.local` from `.env.mobile-secrets.{mode}.local`
2. `check-mobile-env.mjs` — rejects missing/`###PLACEHOLDER###` values
3. `rm -rf out`
4. `next build` (static export to `out/`)
5. `npx cap sync`

Open after build:

- **iOS**: `ios/App/App.xcworkspace`
- **Android**: `android/`

## Version Management

Single source of truth: `apps/client-app/package.json` → `marketingVersion` + `buildNumber`.

See [VERSIONING.md](../../../apps/client-app/docs/VERSIONING.md).

## Capacitor Plugins (baseline)

Install/keep aligned on Capacitor **8.x**:

| Plugin | Purpose |
|--------|---------|
| `@capacitor/core` / `cli` / `ios` / `android` | Runtime + platforms |
| `@capacitor/app` | Lifecycle |
| `@capacitor/keyboard` | Keyboard resize / events |
| `@capacitor/status-bar` | Status bar style |
| `@capacitor/splash-screen` | Splash |
| `@capacitor/assets` (dev) | Icon/splash generation |

Add camera, push (FCM), filesystem, etc. only when a feature needs them — follow Capawesome skills for plugin patterns.

## Platform Detection

```typescript
import { Capacitor } from '@capacitor/core';

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
```

## Safe Area

Prefer CSS `env(safe-area-inset-*)` (already used in traveler shell / `globals.css`). If adding `@capacitor-community/safe-area` or `capacitor-plugin-safe-area`, disable automatic SystemBars inset margins to avoid double padding:

```typescript
// capacitor.config.ts plugins
SystemBars: { insetsHandling: 'disable' }
```

## Keyboard

Configured in `capacitor.config.ts`:

```typescript
Keyboard: {
  resize: KeyboardResize.Native,
  style: KeyboardStyle.Dark,
  resizeOnFullScreen: false,
}
```

Listen only on native:

```typescript
if (Capacitor.isNativePlatform()) {
  Keyboard.addListener('keyboardDidShow', () => { /* ... */ });
  Keyboard.addListener('keyboardDidHide', () => { /* ... */ });
}
```

## WebView Background Color

`android.backgroundColor` / `ios.backgroundColor` in `capacitor.config.ts` must match CSS `--background` (`#f3f6f4`) to prevent cold-start flash.

## Splash & Assets

```bash
pnpm update-assets   # npx @capacitor/assets generate
```

## Pull-to-Refresh (if added)

- Use **touch** events, not pointer events, on Android
- `overscroll-behavior: none` on `html, body`
- Draggable handle: `touchAction: 'none'`

## Android Gradle (AGP 8.x+)

Use optimized Proguard defaults:

```groovy
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

Not deprecated `proguard-android.txt`.

Community package patches (if needed): `apps/client-app/patches/` + `patch-package`.

## Constraints (with Next)

- Keep `output: 'export'` and `images.unoptimized: true`
- No Next Route Handlers / SSR-only APIs in `client-app`
- Dynamic data → Nest API (`NEXT_PUBLIC_API_URL`)

## Troubleshooting

### Clean reinstall + sync

```bash
cd apps/client-app
rm -rf node_modules
pnpm install   # from monorepo root preferred
npx cap sync
```

### iOS

```bash
cd ios/App
rm Podfile.lock
pod install --repo-update
```

### Android

```bash
cd android
./gradlew clean
```

### Build fails on missing secrets

```bash
cp .env.mobile-secrets.example .env.mobile-secrets.production.local
# set NEXT_PUBLIC_API_URL, then:
pnpm build-mobile
```

## Key Files

| Purpose | Path |
|---------|------|
| Capacitor config | `apps/client-app/capacitor.config.ts` |
| Mobile build | `apps/client-app/scripts/build-mobile.mjs` |
| Env setup/check | `apps/client-app/scripts/setup-mobile-env.mjs`, `check-mobile-env.mjs` |
| Version sync/bump | `apps/client-app/scripts/sync-version.mjs`, `bump-version.mjs` |
| Secrets example | `apps/client-app/.env.mobile-secrets.example` |
| Version docs | `apps/client-app/docs/VERSIONING.md` |
| Splash assets | `apps/client-app/assets/` |
| iOS / Android | `apps/client-app/ios/`, `android/` |
