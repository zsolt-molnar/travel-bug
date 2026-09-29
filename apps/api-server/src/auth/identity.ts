import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SEED_IDS } from '@travel-bug/db';

export type AppRole =
  | 'superadmin'
  | 'agency_manager'
  | 'agency_agent'
  | 'traveler';

export interface RequestIdentity {
  userId: string;
  operatorId: string | null;
  role: AppRole;
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

export const Identity = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestIdentity => {
    const req = ctx.switchToHttp().getRequest<{ identity?: RequestIdentity }>();
    if (!req.identity) {
      throw new UnauthorizedException('Missing identity');
    }
    return req.identity;
  },
);

@Injectable()
export class IdentityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      identity?: RequestIdentity;
    }>();
    const userId =
      req.headers['x-user-id'] ?? SEED_IDS.traveler;
    const operatorId =
      req.headers['x-operator-id'] ?? SEED_IDS.operator;
    const role = (req.headers['x-user-role'] ?? 'traveler') as AppRole;
    req.identity = {
      userId,
      operatorId: operatorId === 'null' ? null : operatorId,
      role,
    };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const req = context.switchToHttp().getRequest<{ identity?: RequestIdentity }>();
    if (!req.identity) throw new UnauthorizedException();
    if (!roles.includes(req.identity.role)) {
      throw new ForbiddenException(`Requires one of: ${roles.join(', ')}`);
    }
    return true;
  }
}
