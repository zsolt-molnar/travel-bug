---
name: admin-portal-ui
description: B2B admin-portal conventions — role switcher mock auth, Nest agency RBAC headers, agencies/trips/staff UI. Use when editing apps/admin-portal.
---

# Admin portal (`apps/admin-portal`)

Desktop-first Next.js app on **port 3002** (`next dev --port 3002`).

## Mock auth (POC)

- Role switcher in sidebar stores `tb:admin-role:v1` in `localStorage`
- Identities: `src/lib/admin-api.ts` → `DEMO_IDENTITIES` (stable seed UUIDs)
- Every API call sends `x-user-id` / `x-operator-id` / `x-user-role` via `adminHeaders()`

## Routes

| Path | Roles |
|------|--------|
| `/` | all |
| `/agencies` | `superadmin` |
| `/staff` | `agency_manager` |
| `/trips` | agency + superadmin |
| `/trips/[tripId]` | clients + invite copy link |

## API (Nest)

- `GET|POST /agencies` — superadmin
- `GET|POST /agencies/staff` — manager creates `agency_agent`
- `GET|POST /agencies/trips`
- `GET|POST /agencies/trips/:tripId/clients` — link user or create pending invite

Invite link target: `{NEXT_PUBLIC_CLIENT_APP_URL}/register?code=…`

## Env

- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3000`

## UI notes

- Sidebar shell: `src/components/admin-shell.tsx`
- Prefer tables/forms over mobile phone-frame (traveler app owns that pattern)
- RBAC UI visibility is client-side; **server enforcement** is Nest `RolesGuard` — never rely on hiding tabs alone
