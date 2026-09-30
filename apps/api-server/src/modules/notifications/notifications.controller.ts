import { Controller, Get, NotFoundException, Param, Post, Query } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { notifications } from '@travel-bug/db';
import { Identity, Roles, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly dbService: DbService) {}

  @Get()
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async list(
    @Identity() identity: RequestIdentity,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const conditions = [eq(notifications.userId, identity.userId)];
    if (unreadOnly === '1' || unreadOnly === 'true') {
      conditions.push(isNull(notifications.readAt));
    }
    return this.dbService.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt));
  }

  @Get('unread-count')
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async unreadCount(@Identity() identity: RequestIdentity) {
    const [row] = await this.dbService.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, identity.userId), isNull(notifications.readAt)),
      );
    return { count: Number(row?.value ?? 0) };
  }

  @Post('read-all')
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async readAll(@Identity() identity: RequestIdentity) {
    const now = new Date();
    await this.dbService.db
      .update(notifications)
      .set({ readAt: now })
      .where(
        and(eq(notifications.userId, identity.userId), isNull(notifications.readAt)),
      );
    return { ok: true };
  }

  @Post(':id/read')
  @Roles('traveler', 'agency_manager', 'agency_agent', 'superadmin')
  async readOne(@Identity() identity: RequestIdentity, @Param('id') id: string) {
    const [existing] = await this.dbService.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, identity.userId)))
      .limit(1);
    if (!existing) throw new NotFoundException('Notification not found');
    if (existing.readAt) return existing;
    const [row] = await this.dbService.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return row;
  }
}
