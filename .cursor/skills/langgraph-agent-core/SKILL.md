---
name: langgraph-agent-core
description: LangGraph agent conventions for packages/agent-core and apps/api-server/src/agents. Use when implementing multi-agent itinerary/RAG flows. Phase 3+ uses MockLLM; real providers are ARCHITECTURE §9.
---

# LangGraph / agent-core

## Locations

- Shared graphs/tools/builders: `packages/agent-core`
- Nest orchestration: `apps/api-server/src/agents` (or modules that call agent-core)

## Agents (ARCHITECTURE.md §6)

- Supervisor (intent routing)
- ItineraryPlanner
- Curator (operator `hidden_gems`; filter `operator_id`)
- Document / Vault RAG (filter `user_id`)
- Scraper (Firecrawl) — **post-POC only** (§9)

**Itinerary enrichment** (Planner + Curator → structured day items in trip UX) is a distinct §9 product outcome from chat tools and vault RAG. Do not treat MockLLM `generateItineraryTimeline` chat cards as enrichment.

## Phase gate

- **Working POC:** LangGraph with a **MockLLM** adapter for Nest `POST /chat`. Yield tool calls (`showTicket`, `generateItineraryTimeline`). No OpenAI/Anthropic network requests. Itinerary UI is manual + add-from-gem only.
- **§9 Future:** swap MockLLM for real providers; gem embeddings; wire Planner/Curator into itinerary create/edit; OCR/RAG; optional Scraper.

## Tool / generative UI contracts

Do not rename without updating client generative cards:

- `showTicket` — museum/ticket pass card payload
- `generateItineraryTimeline` — day timeline card payload

Client chat: Nest `POST /chat` AI SDK data stream (not Next Route Handlers).
