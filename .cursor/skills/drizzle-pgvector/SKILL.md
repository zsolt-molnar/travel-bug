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
pnpm db:seed              # truncate + seed (wipes local data)
pnpm db:seed -- --if-empty  # seed only when users table is empty
pnpm db:studio     # drizzle-kit studio
pnpm --filter @travel-bug/db build   # emit dist/ for Nest imports
```

## Conventions

- Match ARCHITECTURE.md §5: `vector(1536)`, HNSW with `vector_cosine_ops`.
- Always ensure `CREATE EXTENSION IF NOT EXISTS vector` runs before vector columns (docker init + migration bootstrap).
- Export tables/types from `@travel-bug/db`; do not duplicate schema in apps.
- Use `DATABASE_URL` from env; never hardcode credentials.
- **Stable demo IDs:** `packages/db/src/seed-ids.ts` → `SEED_IDS` + `SEED_PASSWORD` (`password123`).
- Nest imports compiled `dist/`; rebuild db package after schema changes before starting api-server.

## Phase 5 schema notes

- `users.passwordHash` (bcryptjs in seed / Nest auth)
- `traveler_profiles` 1:1 with traveler users
- `places` tree: `kind` country | region | city | area; `parentId` self-FK
- `trips.title`, `trips.destinationPlaceId`
- `hidden_gems.operatorId` **nullable** (null = public); `placeId` required
- Gem tenant filter: `(operator_id IS NULL OR operator_id = :operatorId)`
- `itinerary_days.placeId` optional day area; `itinerary_items.sortOrder`; `documentId` FK → `user_documents`
- `user_documents.extractedData` jsonb (OCR later)
- `trip_messages` — agency one-way board (`kind` alert|info|notice)
- `notifications` — in-app traveler inbox (`type` trip_message|vault_document; `readAt`)
- Roles: `superadmin` | `agency_manager` | `agency_agent` | `traveler`
