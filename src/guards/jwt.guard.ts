import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from 'src/decorators/public.decorator';
import { AuthedUser } from 'src/decorators/current-user.decorator';

/**
 * Reads JWT from the `pai_session` cookie. Short-circuits on @Public() routes.
 * Applied globally in AppModule.
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = (req.cookies?.pai_session as string | undefined) ?? extractBearer(req);
    if (!token) throw new UnauthorizedException('Missing session');

    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
      const user: AuthedUser = {
        userId: payload.sub,
        teamId: payload.teamId,
        role: payload.role,
        onboardingComplete: !!payload.onboardingComplete,
      };
      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}

function extractBearer(req: { headers: { authorization?: string } }): string | undefined {
  const h = req.headers.authorization;
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return undefined;
}

interface JwtPayload {
  sub: string;
  teamId: string;
  role: AuthedUser['role'];
  onboardingComplete?: boolean;
}
