import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  invites,
  operators,
  tripTravelers,
  trips,
  users,
} from '@travel-bug/db';
import { DbService } from '../../db/db.service';
import {
  Identity,
  IdentityGuard,
  Roles,
  RolesGuard,
  type RequestIdentity,
} from '../../auth/identity';

@Controller('agencies')
@UseGuards(IdentityGuard, RolesGuard)
export class AgenciesController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  @Roles('superadmin')
  async listAgencies() {
    return this.dbService.db.select().from(operators);
  }

  @Post()
  @Roles('superadmin')
  async createAgency(
    @Body()
    body: {
      name: string;
      managerEmail: string;
      managerName: string;
      brandConfig?: Record<string, unknown>;
    },
  ) {
    const [agency] = await this.dbService.db
      .insert(operators)
      .values({
        name: body.name,
        brandConfig: body.brandConfig ?? {},
      })
      .returning();

    const [manager] = await this.dbService.db
      .insert(users)
      .values({
        email: body.managerEmail,
        name: body.managerName,
        role: 'agency_manager',
        operatorId: agency.id,
      })
      .returning();

    return { agency, manager };
  }

  @Post('staff')
  @Roles('agency_manager')
  async createStaff(
    @Identity() identity: RequestIdentity,
    @Body() body: { email: string; name: string },
  ) {
    const [agent] = await this.dbService.db
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        role: 'agency_agent',
        operatorId: identity.operatorId,
      })
      .returning();
    return agent;
  }

  @Get('staff')
  @Roles('agency_manager', 'agency_agent')
  async listStaff(@Identity() identity: RequestIdentity) {
    if (!identity.operatorId) return [];
    return this.dbService.db
      .select()
      .from(users)
      .where(eq(users.operatorId, identity.operatorId));
  }

  @Get('trips')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async listTrips(@Identity() identity: RequestIdentity) {
    if (identity.role === 'superadmin') {
      return this.dbService.db.select().from(trips);
    }
    if (!identity.operatorId) return [];
    return this.dbService.db
      .select()
      .from(trips)
      .where(eq(trips.operatorId, identity.operatorId));
  }

  @Post('trips')
  @Roles('agency_manager', 'agency_agent')
  async createTrip(
    @Identity() identity: RequestIdentity,
    @Body()
    body: {
      destination: string;
      startDate: string;
      endDate: string;
      travelerUserId?: string;
    },
  ) {
    const travelerId = body.travelerUserId ?? identity.userId;
    const [trip] = await this.dbService.db
      .insert(trips)
      .values({
        userId: travelerId,
        operatorId: identity.operatorId,
        destination: body.destination,
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning();

    await this.dbService.db.insert(tripTravelers).values({
      tripId: trip.id,
      userId: travelerId,
    });

    return trip;
  }

  @Post('trips/:tripId/clients')
  @Roles('agency_manager', 'agency_agent')
  async addClient(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Body() body: { email: string },
  ) {
    const [existing] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing) {
      await this.dbService.db.insert(tripTravelers).values({
        tripId,
        userId: existing.id,
      });
      return {
        status: 'registered' as const,
        user: existing,
        invite: null,
      };
    }

    const code = `INVITE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const [invite] = await this.dbService.db
      .insert(invites)
      .values({
        tripId,
        operatorId: identity.operatorId!,
        email: body.email,
        code,
        status: 'pending',
      })
      .returning();

    return {
      status: 'pending_invite' as const,
      user: null,
      invite,
      inviteLink: `/register?code=${code}`,
    };
  }

  @Get('trips/:tripId/clients')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async listClients(@Param('tripId') tripId: string) {
    const travelers = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(tripTravelers)
      .innerJoin(users, eq(tripTravelers.userId, users.id))
      .where(eq(tripTravelers.tripId, tripId));

    const pending = await this.dbService.db
      .select()
      .from(invites)
      .where(eq(invites.tripId, tripId));

    return { registered: travelers, pending };
  }
}
