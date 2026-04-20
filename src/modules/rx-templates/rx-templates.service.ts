import { BadRequestException, Injectable } from '@nestjs/common';
import { DoctorsRepository } from 'src/modules/doctors/doctors.repository';
import { RxTemplatesRepository } from './rx-templates.repository';
import { UpsertRxTemplateDto } from './dtos/rx-template.dto';
import { ROLES } from 'src/base/base.constants';
import { RxTemplateData } from './types/rx-template.model';

@Injectable()
export class RxTemplatesService {
  constructor(
    private readonly repo: RxTemplatesRepository,
    private readonly doctors: DoctorsRepository,
  ) {}

  async list(teamId: string, userId: string) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    return this.repo.list(teamId, doctorId);
  }

  async create(teamId: string, userId: string, role: string, dto: UpsertRxTemplateDto) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    const shared = !!dto.shared && role === ROLES.OWNER;
    return this.repo.create({
      teamId,
      doctorId,
      shared,
      name: dto.name,
      description: dto.description,
      data: this.toData(dto),
    });
  }

  async update(
    teamId: string,
    userId: string,
    role: string,
    id: string,
    dto: UpsertRxTemplateDto,
  ) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    const shared = dto.shared === undefined ? undefined : !!dto.shared && role === ROLES.OWNER;
    return this.repo.update({
      teamId,
      doctorId,
      id,
      name: dto.name,
      description: dto.description ?? null,
      shared,
      data: this.toData(dto),
      isOwner: role === ROLES.OWNER,
    });
  }

  async remove(teamId: string, userId: string, role: string, id: string) {
    const doctorId = await this.resolveDoctor(teamId, userId);
    await this.repo.remove(teamId, doctorId, id, role === ROLES.OWNER);
  }

  async use(teamId: string, id: string) {
    return this.repo.bumpUsage(teamId, id);
  }

  private async resolveDoctor(teamId: string, userId: string): Promise<string> {
    const d = await this.doctors.findByUserId(userId);
    if (!d || d.team_id !== teamId) {
      throw new BadRequestException('Doctor profile missing');
    }
    return d.id;
  }

  private toData(dto: UpsertRxTemplateDto): RxTemplateData {
    return {
      chief_complaint: dto.chiefComplaint,
      diagnoses: dto.diagnoses,
      tests: dto.tests,
      advice: dto.advice,
      medicines: dto.medicines,
      follow_up: dto.followUp,
      notes: dto.notes,
      tags: dto.tags,
    };
  }
}
