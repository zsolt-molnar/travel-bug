# Agentic Travel OS: Complete Master Architecture & Business Flow Specification

## 1. Executive Summary & Vision

**Goal:** Build a B2B2C Agentic Travel Ecosystem (SaaS). The platform provides a "Digital Concierge" sold to tour operators, who white-label and deliver it to their travelers as a mobile pocket guide app.

**Key Value Drivers:**

1. **Tri-Layer Intelligence Engine:** Synthesizes global APIs (flights/hotels), real-time web scraping (live local trends/events), and a multi-tenant Operator Database (exclusive human-curated hidden gems).
2. **Automated Day-by-Day Itinerary Planner:** Generates structured daily travel plans explicitly categorizing activities, "what to eat," "what to drink," and "hidden gems" optimized by location proximity and pacing.
3. **Document Intelligence Vault:** Uses OCR and RAG on user-uploaded PDFs (tickets, insurance, vouchers) to answer context-specific questions and provide proactive travel support.
4. **Agentic UI / Generative UI:** Interactive streaming chat interface that dynamically renders rich UI widgets (day-by-day timelines, map cards, ticket passes) with user customization capabilities (swap/drag-and-drop).
5. **Hybrid Processing:** Combines server-side heavy LLMs for complex trip planning with client-side processing (Capacitor/WebGPU) for offline document viewing and privacy.

---

## 2. End-to-End Business & System Workflows

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           1. OPERATOR FLOW                              │
│  [Tour Operator] ──> Admin Portal ──> Uploads "Gems" ──> Vectorized DB  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                           2. TRAVELER FLOW                              │
│  [Traveler] ──> App Link/QR ──> Uploads Tickets/Insurance ──> Vault RAG │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                 3. TRI-LAYER ITINERARY & CHAT ENGINE                    │
│  [User Query/Dates] ──> Itinerary Planner Agent ──────────────────────┐ │
│                                  │                                      │ │
│   ┌──────────────────────────────┼──────────────────────────────┐       │ │
│   │ 1. Operator DB (Gems/Routes) │ 2. Web Scraper (Live Events) │       │ │
│   └──────────────────────────────┴──────────────────────────────┘       │ │
│                                  │                                      │ │
│                                  ▼                                      │ │
│                 [Interactive Day-by-Day Timeline UI]                    │ │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Flow 1: B2B Operator Onboarding & Knowledge Ingestion

1. **License Provisioning:** Tour operator registers on the `admin-portal` and receives a unique `operator_id` along with a brand configuration profile (logos, color themes, custom AI persona).
2. **Knowledge Ingestion:**
   - Operator logs into the Admin Portal and inputs curated "Hidden Gems" (text, photos, locations, tags like _Quiet, Craft Beer, Local Only, Rooftop_), or uploads itinerary PDFs.
   - Admin API pushes this data to a BullMQ queue (`ingest-gems`).
   - Background workers extract metadata, generate vector embeddings via OpenAI, and store them in the `hidden_gems` table with the corresponding `operator_id`.
3. **Distribution:** Operator generates dynamic client invite links or QR codes containing the embedded `operator_id`.

### 2.2 Flow 2: Traveler Onboarding & Vault Sync (B2C)

1. **App Onboarding:** The traveler downloads the Capacitor app via an operator link/QR code. The app configures its UI theme and AI persona based on the associated `operator_id`.
2. **Document Upload & OCR Pipeline:**
   - Traveler uploads travel documents (flight PDFs, hotel vouchers, travel insurance).
   - Files are stored in Supabase/S3 Storage inside an encrypted private folder.
   - NestJS background worker (`process-docs`) runs OCR (Textract/Document AI), chunks the text, computes embeddings, and populates the `user_documents` vector store.
3. **Offline Sync:** Crucial document data and offline maps are pre-fetched and stored on-device via Capacitor SQLite for offline access during travel.

