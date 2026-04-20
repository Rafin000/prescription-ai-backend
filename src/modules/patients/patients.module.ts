import { Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { ConsultsModule } from 'src/modules/consults/consults.module';
import { PatientsController } from './patients.controller';
import { PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';

@Module({
  imports: [DoctorsModule, ConsultsModule],
  controllers: [PatientsController],
  providers: [PatientsService, PatientsRepository],
  exports: [PatientsService, PatientsRepository],
})
export class PatientsModule {}
