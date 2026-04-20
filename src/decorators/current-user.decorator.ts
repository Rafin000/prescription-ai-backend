import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Role } from 'src/base/base.constants';

export interface AuthedUser {
  userId: string;
  teamId: string;
  role: Role;
  onboardingComplete: boolean;
}

/**
 * Inject the request's authenticated user. Throws if the guard didn't run,
 * which would be a developer mistake (e.g. missing @Public() on a public route
 * or forgetting to register JwtGuard globally).
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthedUser => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthedUser | undefined;
    if (!user) {
      throw new Error(
        '@CurrentUser used on a route without an authenticated user',
      );
    }
    return user;
  },
);

export const TeamId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as AuthedUser | undefined;
    if (!user?.teamId) throw new Error('@TeamId used without authenticated team');
    return user.teamId;
  },
);
