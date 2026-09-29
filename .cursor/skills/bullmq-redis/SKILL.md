---
name: bullmq-redis
description: Redis + BullMQ queue conventions for travel-bug. Use when adding background jobs for gem ingestion, document OCR, or scraping.
---

# BullMQ + Redis

## Local infra

```bash
docker compose up -d   # redis://localhost:6379
```

Env: `REDIS_URL` (see `.env.example`).

## Planned queues (ARCHITECTURE.md)

| Queue | Purpose | Phase |
|-------|---------|-------|
| `ingest-gems` | Operator gem embeddings | Phase 2 |
| `process-docs` | OCR + chunk + embed documents | Phase 3 |

## Conventions

- Workers live under `apps/api-server/src/queues`.
- Do not implement workers until the phase that owns the queue is approved.
- Prefer idempotent jobs and tenant/user IDs on every job payload.
