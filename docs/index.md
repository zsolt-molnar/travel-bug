---
layout: default
title: Product flows
description: Traveler and admin/agency flows for Travel Bug Working POC — what works today, with Mock vs Real callouts.
---

B2B2C Agentic Travel OS — tour operators run trips in the admin portal; travelers use the mobile-shaped client app. NestJS API + Postgres power data; chat uses a MockLLM. Product blueprint: [`ARCHITECTURE.md`](../ARCHITECTURE.md) in the repo root (Working POC in §8; deferred work in §9). On GitHub Pages that relative link only works from the repository tree; this page is **what the product does today**.

## Legend — Mock vs Real

<div class="legend" markdown="1">

**Real** — NestJS endpoint hits Postgres (or writes a file under `apps/api-server/uploads/` for vault).

**Mock** — Client-only UI, MockLLM responses, or demo Stripe checkout with no payment provider.

**Partial** — Real transport or persistence mixed with MockLLM or non-production billing.

</div>

| App                     | URL                   |
| ----------------------- | --------------------- |
| Traveler (`client-app`) | http://localhost:3000 |
| API (`api-server`)      | http://localhost:3001 |
| Admin (`admin-portal`)  | http://localhost:3002 |

Local bootstrap: `pnpm start:dev` (Docker Postgres + Redis → migrate → seed-if-empty → apps). Demo password for all seeded users: **`password123`**.

---

## System overview

```mermaid
flowchart LR
  travelerApp[Traveler port 3000]
  adminApp[Admin port 3002]
  nestApi[Nest API port 3001]
  postgres[(Postgres)]
  mockLlm[MockLLM agent-core]

  travelerApp -->|Bearer JWT| nestApi
  adminApp -->|Bearer JWT| nestApi
  nestApi --> postgres
  nestApi --> mockLlm
  adminApp -->|invite register link| travelerApp
  adminApp -->|trip message board| nestApi
  nestApi -->|in-app notifications| travelerApp
```

| Hop                                                        | Status                                                                                                     |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Traveler / admin → Nest REST & chat                        | <span class="badge badge-real">Real</span> HTTP + Bearer JWT                                               |
| Nest → Postgres (trips, vault, itinerary, agencies, board) | <span class="badge badge-real">Real</span>                                                                 |
| Nest → chat graph                                          | <span class="badge badge-partial">Partial</span> Real SSE + <span class="badge badge-mock">Mock</span> LLM |
| Registration Path A (monthly / Stripe UI)                  | <span class="badge badge-mock">Mock</span> — no live Stripe                                                |
| Invite Path B (`register-invite` + DB code)                | <span class="badge badge-real">Real</span>                                                                 |

---

## Traveler product

```mermaid
flowchart TD
  landing[Landing]
  login[Login]
  register[Register]
  session[JWT session]
  appShell[App shell]
  home[Dashboard]
  trips[Trips]
  vault[Vault]
  notifs[Notifications]
  chat[Chat SSE]
  pg[(Postgres)]
  mockGraph[MockLLM graph]

  landing --> login
  landing --> register
  register --> session
  login --> session
  session --> appShell
  appShell --> home
  appShell --> trips
  appShell --> vault
  appShell --> notifs
  appShell --> chat
  home --> pg
  trips --> pg
  vault --> pg
  notifs --> pg
  chat --> mockGraph
```

### Entry & auth

| Step            | What happens                                          | Status                                                             |
| --------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Landing `/`     | Marketing + CTAs to register / login                  | <span class="badge badge-mock">Mock</span> static UI               |
| Login `/login`  | Email + password → `POST /auth/login`                 | <span class="badge badge-real">Real</span> JWT + bcrypt            |
| Register Path A | “Monthly” signup UI                                   | <span class="badge badge-mock">Mock</span> Stripe checkout UI only |
| Register Path B | Invite code → `POST /auth/register-invite`            | <span class="badge badge-real">Real</span>                         |
| Signup          | `POST /auth/signup` (independent traveler)            | <span class="badge badge-real">Real</span>                         |
| Session         | `localStorage` `tb:session:v1` (`accessToken` + user) | <span class="badge badge-real">Real</span>                         |

