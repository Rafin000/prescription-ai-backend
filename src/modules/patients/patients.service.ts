import { BadRequestException, Injectable } from '@nestjs/common';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { PatientsRepository } from './patients.repository';
import { CreatePatientDto, UpdatePatientDto } from './dtos/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    private readonly patients: PatientsRepository,
    private readonly doctors: DoctorsRepository,
  ) {}

  list(teamId: string, userId: string, q?: string) {
    return this.resolveDoctor(teamId, userId).then((doctorId) =>
      this.patients.list(teamId, doctorId, q),
    );
  }

  get(teamId: string, id: string) {
    return this.patients.getById(teamId, id);
  }

  async create(teamId: string, userId: string, dto: CreatePatientDto) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    return this.patients.create(teamId, doctorId, dto);
  }

  update(teamId: string, id: string, dto: UpdatePatientDto) {
    return this.patients.update(teamId, id, dto);
  }

  private async resolveDoctor(teamId: string, userId: string): Promise<string> {
    const d = await this.doctors.findByUserId(userId);
    if (!d || d.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    return d.id;
  }
}
