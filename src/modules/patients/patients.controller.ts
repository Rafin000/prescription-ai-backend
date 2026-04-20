import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, AuthedUser } from 'src/decorators/current-user.decorator';
import { PatientsService } from './patients.service';
import { ConsultsRepository } from 'src/modules/consults/consults.repository';
import { PrescriptionsRepository } from 'src/modules/prescriptions/prescriptions.repository';
import { CreatePatientDto, UpdatePatientDto } from './dtos/create-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(
    private readonly svc: PatientsService,
    private readonly consults: ConsultsRepository,
    private readonly prescriptions: PrescriptionsRepository,
  ) {}

  @Get()
  list(@CurrentUser() u: AuthedUser, @Query('q') q?: string) {
    return this.svc.list(u.teamId, u.userId, q);
  }

  @Get(':id')
  get(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.svc.get(u.teamId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthedUser, @Body() dto: CreatePatientDto) {
    return this.svc.create(u.teamId, u.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.svc.update(u.teamId, id, dto);
  }

  @Get(':id/visits')
  visits(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.consults.listForPatient(u.teamId, id);
  }

  @Get(':id/prescriptions')
  listPrescriptions(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.prescriptions.listForPatient(u.teamId, id);
  }

  /** Latest finalised Rx medicines = what the patient is currently on. */
  @Get(':id/active-meds')
  async activeMeds(
    @CurrentUser() u: AuthedUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const latest = await this.prescriptions.latestFinalForPatient(u.teamId, id);
    if (!latest) return [];
    return (latest.data?.medicines ?? []).map((m, i) => ({
      id: `${latest.id}-${i}`,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      notes: m.notes,
      prescribedAt: (latest.finalised_at ?? latest.created_at).toISOString(),
    }));
  }

  /* Stubs until we have a vitals/labs source. */
  @Get(':id/vitals') vitals() { return []; }
  @Get(':id/labs')   labs()   { return []; }
}
