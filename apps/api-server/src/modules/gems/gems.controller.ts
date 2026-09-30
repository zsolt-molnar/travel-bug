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
  Query,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { hiddenGems, places } from '@travel-bug/db';
import { z } from 'zod';
import { assertTripAccess, listGemsForScope, resolveDayGemScope } from '../../auth/acl';
import { listGemsForScopePaged } from '../../common/gems-page';
import { parsePagination } from '../../common/pagination';
import { Identity, Roles, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';

const createGemSchema = z.object({
  placeId: z.string().uuid(),
  title: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  locationLat: z.string().optional(),
  locationLng: z.string().optional(),
  neighborhood: z.string().optional(),
  tags: z.array(z.string()).optional(),
  public: z.boolean().optional(),
});

const patchGemSchema = createGemSchema.partial();

@Controller()
export class GemsController {
  constructor(private readonly dbService: DbService) {}

  @Get('gems')
  async list(
    @Identity() identity: RequestIdentity,
    @Query('placeId') placeId: string,
    @Query('category') category?: string,
    @Query('scope') scope?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    if (!placeId) throw new BadRequestException('placeId is required');
    const p = parsePagination({ page, pageSize, search });
    const scopeFilter = scope === 'platform' || scope === 'agency' ? scope : undefined;

    if (identity.role === 'superadmin') {
      return listGemsForScopePaged(this.dbService.db, {
        placeId,
        allOperators: true,
        category,
        scope: scopeFilter,
        search: p.search,
        page: p.page,
        pageSize: p.pageSize,
      });
    }
    if (
      (identity.role === 'agency_manager' || identity.role === 'agency_agent') &&
      !identity.operatorId
    ) {
      throw new BadRequestException('Agency users require operatorId');
    }
    return listGemsForScopePaged(this.dbService.db, {
      placeId,
      operatorId: identity.operatorId,
      category,
      scope: scopeFilter,
      search: p.search,
      page: p.page,
      pageSize: p.pageSize,
    });
  }

  @Get('trips/:tripId/gems')
  async forTrip(
    @Identity() identity: RequestIdentity,
    @Param('tripId') tripId: string,
    @Query('category') category?: string,
    @Query('dayId') dayId?: string,
  ) {
    await assertTripAccess(this.dbService.db, identity, tripId);
    const scope = await resolveDayGemScope(this.dbService.db, tripId, dayId);
    // Catalog for a trip: public + that trip's agency (never other agencies)
    return listGemsForScope(this.dbService.db, {
      placeId: scope.placeId,
      operatorId: scope.operatorId,
      category,
    });
  }

  @Post('gems')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async create(@Identity() identity: RequestIdentity, @Body() raw: unknown) {
    const body = createGemSchema.parse(raw);
    const [place] = await this.dbService.db
      .select({ id: places.id })
      .from(places)
      .where(eq(places.id, body.placeId))
      .limit(1);
    if (!place) throw new BadRequestException('placeId must reference an existing place');

    // Superadmin gems are always platform/public (visible to every agency)
    if (identity.role === 'superadmin') {
      const [row] = await this.dbService.db
        .insert(hiddenGems)
        .values({
          placeId: body.placeId,
          title: body.title,
          category: body.category,
          description: body.description,
          locationLat: body.locationLat,
          locationLng: body.locationLng,
          neighborhood: body.neighborhood,
          tags: body.tags,
          operatorId: null,
        })
        .returning();
      return row;
    }

    if (!identity.operatorId) {
      throw new BadRequestException('operatorId required to create operator gem');
    }
    const [row] = await this.dbService.db
      .insert(hiddenGems)
      .values({
        placeId: body.placeId,
        title: body.title,
        category: body.category,
        description: body.description,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        neighborhood: body.neighborhood,
        tags: body.tags,
        operatorId: identity.operatorId,
      })
      .returning();
    return row;
  }

  @Patch('gems/:id')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async patch(
    @Identity() identity: RequestIdentity,
    @Param('id') id: string,
    @Body() raw: unknown,
  ) {
    const body = patchGemSchema.parse(raw);
    const [existing] = await this.dbService.db
      .select()
      .from(hiddenGems)
      .where(eq(hiddenGems.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException();
    if (identity.role !== 'superadmin' && existing.operatorId !== identity.operatorId) {
      throw new BadRequestException('Cannot edit another operator gem');
    }
    if (identity.role !== 'superadmin' && existing.operatorId === null) {
      throw new BadRequestException('Cannot edit platform (admin) gems');
    }
    if (body.placeId !== undefined) {
      const [place] = await this.dbService.db
        .select({ id: places.id })
        .from(places)
        .where(eq(places.id, body.placeId))
        .limit(1);
      if (!place)
        throw new BadRequestException('placeId must reference an existing place');
    }
    const [row] = await this.dbService.db
      .update(hiddenGems)
      .set({
        ...(body.placeId !== undefined ? { placeId: body.placeId } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.locationLat !== undefined ? { locationLat: body.locationLat } : {}),
        ...(body.locationLng !== undefined ? { locationLng: body.locationLng } : {}),
        ...(body.neighborhood !== undefined ? { neighborhood: body.neighborhood } : {}),
        ...(body.tags !== undefined ? { tags: body.tags } : {}),
      })
      .where(eq(hiddenGems.id, id))
      .returning();
    return row;
  }

  @Delete('gems/:id')
  @Roles('agency_manager', 'agency_agent', 'superadmin')
  async remove(@Identity() identity: RequestIdentity, @Param('id') id: string) {
    const [existing] = await this.dbService.db
      .select()
      .from(hiddenGems)
      .where(eq(hiddenGems.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException();
    if (identity.role !== 'superadmin' && existing.operatorId !== identity.operatorId) {
      throw new BadRequestException('Cannot delete another operator gem');
    }
    if (identity.role !== 'superadmin' && existing.operatorId === null) {
      throw new BadRequestException('Cannot delete platform (admin) gems');
    }
    await this.dbService.db.delete(hiddenGems).where(eq(hiddenGems.id, id));
    return { ok: true };
  }
}
