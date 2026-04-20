import {
  Body,
  Controller,
  HttpCode,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';
import { SaveProfileDto } from './dtos/save-profile.dto';
import { SaveChambersDto } from './dtos/save-chambers.dto';
import { SaveAvailabilityDto } from './dtos/save-availability.dto';
import { SavePreferencesBody } from './dtos/save-preferences.dto';
import { SkipStepDto } from './dtos/skip-step.dto';
import { CheckoutDto } from './dtos/checkout.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly svc: OnboardingService) {}

  @Put('profile')
  @HttpCode(200)
  saveProfile(@CurrentUser() u: AuthedUser, @Body() dto: SaveProfileDto) {
    return this.svc.saveProfile(u.teamId, u.userId, u.role, dto);
  }

  @Put('chambers')
  @HttpCode(200)
  saveChambers(@CurrentUser() u: AuthedUser, @Body() dto: SaveChambersDto) {
    return this.svc.saveChambers(u.teamId, u.userId, u.role, dto);
  }

  @Put('availability')
  @HttpCode(200)
  saveAvailability(
    @CurrentUser() u: AuthedUser,
    @Body() dto: SaveAvailabilityDto,
  ) {
    return this.svc.saveAvailability(u.teamId, u.userId, u.role, dto);
  }

  @Put('preferences')
  @HttpCode(200)
  savePreferences(
    @CurrentUser() u: AuthedUser,
    @Body() dto: SavePreferencesBody,
  ) {
    return this.svc.savePreferences(u.teamId, u.userId, u.role, dto);
  }

  @Post('skip')
  @HttpCode(200)
  skip(@CurrentUser() u: AuthedUser, @Body() dto: SkipStepDto) {
    return this.svc.skip(u.teamId, u.userId, u.role, dto);
  }

  @Post('checkout')
  @HttpCode(200)
  checkout(@CurrentUser() u: AuthedUser, @Body() dto: CheckoutDto) {
    return this.svc.checkout(u.teamId, u.userId, u.role, dto);
  }

  @Post('finish')
  @HttpCode(200)
  finish(@CurrentUser() u: AuthedUser) {
    return this.svc.finish(u.teamId, u.userId, u.role);
  }
}