### 2.3 Flow 3: Day-by-Day Itinerary Generation Workflow

1. **Trip Initialization:** Traveler submits target destination and date range (e.g., _"5 days in Tokyo, love craft cocktails and hidden alleyways"_).
2. **Itinerary Agent Execution (Plan-and-Execute Pattern):**
   - **Step A (Skeleton Construction):** Itinerary Agent queries `user_documents` to pull hotel check-in/checkout times and flight schedules to lock in constraint blocks.
   - **Step B (Operator Gem Clustering):** Curator Agent runs vector search on `hidden_gems` matching the destination, grouping recommendations by geographic proximity (neighborhood clusters).
   - **Step C (Meal & Drink Synthesis):** Scraper Agent fills gaps for trending local food/drink spots (e.g., breakfast, lunch, aperitivo, dinner, late-night drink) for each day.
3. **Rendering & DB Persistence:**
   - System writes the structure to `itineraries`, `itinerary_days`, and `itinerary_items` tables.
   - Streams a rich **Interactive Itinerary Timeline Component** directly into the chat interface.

### 2.4 Flow 4: Interactive Timeline Customization & In-Trip Assistance

1. **Traveler Adjustments:** Traveler taps _"Swap Thursday night drink spot for a jazz bar"_ on the timeline card.
2. **Real-time Swap:** `ItineraryAgent` updates `itinerary_items` by searching for an alternative jazz gem in the same neighborhood cluster.
3. **In-Trip Context Push:** Based on current time and GPS location, the app highlights the upcoming activity block (e.g., _"Up Next (8 PM): Hidden Speakeasy - 5 min walk"_).

### 2.5 Flow 5: Document Intelligence & Emergency Concierge

1. **User Prompt:** Traveler asks: _"My bag was stolen. Does my insurance cover this?"_
2. **Document Agent Execution:**
   - Queries `user_documents` vector table strictly where `user_id = req.user.id` and `doc_type = 'insurance'`.
   - Performs semantic search to retrieve policy clause text chunks.
3. **Actionable Delivery:**
   - Synthesizes a direct answer citing the exact policy section.
   - Automatically presents an **Emergency Action Card** with the local police non-emergency line, operator support contact, and a pre-filled claim document summary.

---

## 3. Tech Stack Definition

- **Architecture Pattern:** Monorepo (Turborepo)
- **Frontend & Mobile Client:** Next.js 15 (App Router), Tailwind CSS, Shadcn UI, Capacitor.js (iOS & Android wrappers).
- **B2B Admin Portal:** Next.js 15 (Dashboard for Tour Operators).
- **Backend API / Services:** NestJS (Node.js) – modular monolith handling API routes, queues, and agent orchestration.
- **Database & Vector Engine:** PostgreSQL + `pgvector` (managed via Drizzle ORM or Prisma).
- **Caching & Queue Infrastructure:** Redis + BullMQ (asynchronous job handling for web scraping & document ingestion).
- **Agentic Framework:** LangGraph (TypeScript) for stateful multi-agent workflows & Vercel AI SDK for UI streaming.
- **Inference Engines:**
  - **Cloud:** OpenAI GPT-4o / Claude 3.5 Sonnet (for complex multi-step itinerary orchestration).
  - **Local Edge:** WebLLM / MLC-LLM in Capacitor (for offline search & lightweight client summaries).
- **Scraping & Document Extraction:** Firecrawl (web-to-markdown API) + AWS Textract / Google Document AI.

---

## 4. Monorepo Folder Structure (Turborepo)

