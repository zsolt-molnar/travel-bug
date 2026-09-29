# client-app (Travel Bug traveler)

Next.js 15 static export + Capacitor 8 (iOS / Android).

## Web

```bash
pnpm dev      # http://localhost:3000
pnpm build    # writes out/
```

Set `NEXT_PUBLIC_API_URL` (see repo `.env.example`).

## Mobile

See [docs/VERSIONING.md](./docs/VERSIONING.md) and project skill `.cursor/skills/capacitor/SKILL.md`.

```bash
# One-time secrets
cp .env.mobile-secrets.example .env.mobile-secrets.production.local
# edit NEXT_PUBLIC_API_URL

pnpm build-mobile              # production
pnpm build-mobile -- staging

pnpm cap:ios
pnpm cap:android

pnpm bump-version patch
pnpm update-assets             # needs assets/icon.png + splash.png
```

Quick sync after a local `pnpm build`:

```bash
pnpm cap:sync
```
