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
import { and, count, eq, ilike, isNull, type SQL } from 'drizzle-orm';
import { places } from '@travel-bug/db';
import { z } from 'zod';
import { Identity, Roles } from '../../auth/identity';
import { pageOffset, pageResult, parsePagination } from '../../common/pagination';
import { DbService } from '../../db/db.service';

const createPlaceSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['country', 'region', 'city', 'area']),
  parentId: z.string().uuid().nullable().optional(),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

const patchPlaceSchema = createPlaceSchema.partial();

@Controller('places')
export class PlacesController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  async list(
    @Identity() _identity: unknown,
    @Query('parentId') parentId?: string,
    @Query('kind') kind?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    const conditions: SQL[] = [];
    if (parentId === 'null' || parentId === '') {
      conditions.push(isNull(places.parentId));
    } else if (parentId) {
      conditions.push(eq(places.parentId, parentId));
    }
    if (kind) conditions.push(eq(places.kind, kind));

    // Unpaginated catalog for trees / autocomplete when page is omitted
    if (page === undefined && pageSize === undefined && search === undefined) {
      if (!conditions.length) {
        return this.dbService.db.select().from(places);
      }
      return this.dbService.db
        .select()
        .from(places)
        .where(and(...conditions));
    }

    const p = parsePagination({ page, pageSize, search });
    const q = p.search.trim();
    if (q) {
      conditions.push(ilike(places.name, `%${q}%`));
    }
    const where = conditions.length ? and(...conditions) : undefined;
    const [totalRow] = await this.dbService.db
      .select({ value: count() })
      .from(places)
      .where(where);
    const items = await this.dbService.db
      .select()
      .from(places)
      .where(where)
      .orderBy(places.name)
      .limit(p.pageSize)
      .offset(pageOffset(p.page, p.pageSize));
    return pageResult(items, Number(totalRow?.value ?? 0), p.page, p.pageSize);
  }

  /** Platform geography catalog — managed by superadmin only. */
  @Post()
  @Roles('superadmin')
  async create(@Body() raw: unknown) {
    const body = createPlaceSchema.parse(raw);
    if (body.kind === 'country' && body.parentId) {
      throw new BadRequestException('Countries cannot have a parent');
    }
    if (body.kind !== 'country' && !body.parentId) {
      throw new BadRequestException(`${body.kind} requires parentId`);
    }
    if (body.parentId) {
      const [parent] = await this.dbService.db
        .select()
        .from(places)
        .where(eq(places.id, body.parentId))
        .limit(1);
      if (!parent) throw new NotFoundException('Parent place not found');
    }
    const [row] = await this.dbService.db
      .insert(places)
      .values({
        name: body.name,
        kind: body.kind,
        parentId: body.parentId ?? null,
        lat: body.lat,
        lng: body.lng,
      })
      .returning();
    return row;
  }

  @Patch(':id')
  @Roles('superadmin')
  async patch(@Param('id') id: string, @Body() raw: unknown) {
    const body = patchPlaceSchema.parse(raw);
    const [existing] = await this.dbService.db
      .select()
      .from(places)
      .where(eq(places.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException();
    const [row] = await this.dbService.db
      .update(places)
      .set({
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.kind !== undefined ? { kind: body.kind } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId } : {}),
        ...(body.lat !== undefined ? { lat: body.lat } : {}),
        ...(body.lng !== undefined ? { lng: body.lng } : {}),
      })
      .where(eq(places.id, id))
      .returning();
    return row;
  }

  @Delete(':id')
  @Roles('superadmin')
  async remove(@Param('id') id: string) {
    const [existing] = await this.dbService.db
      .select()
      .from(places)
      .where(eq(places.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException();
    // Children CASCADE; gems with place_id RESTRICT — surface clear error
    try {
      await this.dbService.db.delete(places).where(eq(places.id, id));
    } catch {
      throw new BadRequestException(
        'Cannot delete place while gems (or other records) still reference it or its subtree',
      );
    }
    return { ok: true };
  }
}
