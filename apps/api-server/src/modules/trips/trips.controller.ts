import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import {
  itineraries,
  itineraryDays,
  itineraryItems,
  tripTravelers,
  trips,
  userDocuments,
} from '@travel-bug/db';
import { unlinkSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { z } from 'zod';
import { assertTripAccess, assertTripWriteAccess } from '../../auth/acl';
import { Identity, Roles, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';

const createTripSchema = z
  .object({
    title: z.string().min(1).optional(),
    destination: z.string().min(1),
    destinationPlaceId: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((body, ctx) => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const minStart = `${y}-${m}-${d}`;
    if (body.startDate < minStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'Start date cannot be in the past',
      });
    }
    if (body.endDate <= body.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'End date must be after start date',
      });
    }
  });

const patchTripSchema = z.object({
  title: z.string().min(1).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

function assertTripDates(
  startDate: string,
  endDate: string,
  opts?: { allowPastStart?: boolean },
) {
  if (endDate <= startDate) {
    throw new BadRequestException('End date must be after start date');
  }
  if (!opts?.allowPastStart) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const minStart = `${y}-${m}-${d}`;
    if (startDate < minStart) {
      throw new BadRequestException('Start date cannot be in the past');
    }
  }
}

@Controller('trips')
export class TripsController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  async list(@Identity() identity: RequestIdentity) {
    if (identity.role === 'superadmin') {
      return this.dbService.db.select().from(trips);
    }
    if (
      (identity.role === 'agency_manager' || identity.role === 'agency_agent') &&
      identity.operatorId
    ) {
      return this.dbService.db
        .select()
        .from(trips)
        .where(eq(trips.operatorId, identity.operatorId));
    }

    const owned = await this.dbService.db
      .select()
      .from(trips)
      .where(eq(trips.userId, identity.userId));

    const party = await this.dbService.db
      .select({ trip: trips })
      .from(tripTravelers)
      .innerJoin(trips, eq(tripTravelers.tripId, trips.id))
      .where(eq(tripTravelers.userId, identity.userId));

    const byId = new Map(owned.map((t) => [t.id, t]));
    for (const row of party) byId.set(row.trip.id, row.trip);
    return [...byId.values()];
  }

  @Post()
  async create(@Identity() identity: RequestIdentity, @Body() raw: unknown) {
    const body = createTripSchema.parse(raw);
    // Travelers always own personal trips (editable); staff keep agency operatorId
    const operatorId = identity.role === 'traveler' ? null : identity.operatorId;
    const [row] = await this.dbService.db
      .insert(trips)
      .values({
        userId: identity.userId,
        operatorId,
        title: body.title ?? body.destination,
        destination: body.destination,
        destinationPlaceId: body.destinationPlaceId,
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning();

    await this.dbService.db.insert(tripTravelers).values({
      tripId: row.id,
      userId: identity.userId,
    });

    return row;
  }

  @Get(':tripId')
  async getOne(@Identity() identity: RequestIdentity, @Param('tripId') tripId: string) {
    return assertTripAccess(this.dbService.db, identity, tripId);
  }

  @Patch(':tripId')
  async patch(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Body() raw: unknown,
  ) {
    const body = patchTripSchema.parse(raw);
    if (
      body.title === undefined &&
      body.startDate === undefined &&
      body.endDate === undefined
    ) {
      throw new BadRequestException('Nothing to update');
    }
    const existing = await assertTripWriteAccess(this.dbService.db, identity, tripId);
    const startDate = body.startDate ?? existing.startDate;
    const endDate = body.endDate ?? existing.endDate;
    assertTripDates(startDate, endDate, { allowPastStart: true });
    const [row] = await this.dbService.db
      .update(trips)
      .set({
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate } : {}),
      })
      .where(eq(trips.id, tripId))
      .returning();
    return row;
  }

  @Delete(':tripId')
  async remove(@Identity() identity: RequestIdentity, @Param('tripId') tripId: string) {
    await assertTripWriteAccess(this.dbService.db, identity, tripId);

    // Explicitly remove vault rows for this trip (DB also cascades on trip delete).
    const docs = await this.dbService.db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.tripId, tripId));

    if (docs.length) {
      await this.dbService.db
        .delete(userDocuments)
        .where(eq(userDocuments.tripId, tripId));
    }

    // Drop local upload files only when no other vault row still references them
    // (e.g. after trip copy, multiple trips can share the same fileUrl).
    for (const doc of docs) {
      const [stillUsed] = await this.dbService.db
        .select({ id: userDocuments.id })
        .from(userDocuments)
        .where(
          and(eq(userDocuments.fileUrl, doc.fileUrl), ne(userDocuments.tripId, tripId)),
        )
        .limit(1);
      if (stillUsed) continue;
      const match = doc.fileUrl.match(/\/uploads\/([^/?#]+)$/);
      if (!match) continue;
      const filePath = join(process.cwd(), 'uploads', basename(match[1]));
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
        } catch {
          /* best-effort file cleanup */
        }
      }
    }

    await this.dbService.db.delete(trips).where(eq(trips.id, tripId));
    return { ok: true, documentsDeleted: docs.length };
  }

  /**
   * Traveler copies an agency (or any accessible) trip into a personal editable trip.
   * Vault docs are **copied** (same fileUrl, new rows) — originals stay on the source trip.
   * Itinerary days/items are duplicated; item documentId remapped to copied vault rows.
   */
  @Post(':tripId/copy')
  @Roles('traveler')
  async copyTrip(@Identity() identity: RequestIdentity, @Param('tripId') tripId: string) {
    const source = await assertTripAccess(this.dbService.db, identity, tripId);
    const baseTitle = source.title?.trim() || source.destination;
    const title = baseTitle.toLowerCase().includes('(my copy)')
      ? baseTitle
      : `${baseTitle} (my copy)`;

    const [copy] = await this.dbService.db
      .insert(trips)
      .values({
        userId: identity.userId,
        operatorId: null,
        title,
        destination: source.destination,
        destinationPlaceId: source.destinationPlaceId,
        startDate: source.startDate,
        endDate: source.endDate,
      })
      .returning();

    await this.dbService.db.insert(tripTravelers).values({
      tripId: copy.id,
      userId: identity.userId,
    });

    // Copy vault rows for this traveler (do not move / delete source docs)
    const sourceDocs = await this.dbService.db
      .select()
      .from(userDocuments)
      .where(
        and(eq(userDocuments.tripId, tripId), eq(userDocuments.userId, identity.userId)),
      );
    const docIdMap = new Map<string, string>();
    for (const doc of sourceDocs) {
      const [created] = await this.dbService.db
        .insert(userDocuments)
        .values({
          userId: identity.userId,
          tripId: copy.id,
          docType: doc.docType,
          title: doc.title,
          fileUrl: doc.fileUrl,
          rawText: doc.rawText,
          extractedData: doc.extractedData ?? {},
        })
        .returning();
      docIdMap.set(doc.id, created.id);
    }

    // Prefer itinerary owned by this traveler; else agency plan on the trip
    let [sourceItin] = await this.dbService.db
      .select()
      .from(itineraries)
      .where(and(eq(itineraries.tripId, tripId), eq(itineraries.userId, identity.userId)))
      .limit(1);
    if (!sourceItin) {
      const [anyItin] = await this.dbService.db
        .select()
        .from(itineraries)
        .where(eq(itineraries.tripId, tripId))
        .limit(1);
      sourceItin = anyItin;
    }

    let itineraryId: string | undefined;
    if (sourceItin) {
      const [newItin] = await this.dbService.db
        .insert(itineraries)
        .values({
          tripId: copy.id,
          userId: identity.userId,
          title: sourceItin.title,
          status: 'active',
        })
        .returning();
      itineraryId = newItin.id;

      const days = await this.dbService.db
        .select()
        .from(itineraryDays)
        .where(eq(itineraryDays.itineraryId, sourceItin.id))
        .orderBy(asc(itineraryDays.dayNumber));

      for (const day of days) {
        const [newDay] = await this.dbService.db
          .insert(itineraryDays)
          .values({
            itineraryId: newItin.id,
            dayNumber: day.dayNumber,
            date: day.date,
            theme: day.theme,
            placeId: day.placeId,
          })
          .returning();

        const items = await this.dbService.db
          .select()
          .from(itineraryItems)
          .where(eq(itineraryItems.dayId, day.id))
          .orderBy(asc(itineraryItems.timeSlot), asc(itineraryItems.sortOrder));

        for (const item of items) {
          const mappedDoc =
            item.documentId != null ? docIdMap.get(item.documentId) : undefined;
          await this.dbService.db.insert(itineraryItems).values({
            dayId: newDay.id,
            itemType: item.itemType,
            title: item.title,
            description: item.description,
            timeSlot: item.timeSlot,
            locationName: item.locationName,
            locationLat: item.locationLat,
            locationLng: item.locationLng,
            gemId: item.gemId,
            documentId: mappedDoc ?? null,
            sortOrder: item.sortOrder ?? 0,
            isCustomized: item.isCustomized ?? false,
          });
        }
      }
    }

    return {
      ...copy,
      sourceTripId: source.id,
      itineraryId,
      documentsCopied: sourceDocs.length,
    };
  }
}
