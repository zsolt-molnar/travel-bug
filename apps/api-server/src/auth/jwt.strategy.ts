import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppRole, RequestIdentity } from './identity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: AppRole;
  operatorId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'dev-only-change-me-travel-bug-jwt',
    });
  }

  validate(payload: JwtPayload): RequestIdentity {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      operatorId: payload.operatorId,
    };
  }
}
