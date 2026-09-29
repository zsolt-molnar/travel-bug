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
   - Operator logs into the Admin Portal and inputs curated "Hidden Gems" (text, photos, locations, tags like *Quiet, Craft Beer, Local Only, Rooftop*), or uploads itinerary PDFs.
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

1. **Trip Initialization:** Traveler submits target destination and date range (e.g., *"5 days in Tokyo, love craft cocktails and hidden alleyways"*).
2. **Itinerary Agent Execution (Plan-and-Execute Pattern):**
   - **Step A (Skeleton Construction):** Itinerary Agent queries `user_documents` to pull hotel check-in/checkout times and flight schedules to lock in constraint blocks.
   - **Step B (Operator Gem Clustering):** Curator Agent runs vector search on `hidden_gems` matching the destination, grouping recommendations by geographic proximity (neighborhood clusters).
   - **Step C (Meal & Drink Synthesis):** Scraper Agent fills gaps for trending local food/drink spots (e.g., breakfast, lunch, aperitivo, dinner, late-night drink) for each day.
3. **Rendering & DB Persistence:**
   - System writes the structure to `itineraries`, `itinerary_days`, and `itinerary_items` tables.
   - Streams a rich **Interactive Itinerary Timeline Component** directly into the chat interface.

### 2.4 Flow 4: Interactive Timeline Customization & In-Trip Assistance

1. **Traveler Adjustments:** Traveler taps *"Swap Thursday night drink spot for a jazz bar"* on the timeline card.
2. **Real-time Swap:** `ItineraryAgent` updates `itinerary_items` by searching for an alternative jazz gem in the same neighborhood cluster.
3. **In-Trip Context Push:** Based on current time and GPS location, the app highlights the upcoming activity block (e.g., *"Up Next (8 PM): Hidden Speakeasy - 5 min walk"*).

### 2.5 Flow 5: Document Intelligence & Emergency Concierge

1. **User Prompt:** Traveler asks: *"My bag was stolen. Does my insurance cover this?"*
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
-- POC roles (Phase 4): 'superadmin' | 'agency_manager' | 'agency_agent' | 'traveler'
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'traveler',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips
-- Phase 3: user_id = primary traveler owner.
-- Phase 4 POC adds: operator_id (agency), trip_travelers (M2M), invites (pending clients).
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    destination VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hidden Gems (Human Input - Operator Specific)
CREATE TABLE hidden_gems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID REFERENCES operators(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'eat', 'drink', 'activity', 'view'
    description TEXT NOT NULL,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    neighborhood VARCHAR(100),
    tags TEXT[],
    embedding VECTOR(1536), -- OpenAI text-embedding-3-small dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itineraries
CREATE TABLE itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'draft', 'active', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itinerary Days
CREATE TABLE itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    itinerary_id UUID REFERENCES itineraries(id) ON DELETE CASCADE,
    day_number INT NOT NULL,
    date DATE NOT NULL,
    theme VARCHAR(255) -- e.g., "Historic Center & Underground Jazz Bars"
);

