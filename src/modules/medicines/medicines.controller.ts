import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { MedicinesRepository } from './medicines.repository';

class UpdateMedicineNoteDto {
  @IsOptional() @IsNumber() @Min(0) @Max(5)
  rating?: number;
  @IsOptional() @IsString() @MaxLength(500)
  doctorNote?: string;
}

@Controller('medicines')
export class MedicinesController {
  constructor(private readonly repo: MedicinesRepository) {}

  @Get()
  list(@CurrentUser() u: AuthedUser, @Query('q') q?: string) {
    return this.repo.search(u.teamId, q);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateMedicineNoteDto,
  ) {
    return this.repo.updateNote(u.teamId, id, dto);
  }
}
