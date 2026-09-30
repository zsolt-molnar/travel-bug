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
import { AuthGuard } from '@nestjs/passport';

export type AppRole = 'superadmin' | 'agency_manager' | 'agency_agent' | 'traveler';

export interface RequestIdentity {
  userId: string;
  email: string;
  operatorId: string | null;
  role: AppRole;
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

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
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or missing token');
    }
    const identity = user as unknown as RequestIdentity;
    const req = context.switchToHttp().getRequest<{ identity?: RequestIdentity }>();
    req.identity = identity;
    return user;
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
