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

## Phase gate

- **Phase 3–4 POC:** implement LangGraph with a **MockLLM** adapter. Yield tool calls (`showTicket`, `generateItineraryTimeline`). No OpenAI/Anthropic network requests.
- **§9 Future:** swap MockLLM for real providers; add embeddings + Scraper.

## Tool / generative UI contracts

Do not rename without updating client generative cards:

- `showTicket` — museum/ticket pass card payload
- `generateItineraryTimeline` — day timeline card payload

Client chat: Nest `POST /chat` AI SDK data stream (not Next Route Handlers).