API calls send `Authorization: Bearer <token>` only.

### In-app screens

| Screen        | Route                       | Status                                           | Notes                                                                                                                                                                                                       |
| ------------- | --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home          | `/app`                      | <span class="badge badge-real">Real</span>       | Upcoming trips, day plan, documents you’ll need (each with show more / less); attachment badge on day stops when a vault doc is linked                                                                      |
| Trips list    | `/app/trips`                | <span class="badge badge-real">Real</span>       | Create personal trips; delete personal only; agency trips labeled                                                                                                                                           |
| Trip detail   | `/app/trips/detail?tripId=` | <span class="badge badge-real">Real</span>       | Static-export safe query param. Personal: full edit (manual days/items + add-from-gem). Agency: read-only + **Copy to my trips** + message board (`?panel=board`). Agentic day enrichment is not wired yet. |
| Vault         | `/app/vault`                | <span class="badge badge-real">Real</span>       | Upload / Save / delete; attach docs to day items from trip detail; deep link `?docId=`                                                                                                                      |
| Notifications | `/app/notifications`        | <span class="badge badge-real">Real</span>       | Header bell + unread count; trip board + agency vault posts; mark one / mark all read                                                                                                                       |
| Chat          | `/app/chat`                 | <span class="badge badge-partial">Partial</span> | Nest SSE <span class="badge badge-real">Real</span>; MockLLM tools <span class="badge badge-mock">Mock</span> (no OCR/RAG)                                                                                  |

**Personal vs agency trips:** personal trips (`operatorId` null) are editable by the traveler. Agency-managed trips are view-only; travelers copy them to edit. Vault documents on agency trips stay with the agency trip and are duplicated onto the copy.

### Chat tools (MockLLM)

| Tool                        | Role                                | Status                                             |
| --------------------------- | ----------------------------------- | -------------------------------------------------- |
| `showTicket`                | Ticket / pass style generative card | <span class="badge badge-mock">Mock</span> payload |
| `generateItineraryTimeline` | Timeline-style generative card      | <span class="badge badge-mock">Mock</span> payload |

Stream path: `useChat` → `POST /chat` → MockLLM graph in `@travel-bug/agent-core`. No Next Route Handlers in `client-app` (Capacitor static export).

---

## Admin / agency product

```mermaid
flowchart TD
  login[Admin login JWT]
  agencies[Agencies]
  places[Places]
  gems[Gems]
  trips[Trips]
  board[Message board]
  clients[Trip travelers]
  vault[Traveler vault]
  invite[Invite link]
  register[Traveler register]
  pg[(Postgres)]

  login --> agencies
  login --> places
  login --> gems
  login --> trips
  trips --> board
  trips --> clients
  clients --> vault
  clients --> invite
  invite -->|code| register
  agencies --> pg
  places --> pg
  gems --> pg
  trips --> pg
  board --> pg
  vault --> pg
```

### Auth & roles

| Step          | Status                                     | Notes                                                          |
| ------------- | ------------------------------------------ | -------------------------------------------------------------- |
| Login         | <span class="badge badge-real">Real</span> | `/login` → `POST /auth/login`; token in `tb:admin-token:v1`    |
| Authorization | <span class="badge badge-real">Real</span> | Nest `JwtAuthGuard` + `RolesGuard`; UI hides tabs by role only |

| Role             | Typical nav                                              | Can do                                                                |
| ---------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| `superadmin`     | Dashboard, Agencies, Places, Trips, Gems, Staff, Clients | Platform operators, places CRUD, all agency trips, gems               |
| `agency_manager` | Dashboard, Places, Trips, Gems, Staff, Clients           | Staff, trips, clients, gems for operator, message board, vault upload |
| `agency_agent`   | Dashboard, Places, Trips, Gems, Clients                  | Trips, clients, gems browse/use, message board, vault upload          |

### Agency operations

