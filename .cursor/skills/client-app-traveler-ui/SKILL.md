---
name: client-app-traveler-ui
description: Traveler client-app conventions — phone-frame shell, JWT session, Nest Bearer auth, Capacitor static export. Use when editing apps/client-app. Also read skill working-poc.
---

# Traveler client (`apps/client-app`)

Also follow skill `working-poc` for phase gates and seed IDs.

## Layout

- Public: `/`, `/login`, `/register`
- Auth shell: `/app/*` with bottom nav + centered phone frame on desktop (`max-w-[430px]`)
- Safe areas: `env(safe-area-inset-*)`, min touch 44px
- Brand tokens / fonts: `globals.css` (teal primary + Fraunces/DM Sans)

## Auth (Phase 5)

- Session in `localStorage` key `tb:session:v1` (`src/lib/auth.ts`) — stores `accessToken` + user fields (`userId`, `email`, `role`, `operatorId`, `name`, `plan`)
- Build session via `sessionFromAuth()` after Nest auth responses
- Login: `POST /auth/login` · Signup: `POST /auth/signup` · Invite: `POST /auth/register-invite`
- API calls send `Authorization: Bearer <token>` only (`src/lib/api.ts` — `apiHeaders` / `authHeaders`); no `x-user-id` / `x-operator-id` / `x-user-role`
- Demo seed password: `password123` (e.g. `solo@travelbug.demo` owns Paris trip)

## Data

- Prefer Nest `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) via SWR — no mock data fallbacks
- Dashboard (`/app`): **Upcoming trips** (ongoing + upcoming, show 2 + show more); primary trip day plan (show 2 stops + show more); **Documents you’ll need** (show 2 + show more) = vault docs on upcoming day items + other trip vault docs
- Header **bell** → `/app/notifications` with unread balloon (`GET /notifications/unread-count`); mark one / mark all read
- Notification taps: `trip_message` → `/app/trips/detail?tripId=&panel=board`; `vault_document` → `/app/vault?docId=`
- Vault: pick file then **Save document** (like admin); categories include `ticket`; deep-link highlight/open via `?docId=`
- Trip day items: travelers can **Attach from Vault** even on agency (read-only) trips; `PATCH /itinerary/items/:id` with only `{ documentId }` is allowed with trip read access
- Chat: `@ai-sdk/react` `useChat` + `DefaultChatTransport` → Nest `POST /chat` with Bearer headers
- Tool names: `showTicket`, `generateItineraryTimeline` (`src/components/generative/cards.tsx`)
- Shared contracts: `src/lib/types.ts`
- Trip detail: `/app/trips/detail?tripId=` (query param — static export cannot prebuild unknown path ids)
  - **Agency trips** (`operatorId` set): read-only; **Message board** section; **Copy to my trips** → `POST /trips/:id/copy` (itinerary + vault docs duplicated onto personal trip; agency originals kept)
  - **Personal trips** (`operatorId` null): edit title/dates; itinerary title/status; create itinerary, add days, custom items / from-gem / suggest-from-gems; edit + delete items; vault attach; **Delete trip** (`DELETE /trips/:id`)
  - List: optional title on create; Delete on personal trips only
  - Traveler `POST /trips` always creates personal trips (`operatorId: null`) even for agency-linked clients
  - Uses `apiGet|Post|Patch|Delete` against Nest trip + itinerary routes

## Constraints

- Keep `output: "export"` + `images.unoptimized`
- Avoid dynamic path segments for runtime ids; use query params (or seed-only `generateStaticParams`)
