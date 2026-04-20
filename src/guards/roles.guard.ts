import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/base/base.constants';
import { ROLES_KEY } from 'src/decorators/roles.decorator';
import { AuthedUser } from 'src/decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthedUser | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Role not permitted');
    }
    return true;
  }
}
