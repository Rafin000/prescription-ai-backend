import { Injectable } from '@nestjs/common';
import { PrescriptionsRepository } from './prescriptions.repository';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly repo: PrescriptionsRepository) {}

  get(teamId: string, id: string) {
    return this.repo.getById(teamId, id);
  }

  listForPatient(teamId: string, patientId: string) {
    return this.repo.listForPatient(teamId, patientId);
  }
}
