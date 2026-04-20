import { Injectable } from '@nestjs/common';
import { DoctorsRepository } from './doctors.repository';
import { FilterDoctorsDto } from './dtos/filter-doctors.dto';

@Injectable()
export class DoctorsService {
  constructor(private readonly repo: DoctorsRepository) {}

  list(filter: FilterDoctorsDto) {
    return this.repo.list(filter);
  }

  getById(id: string) {
    return this.repo.getById(id);
  }
}
