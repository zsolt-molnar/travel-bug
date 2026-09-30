---
name: testing-format
description: Unit/e2e testing and Prettier/husky formatting for travel-bug. Use when adding tests, changing auth/ACL/gems/itinerary APIs, or touching format/hooks.
---

# Testing & formatting

## Commands

```bash
pnpm --filter api-server test      # Jest unit (*.spec.ts under src/)
pnpm --filter api-server test:e2e # Light e2e against seeded Postgres
pnpm test                         # turbo run test
pnpm format                       # Prettier write (repo root config)
pnpm format:check                 # CI-friendly check
```

Root Prettier: `.prettierrc` + `.prettierignore`. Husky `pre-commit` runs `lint-staged` → `prettier --write` on staged files. Do not use `--no-verify` in normal flow. `pnpm install` runs `prepare` → husky.

## Unit vs e2e (`apps/api-server`)

| Kind                     | When                                               | Notes                                                                                                                      |
| ------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Unit `*.spec.ts`         | AuthService, ACL helpers, pure catalog rules       | Mock `DbService`; jest.mock `@nestjs/jwt` if needed; `transformIgnorePatterns` includes `@nestjs/jwt`                      |
| E2E `test/*.e2e-spec.ts` | Login→Bearer trips, vault ACL, trip gems, from-gem | Requires Docker Postgres + migrated/seeded DB; load root `.env`; close app so `DbService.onModuleDestroy` ends postgres.js |

Seed credentials: `SEED_PASSWORD` (`password123`), emails like `solo@travelbug.demo`, IDs in `SEED_IDS`.

## When changing code

- Auth / RolesGuard / ACL / gems catalog / itinerary writes / message board / notifications → update or add unit + e2e coverage.
- Always format with Prettier before commit (hook enforces staged files).
