import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { trips } from '@travel-bug/db';
import { DbService } from '../../db/db.service';
import {
  Identity,
  IdentityGuard,
  type RequestIdentity,
} from '../../auth/identity';

@Controller('trips')
@UseGuards(IdentityGuard)
export class TripsController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  async list(@Identity() identity: RequestIdentity) {
    return this.dbService.db
      .select()
      .from(trips)
      .where(eq(trips.userId, identity.userId));
  }

  @Post()
  async create(
    @Identity() identity: RequestIdentity,
    @Body()
    body: { destination: string; startDate: string; endDate: string },
  ) {
    const [row] = await this.dbService.db
      .insert(trips)
      .values({
        userId: identity.userId,
        operatorId: identity.operatorId,
        destination: body.destination,
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning();
    return row;
  }
}
