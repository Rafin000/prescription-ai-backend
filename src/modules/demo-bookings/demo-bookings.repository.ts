import { BadRequestException, Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { ClsService } from 'nestjs-cls';
import { BaseRepository } from 'src/base/base.repository';
import { DatabaseService } from 'src/modules/database/database.service';
import { CreateDemoBookingDto } from './dtos/create-demo-booking.dto';
import { demoBookingResource } from './transformers/demo-booking.resource';
import { DemoBookingRow } from './types/demo-booking.model';

@Injectable()
export class DemoBookingsRepository extends BaseRepository {
  private readonly UPSERT_SQL: string;

  constructor(cls: ClsService, db: DatabaseService) {
    super(cls, db);
    this.UPSERT_SQL = readFileSync(
      join(__dirname, 'queries/upsert-demo-booking.sql'),
      'utf-8',
    );
  }

  async create(dto: CreateDemoBookingDto) {
    const client = await this.getClient();
    const data = {
      name: dto.name ?? null,
      practice: dto.practice ?? null,
      specialty: dto.specialty ?? null,
      preferred_slot: dto.preferredSlot ?? null,
      calendly_event_uri: dto.calendlyEventUri ?? null,
      notes: dto.notes ?? null,
    };
    const status = dto.calendlyEventUri ? 'scheduled' : 'submitted';
    const result = await client.query<DemoBookingRow>(this.UPSERT_SQL, [
      dto.email,
      dto.phone ?? null,
      dto.clientNonce ?? null,
      JSON.stringify(data),
      status,
    ]);
    if (!result.rows.length) {
      throw new BadRequestException('Could not record demo booking');
    }
    return demoBookingResource.transform(result.rows[0]);
  }
}