```text
/travel-os-monorepo
├── /apps
│   ├── /client-app         # Next.js App Router (Traveler App) + Capacitor Client
│   │   ├── /ios            # Native iOS build output
│   │   ├── /android        # Native Android build output
│   │   └── /src
│   │       ├── /app        # App router (/chat, /vault, /itinerary, /timeline)
│   │       └── /components # Generative UI widgets (ItineraryTimeline, MapCard, TicketCard)
│   ├── /admin-portal       # Next.js App Router (B2B Dashboard for Tour Operators)
│   └── /api-server         # NestJS Backend Application
│       └── /src
│           ├── /modules    # Tenants, Users, Trips, Itineraries, Documents, Gems
│           ├── /agents     # LangGraph Agents (Supervisor, ItineraryPlanner, Curator, Scraper, Vault)
│           └── /queues     # BullMQ Workers (Document OCR, Scraper, Embeddings)
├── /packages
│   ├── /db                 # Drizzle/Prisma Schema, pgvector migrations, seed scripts
│   ├── /agent-core         # Shared prompts, tools, itinerary builders, and vector utilities
│   ├── /ui                 # Shared Tailwind UI component library (Shadcn)
│   └── /config             # Shared ESLint, TypeScript, and Tailwind configurations
├── package.json            # Workspace dependencies
├── turbo.json              # Turborepo task pipeline configuration
└── ARCHITECTURE.md         # This architectural master specification
```

---

## 5. Database Schema (PostgreSQL + pgvector)

Canonical Drizzle schema: `packages/db/src/schema/index.ts`. Phase 5 additions beyond the early POC baseline:

- `users.password_hash` (JWT auth via Nest; bcryptjs)
- `traveler_profiles` (1:1 traveler profile)
- `places` hierarchical tree (`kind`: country | region | city | area, self-FK `parent_id`) — **platform catalog**, not per-agency
- `trips.title`, `trips.destination_place_id` → places
- `hidden_gems.operator_id` **nullable** (null = public/platform gem); `hidden_gems.place_id` required → places
  - Tenant filter: `(operator_id IS NULL OR operator_id = :operatorId)` (+ place subtree for catalog queries)
- `itinerary_days.place_id` optional (day area focus)
- `itinerary_items.sort_order`, `document_id` FK → `user_documents`
- `user_documents.extracted_data` jsonb (OCR later); files on Nest `uploads/`
- `trip_messages` — agency one-way board posts on managed trips (`kind`: alert | info | notice)
- `notifications` — in-app traveler inbox (`type`: trip_message | vault_document; `read_at` nullable)
- Phase 4 tables: `trip_travelers`, `invites` (see migrations)