| Action                     | API / UI                                     | Status                                                                                                                        |
| -------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Agencies                   | `GET/POST /agencies`                         | <span class="badge badge-real">Real</span> — superadmin                                                                       |
| Places tree                | `GET/POST/PATCH/DELETE /places`              | <span class="badge badge-real">Real</span> — superadmin write                                                                 |
| Hidden gems                | `GET/POST/PATCH/DELETE /gems`                | <span class="badge badge-real">Real</span> — tenant + place scoped                                                            |
| Trips list / create / edit | `/agencies/trips`                            | <span class="badge badge-real">Real</span> — title, dates, itinerary (manual + add-from-gem; enrichment agents not wired yet) |
| Message board              | `GET/POST /trips/:tripId/messages`           | <span class="badge badge-real">Real</span> — one-way to travelers                                                             |
| Trip travelers             | `GET/POST /agencies/trips/:tripId/clients`   | <span class="badge badge-real">Real</span> — paginated + search                                                               |
| Per-traveler vault         | `/trips/[id]/travelers/[userId]` + vault API | <span class="badge badge-real">Real</span> — upload notifies traveler                                                         |
| Invite unknown email       | `invites` row + client register link         | <span class="badge badge-real">Real</span>                                                                                    |

Hidden gems visibility: `(operator_id IS NULL OR operator_id = :agency)` plus place subtree. Day items can focus a place; add-from-gem respects that scope.

---

## Auth model

| Piece            | Detail                                                           |
| ---------------- | ---------------------------------------------------------------- |
| Transport        | `Authorization: Bearer <jwt>`                                    |
| Claims           | `sub`, `email`, `role`, `operatorId`                             |
| Roles            | `superadmin` \| `agency_manager` \| `agency_agent` \| `traveler` |
| Password         | bcrypt hashes in `users.password_hash`                           |
| Traveler session | `tb:session:v1`                                                  |
| Admin session    | `tb:admin-token:v1` + `tb:admin-user:v1`                         |

---

## Try the demo

Seeded via `pnpm db:seed` (stable UUIDs in `packages/db/src/seed-ids.ts`). Password for all: **`password123`**.

| Who                  | Email                       | Notes                                  |
| -------------------- | --------------------------- | -------------------------------------- |
| Superadmin           | `superadmin@travelbug.demo` | Admin portal                           |
| Agency manager       | `manager@wanderlust.pro`    | Wanderlust Pro                         |
| Agency agent         | `agent@wanderlust.pro`      | Wanderlust Pro                         |
| Independent traveler | `solo@travelbug.demo`       | Owns Solo Paris Escape                 |
| Agency client        | `client@wanderlust.pro`     | Paris VIP + Tokyo Week; board + notifs |
| Legacy traveler id   | `traveler@travelbug.demo`   | Seeded user                            |

| Demo artifact | Value / tip                                 |
| ------------- | ------------------------------------------- |
| Invite code   | `PARIS-VIP` (pending invite in DB)          |
| Agency trips  | Wanderlust Paris VIP, Wanderlust Tokyo Week |
| Personal trip | Solo Paris Escape                           |
| Message board | Tokyo welcome + typhoon alert (seeded)      |
| Vault example | Agency boarding pass on Paris VIP           |

---

## Future AI capabilities

Three separate outcomes beyond the Working POC (see ARCHITECTURE §6 agents and §9). Chat MockLLM today is **not** the same as itinerary enrichment or vault RAG.

| Capability               | Product outcome                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Concierge chat**       | Real LLM behind Nest SSE chat (replaces MockLLM tool cards).                                                                                                                                                                 |
| **Vault intelligence**   | OCR on uploads → `document_chunks` → answers from the traveler’s own documents.                                                                                                                                              |
| **Itinerary enrichment** | Agents that suggest **programs / activities** into the day plan when building a trip (admin + traveler): operator **hidden gems** first, optional live web fill — writing structured itinerary stops, not only chat replies. |

---

## Not in this POC

Also out of the Working POC (ARCHITECTURE §9):

- Device **push** notifications (in-app notifications and the header bell are in scope)
- Live Stripe Checkout
- Hosted IdP (Auth0 / NextAuth / cookie sessions)
- Capacitor offline SQLite / offline maps
- Operator brand theming driven by `brand_config`
- Generative UI beyond ticket + timeline cards
