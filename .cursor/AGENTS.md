# travel-bug — Agent Brief

Source of truth for system design: [`ARCHITECTURE.md`](../ARCHITECTURE.md). Read it before non-trivial work. Do not invent parallel architecture.

## Monorepo map

| Path                  | Role                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| `apps/client-app`     | Traveler Next.js 15 app + Capacitor (iOS/Android). Static export (`output: 'export'`). |
| `apps/admin-portal`   | B2B tour-operator Next.js 15 dashboard (SSR OK; no Capacitor).                         |
| `apps/api-server`     | NestJS modular monolith (API, queues, agents). Default port **3001**.                  |
| `packages/db`         | Drizzle ORM schema + migrations + seed (Postgres + pgvector).                          |
| `packages/ui`         | Shared UI stub (Shadcn lives per-app until post-POC extract).                          |
| `packages/agent-core` | LangGraph graphs + MockLLM adapter (real providers = ARCHITECTURE §9).                 |
| `packages/config`     | Shared TypeScript / ESLint / Tailwind bases.                                           |

Local infra: `docker compose up -d` → Postgres (`pgvector`) + Redis (BullMQ; idle until OCR phase).

## Phase boundaries

| Phase  | Status      | Scope                                                                                                       |
| ------ | ----------- | ----------------------------------------------------------------------------------------------------------- |
| **1**  | Done        | Monorepo, Capacitor, Drizzle schema, Docker, skills                                                         |
| **2**  | POC         | Traveler UI (mock → then wired to API)                                                                      |
| **3**  | POC         | Nest CRUD + mock LangGraph SSE chat                                                                         |
| **4**  | POC         | Admin RBAC + agency invites                                                                                 |
| **5**  | In progress | Real JWT auth, places/gems, editable itineraries, vault, message board + in-app notifications, tests/format |
| **5+** | Future      | See ARCHITECTURE.md §9 — real LLM, OCR, Stripe, offline                                                     |

**Standing rule:** mock LLM only until §9. No OpenAI/Anthropic keys, no OCR workers, no Firecrawl, no live Stripe.

**Capacitor:** never add Next Route Handlers in `client-app`. Chat streams from NestJS SSE.

## Hard rules

- Multi-tenant gems: `(operator_id IS NULL OR operator_id = :operatorId)`. Document chunks: filter `user_id`. Follow `travel-multi-tenant-rag`.
- Never commit secrets, `.env`, or connection strings. Use `DATABASE_URL` / `REDIS_URL` / `JWT_SECRET` from `.env.example`.
- Schema changes live in `packages/db` via Drizzle — do not invent tables that ignore existing migrations.
- Capacitor client stays on static export + unoptimized images.
- Format with Prettier; husky pre-commit runs lint-staged. See skill `testing-format`.

## Local commands

```bash
pnpm install
pnpm start:dev   # .env → Docker (wait healthy) → migrate → seed-if-empty → turbo dev
# Flags: --apps-only | --seed | --no-seed | --no-migrate

pnpm stop:dev    # kill :3000/:3001/:3002 → docker compose down
# Flags: --apps-only | --volumes

pnpm dev         # apps only (turbo); use when infra is already up
pnpm test        # unit tests (turbo)
pnpm test:e2e    # api-server light e2e (needs Postgres + seed)
pnpm format      # Prettier write
```

| App                     | URL                   |
| ----------------------- | --------------------- |
| Traveler (`client-app`) | http://localhost:3000 |
| API (`api-server`)      | http://localhost:3001 |
| Admin (`admin-portal`)  | http://localhost:3002 |

Demo login password for seeded users: `password123` (see `SEED_PASSWORD`).

## Skill index

### Project skills (committed — [`.cursor/skills/`](./skills/))

| Topic                                           | Skill(s)                  |
| ----------------------------------------------- | ------------------------- |
| **Working POC gates**                           | `working-poc`             |
| Traveler client UI                              | `client-app-traveler-ui`  |
| Admin portal UI                                 | `admin-portal-ui`         |
| Drizzle in this repo                            | `drizzle-pgvector`        |
| NestJS API                                      | `nestjs-api`              |
| Testing + Prettier/husky                        | `testing-format`          |
| Capacitor (mobile build / plugins / versioning) | `capacitor`               |
| Capacitor + Next static export                  | `capacitor-next-export`   |
| BullMQ / Redis                                  | `bullmq-redis`            |
| LangGraph / agents                              | `langgraph-agent-core`    |
| Tenant & RAG security                           | `travel-multi-tenant-rag` |

### Installed skills (gitignored — `.agents/skills/` via [`skills-lock.json`](../skills-lock.json))

| Topic                  | Skill(s)                                                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Turborepo              | `turborepo`                                                                                                                                          |
| Next.js / React        | `next-dev-loop`, `next-cache-components-*`, `next-partial-prefetching-*`, `vercel-react-best-practices`, `vercel-composition-patterns`               |
| Postgres / pgvector    | `postgres`, `design-postgres-tables`, `schema-exploration`, `postgres-database-migration`, `pgvector-semantic-search`, `postgres-hybrid-text-search` |
| Capacitor (Capawesome) | `capacitor-expert`, `capacitor-app-development`, `capacitor-react`                                                                                   |

After clone / `pnpm install`: locked skills restore automatically via `postinstall` → `scripts/install-skills.mjs` (skips if already present). Force reinstall: `pnpm skills:install`. Skip: `SKIP_SKILLS_INSTALL=1 pnpm i`.

## Living skills policy (mandatory)

1. **Project-owned** skills → [`.cursor/skills/<name>/SKILL.md`](./skills/) and list them above. Never put custom skills under `.agents/`.
2. **Third-party** skills → install with the skills CLI into `.agents/skills/` and lock in `skills-lock.json` (directory is gitignored).
3. Before non-trivial work, check the matching project skill under `.cursor/skills/` (and installed ones under `.agents/skills/` when present).
4. When introducing a new library, pattern, queue, agent, or convention, **create or update** a project skill under `.cursor/skills/` — do not leave tribal knowledge only in chat.
5. Prefer updating an existing skill over duplicating overlapping guidance.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
