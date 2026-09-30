import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import {
  hiddenGems,
  itineraries,
  itineraryDays,
  itineraryItems,
  places,
  tripTravelers,
  trips,
  type Database,
} from '@travel-bug/db';
import type { RequestIdentity } from './identity';

export async function loadTrip(db: Database, tripId: string) {
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) throw new NotFoundException('Trip not found');
  return trip;
}

export async function assertTripAccess(
  db: Database,
  identity: RequestIdentity,
  tripId: string,
) {
  const trip = await loadTrip(db, tripId);
  if (identity.role === 'superadmin') return trip;
  if (identity.role === 'agency_manager' || identity.role === 'agency_agent') {
    if (trip.operatorId && trip.operatorId === identity.operatorId) return trip;
    throw new ForbiddenException('Trip not in your agency');
  }
  if (trip.userId === identity.userId) return trip;
  const [party] = await db
    .select()
    .from(tripTravelers)
    .where(
      and(eq(tripTravelers.tripId, tripId), eq(tripTravelers.userId, identity.userId)),
    )
    .limit(1);
  if (party) return trip;
  throw new ForbiddenException('No access to this trip');
}

/**
 * Write access: agency/superadmin same as read.
 * Travelers may only mutate personal trips (operatorId IS NULL).
 * Agency trips are read-only for travelers — copy first via POST /trips/:id/copy.
 */
export async function assertTripWriteAccess(
  db: Database,
  identity: RequestIdentity,
  tripId: string,
) {
  const trip = await assertTripAccess(db, identity, tripId);
  if (identity.role === 'traveler' && trip.operatorId != null) {
    throw new ForbiddenException(
      'Agency trips are read-only. Copy the trip to your trips to edit.',
    );
  }
  return trip;
}

/** Place id + all descendant place ids (BFS via repeated parent lookup). */
export async function placeSubtreeIds(
  db: Database,
  rootPlaceId: string,
): Promise<string[]> {
  const all = await db.select({ id: places.id, parentId: places.parentId }).from(places);
  const children = new Map<string | null, string[]>();
  for (const p of all) {
    const key = p.parentId ?? null;
    const list = children.get(key) ?? [];
    list.push(p.id);
    children.set(key, list);
  }
  const out: string[] = [];
  const stack = [rootPlaceId];
  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);
    for (const child of children.get(id) ?? []) stack.push(child);
  }
  return out;
}

export function gemVisibilitySql(operatorId: string | null): SQL {
  if (operatorId) {
    return or(isNull(hiddenGems.operatorId), eq(hiddenGems.operatorId, operatorId))!;
  }
  return isNull(hiddenGems.operatorId);
}

export async function listGemsForScope(
  db: Database,
  opts: {
    placeId: string;
    /** Agency: public + that operator. Null: public only. Pass `all: true` for superadmin. */
    operatorId?: string | null;
    allOperators?: boolean;
    category?: string;
  },
) {
  const placeIds = await placeSubtreeIds(db, opts.placeId);
  const conditions: SQL[] = [inArray(hiddenGems.placeId, placeIds)];
  if (!opts.allOperators) {
    conditions.push(gemVisibilitySql(opts.operatorId ?? null));
  }
  if (opts.category) {
    conditions.push(eq(hiddenGems.category, opts.category));
  }
  return db
    .select()
    .from(hiddenGems)
    .where(and(...conditions));
}

export async function resolveDayGemScope(
  db: Database,
  tripId: string,
  dayId?: string,
): Promise<{
  placeId: string;
  operatorId: string | null;
  trip: typeof trips.$inferSelect;
}> {
  const trip = await loadTrip(db, tripId);
  if (!trip.destinationPlaceId) {
    throw new NotFoundException('Trip has no destination place');
  }
  let placeId = trip.destinationPlaceId;
  if (dayId) {
    const [day] = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.id, dayId))
      .limit(1);
    if (day?.placeId) placeId = day.placeId;
  }
  return { placeId, operatorId: trip.operatorId, trip };
}

export async function usedGemIdsOnItinerary(
  db: Database,
  itineraryId: string,
): Promise<Set<string>> {
  const days = await db
    .select({ id: itineraryDays.id })
    .from(itineraryDays)
    .where(eq(itineraryDays.itineraryId, itineraryId));
  if (!days.length) return new Set();
  const items = await db
    .select({ gemId: itineraryItems.gemId })
    .from(itineraryItems)
    .where(
      inArray(
        itineraryItems.dayId,
        days.map((d) => d.id),
      ),
    );
  return new Set(items.map((i) => i.gemId).filter((id): id is string => !!id));
}

export async function loadItineraryForTripUser(
  db: Database,
  tripId: string,
  userId: string,
) {
  const [itin] = await db
    .select()
    .from(itineraries)
    .where(and(eq(itineraries.tripId, tripId), eq(itineraries.userId, userId)))
    .limit(1);
  return itin ?? null;
}

export { sql };