-- Itinerary Items (Activities, Eat, Drink, Gems)
CREATE TABLE itinerary_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_id UUID REFERENCES itinerary_days(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL, -- 'activity', 'eat', 'drink', 'hidden_gem', 'transit'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    time_slot VARCHAR(50), -- 'morning', 'lunch', 'afternoon', 'dinner', 'night'
    location_name VARCHAR(255),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    gem_id UUID REFERENCES hidden_gems(id) ON DELETE SET NULL,
    is_customized BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Documents (Pocket Guide Vault)
CREATE TABLE user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- 'ticket', 'insurance', 'hotel_voucher', 'other'
    file_url TEXT NOT NULL,
    raw_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Document Chunks (for RAG)
CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    chunk_content TEXT NOT NULL,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Vector Search Indexes
CREATE INDEX idx_gems_embedding ON hidden_gems USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_doc_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
```

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
  4. Priority ordering: Insert `hidden_gems` from `operator_id` first before calling `ScraperAgent` for generic gap filling.

### C. Curator Agent (Operator DB Search)

- **Goal:** Executes vector similarity search on `hidden_gems`.
- **System Directive:** Search vector database using query embeddings. You MUST enforce `operator_id = current_user_operator_id`. Return top matching gems. Label matches as **"Certified Operator Recommendations"**.

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
1. Every Postgres query touching `hidden_gems` MUST include `WHERE operator_id = :operatorId`.
2. Every document search against `document_chunks` MUST include `WHERE user_id = :userId`.

## Itinerary Generation Rules
- Always structure itineraries with clear tags: [Activity], [Eat], [Drink], [Hidden Gem].
- Present Operator DB results first with higher UI prominence.
- Format outputs into JSON schemas consumable by the ItineraryTimeline Generative UI component.
```

---

## 8. Implementation Roadmap — Working POC (Phases 1–4)

**Standing rule through Phase 4:** mock LLM only. LangGraph + Vercel AI SDK use a swappable `MockLLM` adapter (hardcoded text + tool calls). No OpenAI/Anthropic network calls. No OCR workers, Firecrawl, or live Stripe.

**Chat transport:** NestJS SSE compatible with AI SDK `useChat`. Do **not** add Next.js Route Handlers in `client-app` (Capacitor static export).

### Phase 1: Workspace & Monorepo Initialization — DONE

Turborepo with `apps/client-app` (Next.js + Capacitor static export), `apps/admin-portal`, `apps/api-server` (NestJS), packages (`db`, `ui`, `agent-core`, `config`). Postgres + pgvector + Redis via Docker Compose. Drizzle schema/migration for §5 core tables.

### Phase 2: Traveler UI & Registration (`apps/client-app`)

- **2.1** Landing, dual-path registration (B2C mock Stripe + B2B invite code), login; mock `localStorage` session.
- **2.2** Phone-frame shell + bottom nav (Dashboard, Trips, Vault, Chat); Vault UI; Trip CRUD + day timeline + vault attach; mock chat with generative tool bubbles (`showTicket`, `generateItineraryTimeline`).

Local React state first; shared types/tool names/invite codes designed for Phase 3–4 swap-in.

### Phase 3: Backend Infrastructure & E2E Mocked Pipeline

- **3.1** Drizzle migrate + seed (stable UUIDs); Nest REST: trips, vault documents (mock file URL), itinerary by trip; mock identity headers + tenant filters.
- **3.2** `packages/agent-core` LangGraph nodes (Supervisor, ItineraryPlanner, Curator, DocumentAgent) behind MockLLM; Nest SSE chat; client SWR/React Query + `useChat` rendering generative cards from streamed tools.

### Phase 4: B2B Agency Dashboard & RBAC

- **4.1** Roles `superadmin` | `agency_manager` | `agency_agent` | `traveler`; `trips.operator_id`, `trip_travelers`, `invites`; Nest RBAC guards + agency/staff/trip/client endpoints.
- **4.2** `admin-portal` desktop UI (role switcher mock auth); agencies, staff, trips, invite link → `client-app/register?code=…`.

**POC outcome:** architecture locked; traveler + admin UIs on real Nest/Postgres; mock-LLM chat/tools — foundation to iterate real business logic.

---

## 9. Future Roadmap (Post-POC — Out of Scope for Phases 1–4)

| Future area | Why later |
|-------------|-----------|
| Real LLM providers (OpenAI / Anthropic) + real embeddings | POC uses `MockLLM` swap point only |
| BullMQ OCR pipeline → `document_chunks` / RAG answers | Redis in Compose but idle; vault stores files/metadata only |
| Firecrawl / live web scraper agent | Curator uses seeded gems + mock responses |
| Operator Hidden Gems ingest UI + embed-on-save | Gems = seed data through Phase 4 |
| Production auth (Auth0 / NextAuth / sessions) | Header mock IDs + admin role switcher only |
| Live Stripe Checkout / billing | Registration Path A is UI mock |
| Capacitor offline SQLite / offline maps | Online POC first |
| Shared `packages/ui` Shadcn extract | Per-app components until design stabilizes |
| White-label brand theming per operator | `brand_config` column exists; UI not driven by it yet |
| Generative UI beyond ticket + timeline cards | Map cards, swap/drag itinerary, emergency cards = later |
| Push notifications / GPS “up next” | In-trip assistance after core chat works |

Suggested Phase 5+ order (flexible): real AI swap-in → OCR/RAG workers → gems ingest → auth/billing → offline/native polish.
