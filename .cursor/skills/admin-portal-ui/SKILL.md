---
name: admin-portal-ui
description: B2B admin-portal conventions — JWT login, Nest Bearer auth, agencies/trips/staff/gems/itinerary UI. Use when editing apps/admin-portal.
---

# Admin portal (`apps/admin-portal`)

Desktop-first Next.js app on **port 3002** (`next dev --port 3002`).

## Auth (JWT)

- Login page: `/login` → `POST /auth/login` `{ email, password }` → store `accessToken` + `user` in `localStorage`
- Keys: `tb:admin-token:v1`, `tb:admin-user:v1` (`src/lib/admin-api.ts`)
- All API calls send `Authorization: Bearer <token>` via `adminHeaders()`
- Portal layout `(portal)` redirects to `/login` when no token; 401 clears session
- Demo: `manager@wanderlust.pro` / `agent@wanderlust.pro` / `superadmin@travelbug.demo` — password `password123`

## Routes

| Path                                 | Roles                                                               |
| ------------------------------------ | ------------------------------------------------------------------- |
| `/login`                             | public                                                              |
| `/`                                  | all authenticated                                                   |
| `/agencies`                          | `superadmin`                                                        |
| `/staff`                             | `agency_manager`, `superadmin`                                      |
| `/clients`                           | `agency_manager`, `superadmin`                                      |
| `/trips`                             | agency + superadmin                                                 |
| `/trips/[tripId]`                    | clients list + itinerary + **message board**; Open traveler → vault |
| `/trips/[tripId]/travelers/[userId]` | traveler detail + agency vault upload/edit/delete                   |
| `/gems`                              | place tree + list/create gems (`placeId` query)                     |

## API (Nest)

- `POST /auth/login` — public
- `GET|POST /agencies`, `PATCH /agencies/:id` — superadmin
- `GET|POST /agencies/staff` — manager (staff only); superadmin list
- `GET /agencies/clients` — manager + superadmin (traveler clients)
- `GET|POST /agencies/trips`
- `GET|POST /agencies/trips/:tripId/clients` — paginated searchable registered travelers (`page`/`pageSize`/`search`); response includes `pending`, `ownerId`, `independent`, `docCount` per item
- `GET /agencies/trips/:tripId/clients/:userId` — traveler on trip detail
- `GET|POST /trips/:tripId/messages` — agency message board (one-way; kinds `alert`|`info`|`notice`)
- `GET /places`, `GET|POST /gems`, `PATCH|DELETE /gems/:id`
- `GET /trips/:tripId/gems`, `GET /itinerary/:tripId`, `POST /itinerary/days/:dayId/items/from-gem`
- `GET /vault/documents?tripId=&userId=` — trip vault filtered by traveler; `POST /vault/documents` multipart with required `userId` for agency; `PATCH|DELETE /vault/documents/:docId`

Invite link target: `{NEXT_PUBLIC_CLIENT_APP_URL}/register?code=…`

## Env

- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `NEXT_PUBLIC_CLIENT_APP_URL=http://localhost:3000`

## UI notes

- Sidebar shell: `src/components/admin-shell.tsx` (user email/role + sign out)
- Prefer tables/forms over mobile phone-frame (traveler app owns that pattern)
- RBAC UI visibility is client-side; **server enforcement** is Nest `RolesGuard` — never rely on hiding tabs alone
