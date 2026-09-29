---
name: travel-multi-tenant-rag
description: Travel multi-tenant security and itinerary/RAG rules. Use when querying hidden_gems, document_chunks, building itineraries, or any operator/traveler data access.
---

# Skill: Travel Multi-Tenant Security & Agent Rules

## Tenant Isolation Rules

1. Every Postgres query touching `hidden_gems` MUST include `WHERE operator_id = :operatorId`.
2. Every document search against `document_chunks` MUST include `WHERE user_id = :userId`.

## Itinerary Generation Rules

- Always structure itineraries with clear tags: [Activity], [Eat], [Drink], [Hidden Gem].
- Present Operator DB results first with higher UI prominence.
- Format outputs into JSON schemas consumable by the ItineraryTimeline Generative UI component.
