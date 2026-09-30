import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { and, eq, inArray } from 'drizzle-orm';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tripTravelers, trips, userDocuments, users } from '@travel-bug/db';
import { z } from 'zod';
import { assertTripAccess } from '../../auth/acl';
import { Identity, Roles, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';
import { notifyVaultDocument } from '../notifications/notify';

const createDocMetaSchema = z.object({
  tripId: z.string().uuid(),
  docType: z.string().min(1),
  title: z.string().optional(),
  /** Required for agency uploads — traveler who owns the vault doc. */
  userId: z.string().uuid().optional(),
});

const patchDocSchema = z.object({
  title: z.string().min(1).optional(),
  docType: z.string().min(1).optional(),
  userId: z.string().uuid().optional(),
});

@Controller('vault/documents')
export class VaultController {
  constructor(private readonly dbService: DbService) {}

  private async assertTravelerOnTrip(tripId: string, tripUserId: string, userId: string) {
    const [ownerUser] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!ownerUser || ownerUser.role !== 'traveler') {
      throw new BadRequestException(
        'Pick a traveler on this trip (documents cannot belong to staff)',
      );
    }
    const onTrip =
      userId === tripUserId ||
      Boolean(
        (
          await this.dbService.db
            .select({ id: tripTravelers.id })
            .from(tripTravelers)
            .where(
              and(eq(tripTravelers.tripId, tripId), eq(tripTravelers.userId, userId)),
            )
            .limit(1)
        )[0],
      );
    if (!onTrip) {
      throw new BadRequestException('userId must be a traveler on this trip');
    }
  }

  private async loadDocForMutation(identity: RequestIdentity, docId: string) {
    const [doc] = await this.dbService.db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.id, docId))
      .limit(1);
    if (!doc) throw new NotFoundException('Document not found');
    const trip = await assertTripAccess(this.dbService.db, identity, doc.tripId);
    if (identity.role === 'traveler') {
      if (doc.userId !== identity.userId) {
        throw new ForbiddenException('Not your document');
      }
      // Own vault docs: trip read access is enough (agency trips stay itinerary read-only)
    }
    return { doc, trip };
  }

  @Get()
  async list(
    @Identity() identity: RequestIdentity,
    @Query('tripId') tripId?: string,
    @Query('userId') userId?: string,
  ) {
    if (tripId) {
      await assertTripAccess(this.dbService.db, identity, tripId);
      if (identity.role === 'traveler') {
        return this.dbService.db
          .select()
          .from(userDocuments)
          .where(
            and(
              eq(userDocuments.tripId, tripId),
              eq(userDocuments.userId, identity.userId),
            ),
          );
      }
      if (userId) {
        return this.dbService.db
          .select()
          .from(userDocuments)
          .where(and(eq(userDocuments.tripId, tripId), eq(userDocuments.userId, userId)));
      }
      return this.dbService.db
        .select()
        .from(userDocuments)
        .where(eq(userDocuments.tripId, tripId));
    }

    if (identity.role === 'superadmin') {
      return this.dbService.db.select().from(userDocuments);
    }

    if (
      (identity.role === 'agency_manager' || identity.role === 'agency_agent') &&
      identity.operatorId
    ) {
      const agencyTrips = await this.dbService.db
        .select({ id: trips.id })
        .from(trips)
        .where(eq(trips.operatorId, identity.operatorId));
      const ids = agencyTrips.map((t) => t.id);
      if (!ids.length) return [];
      return this.dbService.db
        .select()
        .from(userDocuments)
        .where(inArray(userDocuments.tripId, ids));
    }

    return this.dbService.db
      .select()
      .from(userDocuments)
      .where(eq(userDocuments.userId, identity.userId));
  }

  @Post()
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async create(
    @Identity() identity: RequestIdentity,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() raw: Record<string, string>,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('file is required');
    }
    const body = createDocMetaSchema.parse({
      tripId: raw.tripId,
      docType: raw.docType,
      title: raw.title,
      userId: raw.userId || undefined,
    });
    const trip = await assertTripAccess(this.dbService.db, identity, body.tripId);

    let ownerUserId = identity.userId;
    if (identity.role === 'traveler') {
      if (body.userId && body.userId !== identity.userId) {
        throw new BadRequestException('Travelers can only upload to their own vault');
      }
      // Own vault on any accessible trip (including agency read-only itineraries)
      ownerUserId = identity.userId;
    } else {
      if (!body.userId) {
        throw new BadRequestException('Select a traveler for this document');
      }
      ownerUserId = body.userId;
      await this.assertTravelerOnTrip(body.tripId, trip.userId, ownerUserId);
    }

    const dir = join(process.cwd(), 'uploads');
    mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}-${file.originalname.replace(/[^\w.\-]+/g, '_')}`;
    writeFileSync(join(dir, name), file.buffer);
    const fileUrl = `http://localhost:${process.env.PORT ?? 3001}/uploads/${name}`;

    const [row] = await this.dbService.db
      .insert(userDocuments)
      .values({
        userId: ownerUserId,
        tripId: body.tripId,
        docType: body.docType,
        title: body.title ?? file.originalname ?? 'Document',
        fileUrl,
        extractedData: {},
      })
      .returning();

    // Agency / staff posting into a traveler vault → in-app notification
    if (identity.role !== 'traveler' && ownerUserId !== identity.userId) {
      await notifyVaultDocument(this.dbService.db, {
        userId: ownerUserId,
        tripId: body.tripId,
        documentId: row.id,
        title: row.title ?? 'Document',
      });
    }

    return row;
  }

  @Patch(':docId')
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async patch(
    @Identity() identity: RequestIdentity,
    @Param('docId') docId: string,
    @Body() raw: unknown,
  ) {
    const body = patchDocSchema.parse(raw);
    if (
      body.title === undefined &&
      body.docType === undefined &&
      body.userId === undefined
    ) {
      throw new BadRequestException('Nothing to update');
    }
    const { doc, trip } = await this.loadDocForMutation(identity, docId);
    let nextUserId = doc.userId;
    if (body.userId !== undefined) {
      if (identity.role === 'traveler') {
        throw new BadRequestException('Travelers cannot reassign documents');
      }
      await this.assertTravelerOnTrip(doc.tripId, trip.userId, body.userId);
      nextUserId = body.userId;
    }
    const [row] = await this.dbService.db
      .update(userDocuments)
      .set({
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.docType !== undefined ? { docType: body.docType } : {}),
        ...(body.userId !== undefined ? { userId: nextUserId } : {}),
      })
      .where(eq(userDocuments.id, docId))
      .returning();
    return row;
  }

  @Delete(':docId')
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async remove(@Identity() identity: RequestIdentity, @Param('docId') docId: string) {
    await this.loadDocForMutation(identity, docId);
    await this.dbService.db.delete(userDocuments).where(eq(userDocuments.id, docId));
    return { ok: true };
  }
}
