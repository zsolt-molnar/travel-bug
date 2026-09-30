import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hashSync } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { invites, tripTravelers, travelerProfiles, users } from '@travel-bug/db';
import { z } from 'zod';
import { DbService } from '../db/db.service';
import type { AppRole, RequestIdentity } from './identity';
import type { JwtPayload } from './jwt.strategy';

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const inviteRegisterSchema = z.object({
  code: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
});

@Injectable()
export class AuthService {
  constructor(
    private readonly dbService: DbService,
    private readonly jwt: JwtService,
  ) {}

  private tokenFor(user: {
    id: string;
    email: string;
    role: string;
    operatorId: string | null;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as AppRole,
      operatorId: user.operatorId,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        operatorId: user.operatorId,
      },
    };
  }

  async signup(raw: unknown) {
    const body = signupSchema.parse(raw);
    const [existing] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = hashSync(body.password, 10);
    const [user] = await this.dbService.db
      .insert(users)
      .values({
        email: body.email.toLowerCase(),
        name: body.name ?? body.email,
        role: 'traveler',
        operatorId: null,
        passwordHash,
      })
      .returning();

    if (body.firstName && body.lastName) {
      await this.dbService.db.insert(travelerProfiles).values({
        userId: user.id,
        firstName: body.firstName,
        lastName: body.lastName,
      });
    }

    return this.tokenFor(user);
  }

  async login(raw: unknown) {
    const body = loginSchema.parse(raw);
    const [user] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!compareSync(body.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.tokenFor(user);
  }

  async registerInvite(raw: unknown) {
    const body = inviteRegisterSchema.parse(raw);
    const [invite] = await this.dbService.db
      .select()
      .from(invites)
      .where(and(eq(invites.code, body.code), eq(invites.status, 'pending')))
      .limit(1);
    if (!invite) throw new BadRequestException('Invalid or used invite code');
    if (invite.email.toLowerCase() !== body.email.toLowerCase()) {
      throw new BadRequestException('Email does not match invite');
    }

    const [existing] = await this.dbService.db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = hashSync(body.password, 10);
    const [user] = await this.dbService.db
      .insert(users)
      .values({
        email: body.email.toLowerCase(),
        name: body.name ?? body.email,
        role: 'traveler',
        operatorId: invite.operatorId,
        passwordHash,
      })
      .returning();

    if (body.firstName && body.lastName) {
      await this.dbService.db.insert(travelerProfiles).values({
        userId: user.id,
        firstName: body.firstName,
        lastName: body.lastName,
      });
    }

    await this.dbService.db.insert(tripTravelers).values({
      tripId: invite.tripId,
      userId: user.id,
    });

    await this.dbService.db
      .update(invites)
      .set({ status: 'accepted' })
      .where(eq(invites.id, invite.id));

    return this.tokenFor(user);
  }

  identityFromUser(user: {
    id: string;
    email: string;
    role: string;
    operatorId: string | null;
  }): RequestIdentity {
    return {
      userId: user.id,
      email: user.email,
      role: user.role as AppRole,
      operatorId: user.operatorId,
    };
  }
}
