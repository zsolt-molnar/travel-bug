---
name: working-poc
description: Travel Bug Working POC (Phases 1–4) standing rules — mock LLM only, ports, seed identity, what is out of scope until ARCHITECTURE §9. Read before non-trivial feature work.
---

# Working POC boundaries

Source of truth: [`ARCHITECTURE.md`](../../ARCHITECTURE.md) §8 (POC / Phase 5) and §9 (future).

## Standing rules

- **Mock LLM only** through Phase 5. Use `MockLLM` / `runMockConciergeGraph` in `@travel-bug/agent-core`. No OpenAI/Anthropic keys or network calls.
- **No Next Route Handlers** in `apps/client-app` (Capacitor `output: "export"`). Chat streams from Nest `POST /chat`.
- **Do not invent** OCR workers, Firecrawl, Auth0/NextAuth, live Stripe, offline SQLite, push notifications, or gems ingest UI until §9 is explicitly started.
- **Phase 5.8:** in-app trip message board + traveler notifications (header bell). Push stays §9.

## Local ports

| App            | Port |
| -------------- | ---- |
| `client-app`   | 3000 |
| `api-server`   | 3001 |
| `admin-portal` | 3002 |

```bash
docker compose up -d
pnpm db:migrate && pnpm db:seed
pnpm --filter @travel-bug/db build && pnpm --filter @travel-bug/agent-core build
pnpm --filter api-server dev
pnpm --filter client-app dev
pnpm --filter admin-portal dev
```

## Stable seed IDs

Canonical: `packages/db/src/seed-ids.ts` (exported as `SEED_IDS` from `@travel-bug/db`).

## Auth

Phase 5 uses Bearer JWT (`POST /auth/login`). Demo password: `SEED_PASSWORD` / `password123`. Do not send mock `x-user-id` headers.

## Generative UI tool names (do not rename casually)

- `showTicket`
- `generateItineraryTimeline`

## Invite codes (registration Path B)

- Seeded: `PARIS-VIP`
- Also accepted in client UI: `AGENCY2026`

## After POC (§9 order suggestion)

Real LLM swap → OCR/RAG BullMQ → gems ingest UI → production auth/billing → **push notifications** → offline/native polish.
