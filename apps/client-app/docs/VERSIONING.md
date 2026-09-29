# Mobile App Versioning

How version numbers are managed across iOS and Android for `apps/client-app`.

## Version Number Components

1. **Marketing Version** (e.g. `0.1.0`) — user-visible version string
   - **Patch**: Bug fixes (`0.1.0` → `0.1.1`)
   - **Minor**: New features (`0.1.0` → `0.2.0`)
   - **Major**: Breaking changes (`0.1.0` → `1.0.0`)

2. **Build Number** (e.g. `203369189`) — internal build counter
   - Must increment for every App Store / Google Play submission
   - Never decreases
   - `build-mobile` regenerates this as seconds since 2020-01-01 UTC

## Single Source of Truth

Versions live in **`apps/client-app/package.json`**:

```json
{
  "marketingVersion": "0.1.0",
  "buildNumber": 1
}
```

Synced automatically to:

- **iOS**: `ios/App/App.xcodeproj/project.pbxproj` → `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`
- **Android**: `android/app/build.gradle` → `versionName`, `versionCode`

## Workflow

### Bump marketing version

```bash
cd apps/client-app

pnpm bump-version           # patch (default)
pnpm bump-version patch
pnpm bump-version minor
pnpm bump-version major
pnpm bump-version build     # build number only
```

### Build for release

```bash
cd apps/client-app

pnpm build-mobile              # production secrets
pnpm build-mobile -- staging   # staging secrets
```

`build-mobile` runs: timestamp build number → `sync-version` → mobile env setup/check → `next build` → `cap sync`.

### Manual sync

```bash
pnpm sync-version
```

## Related

- Project skill: `.cursor/skills/capacitor/SKILL.md`
- Next + Capacitor export: `.cursor/skills/capacitor-next-export/SKILL.md`
