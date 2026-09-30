---
name: nestjs-api
description: NestJS modular monolith conventions for apps/api-server. Use when adding modules, controllers, queues, or agents under the API app.
---

# NestJS API (`apps/api-server`)

Default port **3001**. Depends on built `@travel-bug/db` and `@travel-bug/agent-core`.

## Layout

```text
src/
  db/          # DbModule + DbService (createDb)
  auth/        # JwtAuthGuard, RolesGuard, AuthModule, acl helpers
  modules/     # trips, vault, itinerary, agencies, chat, places, gems, me, messages, notifications
  agents/      # reserved; chat calls @travel-bug/agent-core today
  queues/      # BullMQ — post-POC (§9)
```

## Auth (Phase 5)

- Global `JwtAuthGuard` + `RolesGuard` (`APP_GUARD`)
- `@Public()` on `/auth/login`, `/auth/signup`, `/auth/register-invite`
- Bearer JWT; claims: `sub`, `email`, `role`, `operatorId`
- Env: `JWT_SECRET`, `JWT_EXPIRES_IN`
- Demo users seeded with password `password123` (`SEED_PASSWORD`)

## REST

- `POST /auth/login|signup|register-invite`
- `GET|POST /trips`, `GET|PATCH|DELETE /trips/:tripId` (traveler write/delete only when `operator_id` is null), `POST /trips/:tripId/copy` (traveler → personal editable copy; vault docs **copied** to new trip, originals kept)
- Traveler `POST /trips` always sets `operatorId: null` (personal/editable)
- `GET|POST /trips/:tripId/messages` — agency board (write: staff/superadmin on managed trips; fan-out `notifications`)
- `GET /notifications`, `GET /notifications/unread-count`, `POST /notifications/:id/read`, `POST /notifications/read-all`
- `GET|POST /vault/documents` (multipart `file` **required**; local `uploads/`); agency upload notifies document owner
- `GET /itinerary/:tripId` + write routes under `/itinerary/...` (traveler writes only when `trips.operator_id` is null)
- `GET /places`, `GET|POST|PATCH|DELETE /gems`
- `GET|PATCH /me/profile`
- Agencies RBAC routes under `/agencies/*`
- `POST /chat` MockLLM SSE (identity from JWT only)

## Multi-tenant gems

`(operator_id IS NULL OR operator_id = :operatorId)` + place subtree. See `auth/acl.ts` and `travel-multi-tenant-rag`.

## Testing

See skill `testing-format` for unit + light e2e expectations. Prefer adding coverage when changing auth, ACL, gems, or itinerary writes.

## Scripts

- `pnpm --filter api-server dev`
- `pnpm --filter api-server build`
- `pnpm --filter api-server test`
- `pnpm --filter api-server test:e2e`
