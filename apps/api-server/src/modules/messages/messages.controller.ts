import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { tripMessages } from '@travel-bug/db';
import { z } from 'zod';
import { assertTripAccess, assertTripWriteAccess } from '../../auth/acl';
import { Identity, Roles, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';
import { fanOutTripMessageNotifications } from '../notifications/notify';

const createMessageSchema = z.object({
  kind: z.enum(['alert', 'info', 'notice']),
  title: z.string().min(1).max(255),
  body: z.string().min(1),
});

@Controller('trips/:tripId/messages')
export class MessagesController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async list(@Identity() identity: RequestIdentity, @Param('tripId') tripId: string) {
    const trip = await assertTripAccess(this.dbService.db, identity, tripId);
    if (!trip.operatorId) {
      return [];
    }
    return this.dbService.db
      .select()
      .from(tripMessages)
      .where(eq(tripMessages.tripId, tripId))
      .orderBy(desc(tripMessages.createdAt));
  }

  @Post()
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async create(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Body() raw: unknown,
  ) {
    const body = createMessageSchema.parse(raw);
    const trip = await assertTripWriteAccess(this.dbService.db, identity, tripId);
    if (!trip.operatorId) {
      throw new ForbiddenException('Message board is only for agency-managed trips');
    }
    if (identity.role !== 'superadmin' && trip.operatorId !== identity.operatorId) {
      throw new ForbiddenException('Trip not in your agency');
    }

    const title = body.title.trim();
    const messageBody = body.body.trim();
    if (!title || !messageBody) {
      throw new BadRequestException('title and body are required');
    }

    const [row] = await this.dbService.db
      .insert(tripMessages)
      .values({
        tripId,
        authorUserId: identity.userId,
        kind: body.kind,
        title,
        body: messageBody,
      })
      .returning();

    await fanOutTripMessageNotifications(this.dbService.db, {
      tripId,
      ownerUserId: trip.userId,
      messageId: row.id,
      title: row.title,
      body: row.body,
    });

    return row;
  }
}
