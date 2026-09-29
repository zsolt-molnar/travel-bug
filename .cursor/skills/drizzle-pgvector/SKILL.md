---
name: drizzle-pgvector
description: Drizzle ORM + pgvector for packages/db in travel-bug. Use when editing schema, generating/running migrations, or connecting NestJS to Postgres.
---

# Drizzle + pgvector (`packages/db`)

## Layout

- Schema: `packages/db/src/schema/index.ts`
- Client: `packages/db/src/client.ts` (`createDb(DATABASE_URL)`)
- Config: `packages/db/drizzle.config.ts`
- Migrations: `packages/db/drizzle/`

## Commands (from repo root)

```bash
pnpm db:generate   # drizzle-kit generate
pnpm db:migrate    # drizzle-kit migrate
pnpm db:seed       # idempotent truncate + seed (tsx src/seed.ts)
pnpm db:studio     # drizzle-kit studio
pnpm --filter @travel-bug/db build   # emit dist/ for Nest imports
```

## Conventions

- Match ARCHITECTURE.md §5: `vector(1536)`, HNSW with `vector_cosine_ops`.
- Always ensure `CREATE EXTENSION IF NOT EXISTS vector` runs before vector columns (docker init + migration bootstrap).
- Export tables/types from `@travel-bug/db`; do not duplicate schema in apps.
- Use `DATABASE_URL` from env; never hardcode credentials.
- **Stable demo IDs:** `packages/db/src/seed-ids.ts` → `SEED_IDS` (traveler, operator, Paris trip, gems, docs, invite).
- POC schema extras (Phase 4): `users.name`, `trips.operator_id`, `trip_travelers`, `invites`, `user_documents.title`, `itinerary_items.document_id`.
- Roles string values: `superadmin` | `agency_manager` | `agency_agent` | `traveler`.
- Nest imports compiled `dist/`; rebuild db package after schema changes before starting api-server.
