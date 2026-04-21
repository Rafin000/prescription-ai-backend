import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { ChambersRepository } from './chambers.repository';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';

class ChamberDto {
  @IsString() @MaxLength(120) name!: string;
  @IsString() @MaxLength(240) address!: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() @MaxLength(60) area?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsString() @MaxLength(60) timeLabel?: string;
  @IsOptional() @Type(() => Number) @IsLatitude() lat?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() lng?: number;
}

@Controller('chambers')
export class ChambersController {
  constructor(
    private readonly repo: ChambersRepository,
    private readonly doctors: DoctorsRepository,
  ) {}

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() u: AuthedUser, @Body() dto: ChamberDto) {
    const doctor = await this.doctors.findByUserId(u.userId);
    if (!doctor || doctor.team_id !== u.teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    const row = await this.repo.createForDoctor(u.teamId, doctor.id, dto);
    return {
      id: row.id,
      name: (row.data as { name?: string })?.name ?? dto.name,
      address: (row.data as { address?: string })?.address ?? dto.address,
      phone: (row.data as { phone?: string })?.phone ?? dto.phone,
      area: row.area,
      lat: row.lat,
      lng: row.lng,
      timeLabel: (row.data as { time_label?: string })?.time_label ?? dto.timeLabel,
    };
  }

  @Patch(':id')
  async update(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ChamberDto,
  ) {
    const row = await this.repo.updateOne(u.teamId, id, dto);
    if (!row) throw new NotFoundException('Chamber not found');
    return {
      id: row.id,
      name: (row.data as { name?: string })?.name ?? dto.name,
      address: (row.data as { address?: string })?.address ?? dto.address,
      phone: (row.data as { phone?: string })?.phone ?? dto.phone,
      area: row.area,
      lat: row.lat,
      lng: row.lng,
      timeLabel: (row.data as { time_label?: string })?.time_label ?? dto.timeLabel,
    };
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    await this.repo.archive(u.teamId, id);
  }
}
