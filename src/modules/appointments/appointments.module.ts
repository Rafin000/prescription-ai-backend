import { Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { PatientsModule } from 'src/modules/patients/patients.module';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsRepository } from './appointments.repository';
import { AppointmentsService } from './appointments.service';

@Module({
  imports: [DoctorsModule, PatientsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsRepository],
  exports: [AppointmentsService, AppointmentsRepository],
})
export class AppointmentsModule {}
