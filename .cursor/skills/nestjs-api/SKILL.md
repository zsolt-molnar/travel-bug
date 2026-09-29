---
name: nestjs-api
description: NestJS modular monolith conventions for apps/api-server. Use when adding modules, controllers, queues, or agents under the API app.
---

# NestJS API (`apps/api-server`)

Default port **3001**. Depends on built `@travel-bug/db` and `@travel-bug/agent-core` (`pnpm --filter … build` before `nest start` if dist is stale).

## Layout

```text
src/
  db/          # DbModule + DbService (createDb)
  auth/        # IdentityGuard, RolesGuard, @Identity(), @Roles()
  modules/     # trips, vault, itinerary, agencies, chat
  agents/      # reserved; chat calls @travel-bug/agent-core today
  queues/      # BullMQ — post-POC (§9)
```

## POC identity

`IdentityGuard` (APP_GUARD) reads headers; defaults to seeded traveler if missing:

- `x-user-id`
- `x-operator-id`
- `x-user-role`

`RolesGuard` + `@Roles(...)` on agency routes. Always filter queries by `userId` / `operatorId` from identity (see `travel-multi-tenant-rag`).

## REST (traveler)

- `GET|POST /trips`
- `GET|POST /vault/documents` (multipart `file` optional; local `uploads/`)
- `GET /itinerary/:tripId`

## REST (agency / RBAC)

- `GET|POST /agencies`
- `GET|POST /agencies/staff`
- `GET|POST /agencies/trips`
- `GET|POST /agencies/trips/:tripId/clients`

## Chat stream

- `POST /chat` body: `{ messages: [{ role, content }] }`
- Response: AI SDK data stream (`X-Vercel-AI-Data-Stream: v1`) with text chunks + tool calls
- Implementation: `runMockConciergeGraph` — swap provider in agent-core for §9

## Scripts

- `pnpm --filter api-server dev`
- `pnpm --filter api-server build`
