---
name: client-app-traveler-ui
description: Traveler client-app conventions — phone-frame shell, mock session, Nest API headers, Capacitor static export. Use when editing apps/client-app. Also read skill working-poc.
---

# Traveler client (`apps/client-app`)

Also follow skill `working-poc` for phase gates and seed IDs.

## Layout

- Public: `/`, `/login`, `/register`
- Auth shell: `/app/*` with bottom nav + centered phone frame on desktop (`max-w-[430px]`)
- Safe areas: `env(safe-area-inset-*)`, min touch 44px
- Brand tokens / fonts: `globals.css` (teal primary + Fraunces/DM Sans)

## Auth (POC)

- Session in `localStorage` key `tb:session:v1` (`src/lib/auth.ts`)
- API calls send `x-user-id`, `x-operator-id`, `x-user-role` (see `src/lib/api.ts`)
- Invite codes: `AGENCY2026`, `PARIS-VIP` (`VALID_INVITE_CODES`)

## Data

- Prefer Nest `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) via SWR
- Chat: `@ai-sdk/react` `useChat` + `DefaultChatTransport` → Nest `POST /chat`
- Tool names: `showTicket`, `generateItineraryTimeline` (`src/components/generative/cards.tsx`)
- Shared contracts: `src/lib/types.ts`

## Constraints

- Keep `output: "export"` + `images.unoptimized`
- Dynamic routes need `generateStaticParams` for static export