```sql
-- Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Operators (Tenants)
CREATE TABLE operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (Travelers & Admins)
-- Roles: 'superadmin' | 'agency_manager' | 'agency_agent' | 'traveler'
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) DEFAULT 'traveler',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE traveler_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    address VARCHAR(512),
    city VARCHAR(255),
    country VARCHAR(255),
    phone VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hierarchical geography (platform-owned): country → region/city → area
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50) NOT NULL,
    parent_id UUID REFERENCES places(id) ON DELETE CASCADE,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    destination VARCHAR(255) NOT NULL,
    destination_place_id UUID REFERENCES places(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hidden Gems (public when operator_id IS NULL; else operator-specific)
CREATE TABLE hidden_gems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    neighborhood VARCHAR(100),
    tags TEXT[],
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itineraries (per-user plan on a trip)
CREATE TABLE itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    theme VARCHAR(255),
    place_id UUID REFERENCES places(id) ON DELETE SET NULL
);

CREATE TABLE itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID REFERENCES itinerary_days(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_slot VARCHAR(50),
    location_name VARCHAR(255),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    gem_id UUID REFERENCES hidden_gems(id) ON DELETE SET NULL,
    document_id UUID REFERENCES user_documents(id) ON DELETE SET NULL,
    sort_order INT DEFAULT 0 NOT NULL,
    is_customized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    file_url TEXT NOT NULL,
    raw_text TEXT,
    extracted_data JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chunk_content TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_gems_embedding ON hidden_gems USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_doc_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

Also: `trip_travelers`, `invites` (Phase 4). Canonical source: Drizzle migrations in `packages/db/drizzle/`.

---

## 6. Multi-Agent System Architecture & Prompting Rules

### A. Supervisor Agent (Orchestrator)

- **Goal:** Classifies input intent and routes request parameters to execution tools.
- **System Directive:** Analyze user query $Q$. Determine if $Q$ requires:
  1. Multi-day planning or daily customization → Route to `ItineraryPlannerAgent`.
  2. Personal Document Info → Route to `DocumentAgent`.
  3. Single Experience/Recommendation → Route to `CuratorAgent`.

### B. Itinerary Planner Agent (Daily Planner)

- **Goal:** Constructs multi-day trip schedules with explicit slots for activities, meals, drinks, and hidden gems.
- **System Directive:**
  1. Create structured days ($1 \dots N$).
  2. For every day, assign 4 core blocks: **Morning Activity**, **Lunch (Eat)**, **Afternoon Exploration (Hidden Gem)**, and **Evening (Drink/Nightlife)**.
  3. Ensure geographic clustering (all items in a single day should be within logical walking/short transit distance).
  4. Priority ordering: Insert `hidden_gems` matching `(operator_id IS NULL OR operator_id = current_operator)` first before calling `ScraperAgent` for generic gap filling.

### C. Curator Agent (Operator DB Search)

- **Goal:** Executes vector similarity search on `hidden_gems`.
- **System Directive:** Search vector database using query embeddings. Enforce multi-tenant visibility `(operator_id IS NULL OR operator_id = current_user_operator_id)` (and place scope). Return top matching gems. Label operator-owned matches as **"Certified Operator Recommendations"**; null-`operator_id` as platform/public.

### D. Scraper Agent (Live Web Search)

- **Goal:** Fetches real-time recommendations from non-API web sources using Firecrawl.
- **System Directive:** If Curator Agent results are insufficient or user explicitly asks for "live/today" events, query Firecrawl API for web markdown. Extract current local events, open status, and trending vibes. Mark output as **"Discovered on the Web"**.

### E. Document Agent (Vault RAG)

- **Goal:** Answers questions based on private user documents.
- **System Directive:** Convert user query into an embedding. Retrieve chunks from `document_chunks` strictly where `user_id = current_user_id`. Never hallucinate policy coverages or flight times—rely strictly on retrieved context.

---

## 7. Developer Agent Setup & Skills (skills.sh)

Before generating codebase files, run these setup commands to equip your workspace with developer skills:

```bash
# Terminal Commands for Developer Setup
npx skills add senior-frontend      # Next.js 15, Tailwind CSS, & Capacitor patterns
npx skills add senior-backend       # NestJS, BullMQ, & Postgres best practices
npx skills add code-review          # Code quality, security, and tenant check guardrails
npx skills add ui-design-system     # Generative UI & Shadcn component generation
```

**Custom Workspace Skill (`.cursor/skills/travel-multi-tenant-rag/`):**

```markdown
# Skill: Travel Multi-Tenant Security & Agent Rules

## Tenant Isolation Rules

1. Every Postgres query touching `hidden_gems` MUST include
   `WHERE (operator_id IS NULL OR operator_id = :operatorId)`
   (null operator_id = platform/public gem). Superadmin catalog may omit the operator clause.
2. Every document search against `document_chunks` MUST include `WHERE user_id = :userId`.

## Itinerary Generation Rules

