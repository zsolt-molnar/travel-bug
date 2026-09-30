import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { travelerProfiles, users } from '@travel-bug/db';
import { z } from 'zod';
import { Identity, type RequestIdentity } from '../../auth/identity';
import { DbService } from '../../db/db.service';

const patchProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
});

@Controller('me')
export class MeController {
  constructor(private readonly dbService: DbService) {}

  @Get('profile')
  async getProfile(@Identity() identity: RequestIdentity) {
    const [user] = await this.dbService.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        operatorId: users.operatorId,
      })
      .from(users)
      .where(eq(users.id, identity.userId))
      .limit(1);
    if (!user) throw new NotFoundException();
    const [profile] = await this.dbService.db
      .select()
      .from(travelerProfiles)
      .where(eq(travelerProfiles.userId, identity.userId))
      .limit(1);
    return { user, profile: profile ?? null };
  }

  @Patch('profile')
  async patchProfile(@Identity() identity: RequestIdentity, @Body() raw: unknown) {
    const body = patchProfileSchema.parse(raw);
    if (body.name !== undefined) {
      await this.dbService.db
        .update(users)
        .set({ name: body.name })
        .where(eq(users.id, identity.userId));
    }

    const [existing] = await this.dbService.db
      .select()
      .from(travelerProfiles)
      .where(eq(travelerProfiles.userId, identity.userId))
      .limit(1);

    if (!existing) {
      if (!body.firstName || !body.lastName) {
        return this.getProfile(identity);
      }
      await this.dbService.db.insert(travelerProfiles).values({
        userId: identity.userId,
        firstName: body.firstName,
        lastName: body.lastName,
        address: body.address,
        city: body.city,
        country: body.country,
        phone: body.phone,
      });
    } else {
      await this.dbService.db
        .update(travelerProfiles)
        .set({
          ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
          ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
          ...(body.address !== undefined ? { address: body.address } : {}),
          ...(body.city !== undefined ? { city: body.city } : {}),
          ...(body.country !== undefined ? { country: body.country } : {}),
          ...(body.phone !== undefined ? { phone: body.phone } : {}),
        })
        .where(eq(travelerProfiles.userId, identity.userId));
    }

    return this.getProfile(identity);
  }
}
