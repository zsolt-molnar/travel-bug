import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import {
  itineraries,
  itineraryDays,
  itineraryItems,
  userDocuments,
} from '@travel-bug/db';
import { z } from 'zod';
import {
  assertTripAccess,
  assertTripWriteAccess,
  listGemsForScope,
  resolveDayGemScope,
  usedGemIdsOnItinerary,
} from '../../auth/acl';
import { Identity, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';

const createItinerarySchema = z.object({
  tripId: z.string().uuid(),
  title: z.string().min(1).optional(),
  createFirstDay: z.boolean().optional(),
});

const patchItinerarySchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
});

const createDaySchema = z.object({
  dayNumber: z.number().int().positive(),
  date: z.string().min(1),
  theme: z.string().nullable().optional(),
  placeId: z.string().uuid().nullable().optional(),
});

const patchDaySchema = createDaySchema.partial();

/** 24h HH:MM — matches HTML `<input type="time">` values. */
const timeSlotSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'timeSlot must be HH:MM');

const createItemSchema = z.object({
  itemType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  timeSlot: timeSlotSchema,
  locationName: z.string().nullable().optional(),
  locationLat: z.string().optional(),
  locationLng: z.string().optional(),
  gemId: z.string().uuid().nullable().optional(),
  documentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

const patchItemSchema = createItemSchema.partial();

const fromGemSchema = z.object({
  gemId: z.string().uuid(),
  timeSlot: timeSlotSchema,
  sortOrder: z.number().int().optional(),
});

const suggestSchema = z.object({
  limit: z.number().int().positive().max(20).optional(),
  category: z.string().optional(),
  apply: z.boolean().optional(),
});

@Controller('itinerary')
export class ItineraryController {
  constructor(private readonly dbService: DbService) {}

  private async dayWithTripAccess(
    identity: RequestIdentity,
    dayId: string,
    opts?: { write?: boolean },
  ) {
    const [day] = await this.dbService.db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.id, dayId))
      .limit(1);
    if (!day) throw new NotFoundException('Day not found');
    const [itin] = await this.dbService.db
      .select()
      .from(itineraries)
      .where(eq(itineraries.id, day.itineraryId))
      .limit(1);
    if (!itin) throw new NotFoundException('Itinerary not found');
    if (opts?.write) {
      await assertTripWriteAccess(this.dbService.db, identity, itin.tripId);
    } else {
      await assertTripAccess(this.dbService.db, identity, itin.tripId);
    }
    return { day, itin };
  }

  private async itemWithTripAccess(
    identity: RequestIdentity,
    itemId: string,
    opts?: { write?: boolean },
  ) {
    const [item] = await this.dbService.db
      .select()
      .from(itineraryItems)
      .where(eq(itineraryItems.id, itemId))
      .limit(1);
    if (!item) throw new NotFoundException('Item not found');
    return { item, ...(await this.dayWithTripAccess(identity, item.dayId, opts)) };
  }

  @Post()
  async create(@Identity() identity: RequestIdentity, @Body() raw: unknown) {
    const body = createItinerarySchema.parse(raw);
    const trip = await assertTripWriteAccess(this.dbService.db, identity, body.tripId);

    const existing = await this.dbService.db
      .select()
      .from(itineraries)
      .where(eq(itineraries.tripId, body.tripId))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }

    const ownerId = identity.role === 'traveler' ? identity.userId : trip.userId;

    const [itin] = await this.dbService.db
      .insert(itineraries)
      .values({
        tripId: body.tripId,
        userId: ownerId,
        title: body.title ?? `${trip.title || trip.destination} itinerary`,
        status: 'active',
      })
      .returning();

    if (body.createFirstDay !== false) {
      await this.dbService.db.insert(itineraryDays).values({
        itineraryId: itin.id,
        dayNumber: 1,
        date: trip.startDate,
        theme: 'Day 1',
        placeId: trip.destinationPlaceId ?? null,
      });
    }

    return itin;
  }

  @Get(':tripId')
  async byTrip(@Identity() identity: RequestIdentity, @Param('tripId') tripId: string) {
    await assertTripAccess(this.dbService.db, identity, tripId);

    const [itin] = await this.dbService.db
      .select()
      .from(itineraries)
      .where(and(eq(itineraries.tripId, tripId), eq(itineraries.userId, identity.userId)))
      .limit(1);

    // Agency/superadmin OR traveler viewing agency plan: fall back to any itinerary on the trip
    let resolved = itin;
    if (!resolved) {
      const [anyItin] = await this.dbService.db
        .select()
        .from(itineraries)
        .where(eq(itineraries.tripId, tripId))
        .limit(1);
      resolved = anyItin;
    }

    if (!resolved) {
      return { tripId, days: [] };
    }

    const days = await this.dbService.db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.itineraryId, resolved.id))
      .orderBy(asc(itineraryDays.dayNumber));

    const result = [];
    for (const day of days) {
      const items = await this.dbService.db
        .select()
        .from(itineraryItems)
        .where(eq(itineraryItems.dayId, day.id))
        .orderBy(asc(itineraryItems.timeSlot), asc(itineraryItems.sortOrder));
      result.push({
        id: day.id,
        dayNumber: day.dayNumber,
        date: day.date,
        theme: day.theme,
        placeId: day.placeId,
        items: items.map((i) => ({
          id: i.id,
          dayNumber: day.dayNumber,
          date: day.date,
          timeSlot: i.timeSlot,
          itemType: i.itemType,
          title: i.title,
          description: i.description,
          locationName: i.locationName,
          locationLat: i.locationLat,
          locationLng: i.locationLng,
          gemId: i.gemId,
          documentId: i.documentId,
          sortOrder: i.sortOrder,
          isCustomized: i.isCustomized,
        })),
      });
    }

    return {
      tripId,
      itineraryId: resolved.id,
      title: resolved.title,
      status: resolved.status,
      days: result,
    };
  }

  @Patch(':itineraryId')
  async patchItinerary(
    @Identity() identity: RequestIdentity,
    @Param('itineraryId') itineraryId: string,
    @Body() raw: unknown,
  ) {
    const body = patchItinerarySchema.parse(raw);
    const [itin] = await this.dbService.db
      .select()
      .from(itineraries)
      .where(eq(itineraries.id, itineraryId))
      .limit(1);
    if (!itin) throw new NotFoundException();
    await assertTripWriteAccess(this.dbService.db, identity, itin.tripId);
    const [row] = await this.dbService.db
      .update(itineraries)
      .set({
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      })
      .where(eq(itineraries.id, itineraryId))
      .returning();
    return row;
  }

  @Post(':itineraryId/days')
  async addDay(
    @Identity() identity: RequestIdentity,
    @Param('itineraryId') itineraryId: string,
    @Body() raw: unknown,
  ) {
    const body = createDaySchema.parse(raw);
    const [itin] = await this.dbService.db
      .select()
      .from(itineraries)
      .where(eq(itineraries.id, itineraryId))
      .limit(1);
    if (!itin) throw new NotFoundException();
    await assertTripWriteAccess(this.dbService.db, identity, itin.tripId);
    const [row] = await this.dbService.db
      .insert(itineraryDays)
      .values({
        itineraryId,
        dayNumber: body.dayNumber,
        date: body.date,
        theme: body.theme,
        placeId: body.placeId ?? null,
      })
      .returning();
    return row;
  }

  @Patch('days/:dayId')
  async patchDay(
    @Identity() identity: RequestIdentity,
    @Param('dayId') dayId: string,
    @Body() raw: unknown,
  ) {
    const body = patchDaySchema.parse(raw);
    await this.dayWithTripAccess(identity, dayId, { write: true });
    const [row] = await this.dbService.db
      .update(itineraryDays)
      .set({
        ...(body.dayNumber !== undefined ? { dayNumber: body.dayNumber } : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.theme !== undefined ? { theme: body.theme } : {}),
        ...(body.placeId !== undefined ? { placeId: body.placeId } : {}),
      })
      .where(eq(itineraryDays.id, dayId))
      .returning();
    return row;
  }

  @Delete('days/:dayId')
  async deleteDay(@Identity() identity: RequestIdentity, @Param('dayId') dayId: string) {
    await this.dayWithTripAccess(identity, dayId, { write: true });
    await this.dbService.db.delete(itineraryDays).where(eq(itineraryDays.id, dayId));
    return { ok: true };
  }

  @Post('days/:dayId/items')
  async addItem(
    @Identity() identity: RequestIdentity,
    @Param('dayId') dayId: string,
    @Body() raw: unknown,
  ) {
    const body = createItemSchema.parse(raw);
    await this.dayWithTripAccess(identity, dayId, { write: true });
    const [row] = await this.dbService.db
      .insert(itineraryItems)
      .values({
        dayId,
        itemType: body.itemType,
        title: body.title,
        description: body.description,
        timeSlot: body.timeSlot,
        locationName: body.locationName,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        gemId: body.gemId ?? null,
        documentId: body.documentId ?? null,
        sortOrder: body.sortOrder ?? 0,
        isCustomized: identity.role === 'traveler',
      })
      .returning();
    return row;
  }

  @Post('days/:dayId/items/from-gem')
  async fromGem(
    @Identity() identity: RequestIdentity,
    @Param('dayId') dayId: string,
    @Body() raw: unknown,
  ) {
    const body = fromGemSchema.parse(raw);
    const { day, itin } = await this.dayWithTripAccess(identity, dayId, { write: true });
    const scope = await resolveDayGemScope(this.dbService.db, itin.tripId, day.id);
    const catalog = await listGemsForScope(this.dbService.db, {
      placeId: scope.placeId,
      operatorId: scope.operatorId,
    });
    const gem = catalog.find((g) => g.id === body.gemId);
    if (!gem) throw new BadRequestException('Gem not in available catalog');

    const [row] = await this.dbService.db
      .insert(itineraryItems)
      .values({
        dayId,
        itemType:
          gem.category === 'eat' || gem.category === 'drink'
            ? gem.category
            : 'hidden_gem',
        title: gem.title,
        description: gem.description,
        timeSlot: body.timeSlot,
        locationName: gem.neighborhood ?? undefined,
        locationLat: gem.locationLat ?? undefined,
        locationLng: gem.locationLng ?? undefined,
        gemId: gem.id,
        sortOrder: body.sortOrder ?? 0,
        isCustomized: false,
      })
      .returning();
    return row;
  }

  @Post('days/:dayId/items/suggest-from-gems')
  async suggest(
    @Identity() identity: RequestIdentity,
    @Param('dayId') dayId: string,
    @Body() raw: unknown,
  ) {
    const body = suggestSchema.parse(raw ?? {});
    const write = body.apply === true;
    const { day, itin } = await this.dayWithTripAccess(identity, dayId, { write });
    const scope = await resolveDayGemScope(this.dbService.db, itin.tripId, day.id);
    const catalog = await listGemsForScope(this.dbService.db, {
      placeId: scope.placeId,
      operatorId: scope.operatorId,
      category: body.category,
    });
    const used = await usedGemIdsOnItinerary(this.dbService.db, itin.id);
    const suggested = catalog.filter((g) => !used.has(g.id)).slice(0, body.limit ?? 5);

    if (!body.apply) {
      return { gems: suggested, applied: [] };
    }

    const existing = await this.dbService.db
      .select()
      .from(itineraryItems)
      .where(eq(itineraryItems.dayId, dayId));
    let sortOrder = existing.reduce((max, i) => Math.max(max, i.sortOrder ?? 0), -1);
    const usedSlots = new Set(
      existing.map((i) => i.timeSlot).filter((s): s is string => Boolean(s)),
    );
    const defaultSlots = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
    const applied = [];
    for (const gem of suggested) {
      sortOrder += 1;
      const timeSlot =
        defaultSlots.find((s) => !usedSlots.has(s)) ??
        `${String(10 + (sortOrder % 12)).padStart(2, '0')}:00`;
      usedSlots.add(timeSlot);
      const [row] = await this.dbService.db
        .insert(itineraryItems)
        .values({
          dayId,
          itemType:
            gem.category === 'eat' || gem.category === 'drink'
              ? gem.category
              : 'hidden_gem',
          title: gem.title,
          description: gem.description,
          timeSlot,
          locationName: gem.neighborhood ?? undefined,
          locationLat: gem.locationLat ?? undefined,
          locationLng: gem.locationLng ?? undefined,
          gemId: gem.id,
          sortOrder,
          isCustomized: false,
        })
        .returning();
      applied.push(row);
    }
    return { gems: suggested, applied };
  }

  @Patch('items/:itemId')
  async patchItem(
    @Identity() identity: RequestIdentity,
    @Param('itemId') itemId: string,
    @Body() raw: unknown,
  ) {
    const body = patchItemSchema.parse(raw);
    const keys = Object.keys(body).filter(
      (k) => body[k as keyof typeof body] !== undefined,
    );
    const docAttachOnly =
      identity.role === 'traveler' && keys.length === 1 && keys[0] === 'documentId';

    // Travelers may attach/detach their own vault docs on agency (read-only) trips
    const { itin } = docAttachOnly
      ? await this.itemWithTripAccess(identity, itemId, { write: false })
      : await this.itemWithTripAccess(identity, itemId, { write: true });

    if (docAttachOnly && body.documentId) {
      const [doc] = await this.dbService.db
        .select()
        .from(userDocuments)
        .where(eq(userDocuments.id, body.documentId))
        .limit(1);
      if (!doc || doc.userId !== identity.userId || doc.tripId !== itin.tripId) {
        throw new BadRequestException('Document must be in your vault for this trip');
      }
    }

    const [row] = await this.dbService.db
      .update(itineraryItems)
      .set({
        ...(body.itemType !== undefined ? { itemType: body.itemType } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.timeSlot !== undefined ? { timeSlot: body.timeSlot } : {}),
        ...(body.locationName !== undefined ? { locationName: body.locationName } : {}),
        ...(body.locationLat !== undefined ? { locationLat: body.locationLat } : {}),
        ...(body.locationLng !== undefined ? { locationLng: body.locationLng } : {}),
        ...(body.gemId !== undefined ? { gemId: body.gemId } : {}),
        ...(body.documentId !== undefined ? { documentId: body.documentId } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        isCustomized: identity.role === 'traveler' ? true : undefined,
      })
      .where(eq(itineraryItems.id, itemId))
      .returning();
    return row;
  }

  @Delete('items/:itemId')
  async deleteItem(
    @Identity() identity: RequestIdentity,
    @Param('itemId') itemId: string,
  ) {
    await this.itemWithTripAccess(identity, itemId, { write: true });
    await this.dbService.db.delete(itineraryItems).where(eq(itineraryItems.id, itemId));
    return { ok: true };
  }
}
