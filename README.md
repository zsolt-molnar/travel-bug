# travel-bug

B2B2C Agentic Travel OS (tour operator digital concierge).

## Docs

- [`docs/`](./docs/) — **Product flows** (traveler + admin/agency, Mock vs Real). GitHub Pages: Settings → Pages → branch `main`, folder `/docs` (see [`docs/README.md`](./docs/README.md))
- [`.cursor/AGENTS.md`](./.cursor/AGENTS.md) — AI agent brief, skill index, living skills policy
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system blueprint (§8 Working POC, §9 Future)
- Project skills: [`.cursor/skills/`](./.cursor/skills/) (committed)
- Installed skills: `.agents/` (gitignored; restored on `pnpm install` from [`skills-lock.json`](./skills-lock.json))

## Quick start

```bash
pnpm install
pnpm start:dev
```

| App                     | URL                   |
| ----------------------- | --------------------- |
| Traveler (`client-app`) | http://localhost:3000 |
| API (`api-server`)      | http://localhost:3001 |
| Admin (`admin-portal`)  | http://localhost:3002 |

Stop everything when done:

```bash
pnpm stop:dev
```

## Local stack scripts

### `pnpm start:dev`

Bootstraps the Working POC step-by-step:

1. Ensure `.env` (copies from `.env.example` if missing)
2. `docker compose up -d --wait` (Postgres + Redis)
3. `pnpm db:migrate`
4. Seed demo data **only if the DB is empty** (does not wipe existing data)
5. `turbo run dev` (client :3000, API :3001, admin :3002)

```bash
pnpm start:dev
pnpm start:dev -- --apps-only     # skip .env / Docker / migrate / seed
pnpm start:dev -- --seed          # force wipe + reseed
pnpm start:dev -- --no-seed       # never seed (even on empty DB)
pnpm start:dev -- --no-migrate    # skip migrations
```

Apps only when infra is already up: `pnpm dev` (turbo alone). Ctrl+C on `start:dev` stops the apps; Docker stays up until you run `stop:dev`.

### `pnpm stop:dev`

Tear down counterpart:

1. Stop listeners on ports **3000 / 3001 / 3002**
2. `docker compose down` (keeps volumes / DB data by default)

```bash
pnpm stop:dev
pnpm stop:dev -- --apps-only   # kill apps only; leave Docker running
pnpm stop:dev -- --volumes     # also remove Compose volumes (wipes Postgres/Redis data)
```

## Database

- `DATABASE_URL` / `REDIS_URL` — see `.env.example` (never commit `.env`)
- `pnpm db:migrate` — apply Drizzle migrations
- `pnpm db:seed` — wipe + reseed stable demo UUIDs (operator, traveler, Paris trip, gems, docs)
- `pnpm db:seed -- --if-empty` — seed only when there are no users yet
- `pnpm db:studio` — Drizzle Studio

Redis is up for future BullMQ OCR (ARCHITECTURE §9); unused in the Working POC.

## POC note

Working POC: Nest/Postgres with **JWT auth**, editable trips/gems/places, vault, message board + in-app notifications, and **mock LLM** chat only. Real providers, OCR, push, and live Stripe are out of scope until ARCHITECTURE §9. See [`docs/`](./docs/) for product flows.