- Always structure itineraries with clear tags: [Activity], [Eat], [Drink], [Hidden Gem].
- Present Operator DB results first with higher UI prominence.
- Format outputs into JSON schemas consumable by the ItineraryTimeline Generative UI component.
```

---

## 8. Implementation Roadmap — Working POC (Phases 1–5)

**Standing rule through Phase 5:** mock LLM only. LangGraph + Vercel AI SDK use a swappable `MockLLM` adapter (hardcoded text + tool calls). No OpenAI/Anthropic network calls. No OCR workers, Firecrawl, or live Stripe.

**Chat transport:** NestJS SSE compatible with AI SDK `useChat`. Do **not** add Next.js Route Handlers in `client-app` (Capacitor static export).

### Phase 1: Workspace & Monorepo Initialization — DONE

Turborepo with `apps/client-app` (Next.js + Capacitor static export), `apps/admin-portal`, `apps/api-server` (NestJS), packages (`db`, `ui`, `agent-core`, `config`). Postgres + pgvector + Redis via Docker Compose. Drizzle schema/migration for §5 core tables.

### Phase 2: Traveler UI & Registration (`apps/client-app`) — DONE (POC)

- **2.1** Landing, dual-path registration (B2C mock Stripe + B2B invite code), login; session via JWT in `localStorage`.
- **2.2** Phone-frame shell + bottom nav (Dashboard, Trips, Vault, Chat); Vault UI; Trip CRUD + day timeline + vault attach; mock chat with generative tool bubbles (`showTicket`, `generateItineraryTimeline`).

Static-export constraint: trip detail uses query params (e.g. `/app/trips/detail?tripId=`), not dynamic path segments requiring `generateStaticParams` for runtime IDs.

### Phase 3: Backend Infrastructure & E2E Mocked Pipeline — DONE (POC)

- **3.1** Drizzle migrate + seed (stable UUIDs); Nest REST: trips, vault documents, itinerary by trip; tenant filters.
- **3.2** `packages/agent-core` LangGraph nodes (Supervisor, ItineraryPlanner, Curator, DocumentAgent) behind MockLLM; Nest SSE chat; client SWR + `useChat` rendering generative cards from streamed tools.

### Phase 4: B2B Agency Dashboard & RBAC — DONE (POC)

- **4.1** Roles `superadmin` | `agency_manager` | `agency_agent` | `traveler`; `trips.operator_id`, `trip_travelers`, `invites`; Nest RBAC guards + agency/staff/trip/client endpoints.
- **4.2** `admin-portal` desktop UI; agencies, staff, trips, invite link → `client-app/register?code=…`.

### Phase 5: Auth, Places/Gems, Editable Ops — IN PROGRESS

Replaces Phase 3–4 mock identity with real JWT while keeping MockLLM.

- **5.1 Auth:** Nest `POST /auth/login|signup|register-invite`; global `JwtAuthGuard` + `RolesGuard`; Bearer JWT (`sub`, `email`, `role`, `operatorId`). Admin + traveler portals store token + user in `localStorage` (no header mock IDs / admin role switcher).
- **5.2 Places:** Shared geography tree (`country` → `region`/`city` → `area`). Superadmin CRUD; agencies browse/pick only. Admin UI tree browse with kind filter correlated to active node.
- **5.3 Gems:** Admin list/create/patch/delete; `place_id` required; visibility `(operator_id IS NULL OR operator_id = :agency)` (+ place subtree). Platform vs agency scope filters for superadmin.
- **5.4 Trips & itinerary:** Editable trip title / destination / date range; agency-scoped lists (superadmin sees all agency trips). Day items: required time, location, notes; sort by time; add-from-gem. Traveler trip detail works under static export.
- **5.5 People:** Staff (`agency_manager` / `agency_agent`) separate from agency **clients** (`traveler` with `operator_id`). Role-scoped admin dashboard counts.
- **5.6 List UX:** Server-side pagination + debounced search (`page`, `pageSize`, `search` → Nest `PageResult { items, total, page, pageSize, pageCount }`). Filters (role, kind, category, place, parentId) applied in SQL, not client-side.
- **5.7 Tooling:** Root Prettier + husky/lint-staged; api-server unit specs + light e2e for auth/ACL/gems/itinerary writes.
- **5.7b Ops catch-up (shipped):** Traveler personal trip edit/delete; `POST /trips/:id/copy` (vault docs duplicated); agency trip clients paginated + per-traveler vault admin UI; traveler vault Save / ticket / attach / delete; attachment viewer modal (client + admin); day `place_id` + gem day scope; dashboard **Upcoming trips** / day plan / **Documents you’ll need** with show-more; chat Upload/Ask stubs removed (SSE chat only).
- **5.8 Message board & in-app notifications:** Agency staff post `trip_messages` on managed trips; fan-out to party `notifications`; agency vault upload → `vault_document` notification; traveler header bell + `/app/notifications` (mark one / mark all read); trip detail message board (`?panel=board`); vault deep link `?docId=`. **Push delivery remains §9.**

**Local bootstrap (`pnpm start:dev`):** ensure `.env` → Docker healthy → migrate → **seed only if DB has no users** (preserves local data) → `turbo run dev`. Force wipe+reseed: `pnpm start:dev -- --seed` or `pnpm db:seed`. Skip seed: `--no-seed`.

**POC + Phase 5 outcome:** traveler + admin on Nest/Postgres with JWT; places/gems/itinerary editable; in-app trip board + notifications; MockLLM chat — ready for §9 real providers / itinerary enrichment / OCR / billing / push.

---

## 9. Future Roadmap (Post–Phase 5 — Out of Scope Until Explicitly Started)

Three distinct **AI product outcomes** (do not collapse into “just chat + RAG”):

| AI outcome                      | What it delivers                                                                                                                                                                                                                                                                                                                                       | Depends on                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| **Concierge chat LLM**          | Real models behind Nest SSE chat (replace `MockLLM`)                                                                                                                                                                                                                                                                                                   | Provider keys + swap at MockLLM boundary                          |
| **Vault intelligence**          | OCR → `document_chunks` → DocumentAgent RAG answers                                                                                                                                                                                                                                                                                                    | BullMQ workers, embeddings                                        |
| **Itinerary enrichment agents** | When creating/editing a day plan (admin + traveler), `ItineraryPlannerAgent` + `CuratorAgent` (+ optional `ScraperAgent`) propose programs/activities and write structured `itinerary_items` — operator gems first, live web gap-fill second. **Not chat-only** — wired into trip/itinerary UX (suggest day / fill gaps / enrich stops). Behavior: §6. | Real LLM + gem embeddings; Firecrawl only if live fill is enabled |

| Future area                                               | Why later                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Real LLM providers (OpenAI / Anthropic) + real embeddings | Working POC still uses `MockLLM` swap point only                        |
| Gem embed-on-save / vector ingest workers                 | Admin gem CRUD exists; embeddings not computed on write yet             |
| Itinerary enrichment agentic layer (Planner + Curator UX) | Manual itinerary + add-from-gem today; agents not invoked on trip build |
| Firecrawl / live web scraper agent                        | Optional gap-fill after Curator; MockLLM curator stubs today            |
| BullMQ OCR pipeline → `document_chunks` / RAG answers     | Redis in Compose but idle; vault stores files/metadata only             |
| Hosted auth (Auth0 / NextAuth / cookie sessions)          | Local JWT + bcrypt is current; hosted IdP still later                   |
| Live Stripe Checkout / billing                            | Registration Path A is UI mock                                          |
| Capacitor offline SQLite / offline maps                   | Online stack first                                                      |
| Shared `packages/ui` Shadcn extract                       | Per-app components until design stabilizes                              |
| White-label brand theming per operator                    | `brand_config` column exists; UI not driven by it yet                   |
| Generative UI beyond ticket + timeline cards              | Map cards, swap/drag itinerary, emergency cards = later                 |
| Push notifications / GPS “up next”                        | In-app notifications exist; device push still later                     |

Suggested next order (flexible): **real LLM swap-in → gem embeddings → itinerary enrichment UX → OCR/RAG workers →** hosted auth/billing → push → offline/native polish.
