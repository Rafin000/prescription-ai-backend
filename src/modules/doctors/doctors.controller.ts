import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { Public } from 'src/decorators/public.decorator';
import { DoctorsService } from './doctors.service';
import { DoctorsRepository } from './doctors.repository';
import { FilterDoctorsDto } from './dtos/filter-doctors.dto';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';

const PHONE_REGEX = /^\+?[0-9\s\-()]{6,20}$/;

class PatchDoctorDto {
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(80) nameBn?: string;
  @IsOptional() @IsString() @MaxLength(60) specialty?: string;
  @IsOptional() @IsString() @MaxLength(40) bmdcNo?: string;
  @IsOptional() @IsString() @Matches(PHONE_REGEX) @MaxLength(20) phone?: string;
  @IsOptional() @IsString() @MaxLength(120) email?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) degrees?: string[];
  @IsOptional() @IsString() @MaxLength(500) signatureUrl?: string;
}

/** Public directory endpoints. No auth. CDN-cacheable. */
@Controller('public/doctors')
export class PublicDoctorsController {
  constructor(private readonly svc: DoctorsService) {}

  @Public()
  @Get()
  list(@Query() filter: FilterDoctorsDto) {
    return this.svc.list(filter);
  }

  @Public()
  @Get(':id')
  getById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.svc.getById(id);
  }
}

/** Authed doctor-profile endpoints for the current user. */
@Controller('doctor')
export class DoctorController {
  constructor(
    private readonly svc: DoctorsService,
    private readonly repo: DoctorsRepository,
  ) {}

  @Get('me')
  async me(@CurrentUser() u: AuthedUser) {
    const row = await this.repo.findByUserId(u.userId);
    if (!row) return null;
    return this.svc.getById(row.id);
  }

  @Patch('me')
  async patchMe(@CurrentUser() u: AuthedUser, @Body() dto: PatchDoctorDto) {
    const row = await this.repo.findByUserId(u.userId);
    if (!row) return null;
    await this.repo.updateProfile(u.teamId, row.id, {
      name: dto.name,
      specialty: dto.specialty,
      bmdcNo: dto.bmdcNo,
      phone: dto.phone,
      email: dto.email,
      dataMerge: {
        name_bn: dto.nameBn ?? undefined,
        degrees: dto.degrees ?? undefined,
        signature_url: dto.signatureUrl ?? undefined,
      },
    });
    return this.svc.getById(row.id);
  }

  /** Availability lives in doctors.data.availability — opaque jsonb. */
  @Get('availability')
  async availability(@CurrentUser() u: AuthedUser) {
    const row = await this.repo.findByUserId(u.userId);
    const avail = (row?.data as { availability?: unknown } | undefined)?.availability;
    return avail ?? { inPerson: {}, video: [] };
  }
}
