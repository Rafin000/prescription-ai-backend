import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Public } from 'src/decorators/public.decorator';
import { AuthService } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  @Public()
  @Post('signup')
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken } = await this.svc.signup(dto, res);
    return { user, accessToken, refreshToken: accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken } = await this.svc.login(dto, res);
    return { user, accessToken, refreshToken: accessToken };
  }

  /** Re-signs a fresh JWT. The SPA calls this on 401 retry. */
  @Post('refresh')
  async refresh(
    @CurrentUser() u: AuthedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.svc.refresh(u.userId, res);
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Res({ passthrough: true }) res: Response) {
    await this.svc.logout(res);
  }

  @Get('me')
  async me(@CurrentUser() u: AuthedUser) {
    return this.svc.me(u.userId);
  }
}
