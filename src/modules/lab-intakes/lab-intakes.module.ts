import { Module } from '@nestjs/common';
import { PatientsModule } from 'src/modules/patients/patients.module';
import { LabIntakesController } from './lab-intakes.controller';
import { LabIntakesRepository } from './lab-intakes.repository';
import { LabIntakesService } from './lab-intakes.service';

@Module({
  imports: [PatientsModule],
  controllers: [LabIntakesController],
  providers: [LabIntakesService, LabIntakesRepository],
  exports: [LabIntakesService, LabIntakesRepository],
})
export class LabIntakesModule {}
