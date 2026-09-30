import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import { and, count, eq, ilike, inArray, isNotNull, or, type SQL } from 'drizzle-orm';
import {
  invites,
  itineraries,
  itineraryDays,
  operators,
  SEED_PASSWORD,
  tripTravelers,
  trips,
  userDocuments,
  users,
} from '@travel-bug/db';
import { z } from 'zod';
import { assertTripAccess } from '../../auth/acl';
import { pageOffset, pageResult, parsePagination } from '../../common/pagination';
import { DbService } from '../../db/db.service';
import { Identity, Roles, type RequestIdentity } from '../../auth/identity';

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
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const minStart = `${y}-${m}-${d}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw new BadRequestException('Dates must be YYYY-MM-DD');
  }
  if (!opts?.allowPastStart && startDate < minStart) {
    throw new BadRequestException('Start date cannot be in the past');
  }
  if (endDate <= startDate) {
    throw new BadRequestException('End date must be after start date');
  }
}

const patchAgencySchema = z.object({
  name: z.string().min(1).optional(),
  brandConfig: z.record(z.string(), z.unknown()).optional(),
});

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  @Roles('superadmin')
  async listAgencies(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const p = parsePagination({ page, pageSize, search });
    const conditions: SQL[] = [];
    const q = p.search.trim();
    if (q) {
      conditions.push(ilike(operators.name, `%${q}%`));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.dbService.db
      .select({ value: count() })
      .from(operators)
      .where(where);
    const items = await this.dbService.db
      .select()
      .from(operators)
      .where(where)
      .orderBy(operators.name)
      .limit(p.pageSize)
      .offset(pageOffset(p.page, p.pageSize));
    return pageResult(items, Number(totalRow?.value ?? 0), p.page, p.pageSize);
  }

  @Post()
  @Roles('superadmin')
  async createAgency(
    @Body()
    body: {
      name: string;
      managerEmail: string;
      managerName: string;
      managerPassword?: string;
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
        passwordHash: hashSync(body.managerPassword ?? SEED_PASSWORD, 10),
      })
      .returning();

    return { agency, manager };
  }

  @Patch(':id')
  @Roles('superadmin')
  async patchAgency(@Param('id') id: string, @Body() raw: unknown) {
    const body = patchAgencySchema.parse(raw);
    if (body.name === undefined && body.brandConfig === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    const [existing] = await this.dbService.db
      .select()
      .from(operators)
      .where(eq(operators.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Agency not found');
    const [row] = await this.dbService.db
      .update(operators)
      .set({
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.brandConfig !== undefined ? { brandConfig: body.brandConfig } : {}),
      })
      .where(eq(operators.id, id))
      .returning();
    return row;
  }

  @Post('staff')
  @Roles('agency_manager')
  async createStaff(
    @Identity() identity: RequestIdentity,
    @Body() body: { email: string; name: string; password?: string },
  ) {
    const [agent] = await this.dbService.db
      .insert(users)
      .values({
        email: body.email,
        name: body.name,
        role: 'agency_agent',
        operatorId: identity.operatorId,
        passwordHash: hashSync(body.password ?? SEED_PASSWORD, 10),
      })
      .returning();
    return agent;
  }

  @Get('staff')
  @Roles('agency_manager', 'superadmin')
  async listStaff(
    @Identity() identity: RequestIdentity,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    const p = parsePagination({ page, pageSize, search });
    const cols = {
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      operatorId: users.operatorId,
      createdAt: users.createdAt,
    };
    const conditions: SQL[] = [inArray(users.role, ['agency_manager', 'agency_agent'])];
    if (identity.role !== 'superadmin') {
      if (!identity.operatorId) {
        return pageResult([], 0, p.page, p.pageSize);
      }
      conditions.push(eq(users.operatorId, identity.operatorId));
    }
    if (role === 'agency_manager' || role === 'agency_agent') {
      conditions.push(eq(users.role, role));
    }
    const q = p.search.trim();
    if (q) {
      conditions.push(or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))!);
    }
    const where = and(...conditions);
    const [totalRow] = await this.dbService.db
      .select({ value: count() })
      .from(users)
      .where(where);
    const items = await this.dbService.db
      .select(cols)
      .from(users)
      .where(where)
      .orderBy(users.email)
      .limit(p.pageSize)
      .offset(pageOffset(p.page, p.pageSize));
    return pageResult(items, Number(totalRow?.value ?? 0), p.page, p.pageSize);
  }

  @Get('clients')
  @Roles('agency_manager', 'superadmin')
  async listAgencyClients(
    @Identity() identity: RequestIdentity,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const p = parsePagination({ page, pageSize, search });
    const cols = {
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      operatorId: users.operatorId,
      createdAt: users.createdAt,
    };
    const conditions: SQL[] = [eq(users.role, 'traveler'), isNotNull(users.operatorId)];
    if (identity.role !== 'superadmin') {
      if (!identity.operatorId) {
        return pageResult([], 0, p.page, p.pageSize);
      }
      conditions.push(eq(users.operatorId, identity.operatorId));
    }
    const q = p.search.trim();
    if (q) {
      conditions.push(or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`))!);
    }
    const where = and(...conditions);
    const [totalRow] = await this.dbService.db
      .select({ value: count() })
      .from(users)
      .where(where);
    const items = await this.dbService.db
      .select(cols)
      .from(users)
      .where(where)
      .orderBy(users.email)
      .limit(p.pageSize)
      .offset(pageOffset(p.page, p.pageSize));
    return pageResult(items, Number(totalRow?.value ?? 0), p.page, p.pageSize);
  }

  @Get('trips')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async listTrips(
    @Identity() identity: RequestIdentity,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const p = parsePagination({ page, pageSize, search });
    // Agency staff: own agency only. Superadmin: all trips (agency + independent B2C).
    const conditions: SQL[] = [];
    if (identity.role !== 'superadmin') {
      if (!identity.operatorId) {
        return pageResult([], 0, p.page, p.pageSize);
      }
      conditions.push(eq(trips.operatorId, identity.operatorId));
    }
    const q = p.search.trim();
    if (q) {
      conditions.push(
        or(ilike(trips.title, `%${q}%`), ilike(trips.destination, `%${q}%`))!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.dbService.db
      .select({ value: count() })
      .from(trips)
      .where(where);
    const items = await this.dbService.db
      .select()
      .from(trips)
      .where(where)
      .orderBy(trips.startDate)
      .limit(p.pageSize)
      .offset(pageOffset(p.page, p.pageSize));
    return pageResult(items, Number(totalRow?.value ?? 0), p.page, p.pageSize);
  }

  @Get('trips/:tripId')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async getTrip(@Identity() identity: RequestIdentity, @Param('tripId') tripId: string) {
    return assertTripAccess(this.dbService.db, identity, tripId);
  }

  @Patch('trips/:tripId')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async patchTrip(
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
    const existing = await assertTripAccess(this.dbService.db, identity, tripId);
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

  @Post('trips')
  @Roles('agency_manager', 'agency_agent')
  async createTrip(
    @Identity() identity: RequestIdentity,
    @Body()
    body: {
      destination: string;
      startDate: string;
      endDate: string;
      title?: string;
      travelerUserId?: string;
      destinationPlaceId?: string;
    },
  ) {
    if (!body.destination?.trim()) {
      throw new BadRequestException('Destination is required');
    }
    assertTripDates(body.startDate, body.endDate);
    // Primary traveler when provided; otherwise staff creates an empty shell trip.
    const ownerId = body.travelerUserId ?? identity.userId;
    const title = body.title ?? body.destination;
    const [trip] = await this.dbService.db
      .insert(trips)
      .values({
        userId: ownerId,
        operatorId: identity.operatorId,
        title,
        destination: body.destination,
        destinationPlaceId: body.destinationPlaceId,
        startDate: body.startDate,
        endDate: body.endDate,
      })
      .returning();

    // Only party-link real travelers here; staff owners are not trip "clients".
    if (body.travelerUserId) {
      await this.dbService.db.insert(tripTravelers).values({
        tripId: trip.id,
        userId: body.travelerUserId,
      });
    }

    const [itin] = await this.dbService.db
      .insert(itineraries)
      .values({
        tripId: trip.id,
        userId: ownerId,
        title: `${title} itinerary`,
        status: 'active',
      })
      .returning();

    await this.dbService.db.insert(itineraryDays).values({
      itineraryId: itin.id,
      dayNumber: 1,
      date: body.startDate,
      theme: 'Day 1',
      placeId: body.destinationPlaceId ?? null,
    });

    return { ...trip, itineraryId: itin.id };
  }

  @Post('trips/:tripId/clients')
  @Roles('agency_manager', 'agency_agent')
  async addClient(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Body() body: { email: string },
  ) {
    const trip = await assertTripAccess(this.dbService.db, identity, tripId);
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
      // Promote first real traveler to trip owner when shell was staff-owned
      const [owner] = await this.dbService.db
        .select()
        .from(users)
        .where(eq(users.id, trip.userId))
        .limit(1);
      if (owner && owner.role !== 'traveler') {
        await this.dbService.db
          .update(trips)
          .set({ userId: existing.id })
          .where(eq(trips.id, tripId));
      }
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
  async listTripClients(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const trip = await assertTripAccess(this.dbService.db, identity, tripId);
    const p = parsePagination({ page, pageSize, search });

    const party = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(tripTravelers)
      .innerJoin(users, eq(tripTravelers.userId, users.id))
      .where(eq(tripTravelers.tripId, tripId));

    const [owner] = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, trip.userId))
      .limit(1);

    const byId = new Map(party.map((u) => [u.id, u]));
    if (owner?.role === 'traveler') {
      byId.set(owner.id, owner);
    }
    let registered = [...byId.values()].filter((u) => u.role === 'traveler');

    const q = p.search.trim().toLowerCase();
    if (q) {
      registered = registered.filter(
        (u) =>
          u.email.toLowerCase().includes(q) || (u.name ?? '').toLowerCase().includes(q),
      );
    }
    registered.sort((a, b) => a.email.localeCompare(b.email));

    const docRows = await this.dbService.db
      .select({
        userId: userDocuments.userId,
        count: count(),
      })
      .from(userDocuments)
      .where(eq(userDocuments.tripId, tripId))
      .groupBy(userDocuments.userId);
    const docCountByUser = new Map(docRows.map((r) => [r.userId, Number(r.count)]));

    const total = registered.length;
    const slice = registered.slice(
      pageOffset(p.page, p.pageSize),
      pageOffset(p.page, p.pageSize) + p.pageSize,
    );
    const items = slice.map((u) => ({
      ...u,
      isOwner: u.id === trip.userId,
      docCount: docCountByUser.get(u.id) ?? 0,
    }));

    const pending = await this.dbService.db
      .select()
      .from(invites)
      .where(eq(invites.tripId, tripId));

    return {
      ...pageResult(items, total, p.page, p.pageSize),
      pending,
      ownerId: trip.userId,
      independent: trip.operatorId == null,
    };
  }

  @Get('trips/:tripId/clients/:userId')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async getTripClient(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Param('userId') userId: string,
  ) {
    const trip = await assertTripAccess(this.dbService.db, identity, tripId);
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.role !== 'traveler') {
      throw new NotFoundException('Traveler not found');
    }
    const onTrip =
      userId === trip.userId ||
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
      throw new NotFoundException('Traveler is not on this trip');
    }
    const [docCountRow] = await this.dbService.db
      .select({ count: count() })
      .from(userDocuments)
      .where(and(eq(userDocuments.tripId, tripId), eq(userDocuments.userId, userId)));
    return {
      ...user,
      isOwner: userId === trip.userId,
      docCount: Number(docCountRow?.count ?? 0),
      tripId,
      independent: trip.operatorId == null,
    };
  }
}
