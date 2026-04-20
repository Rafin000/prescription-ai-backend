import { Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { AppointmentsModule } from 'src/modules/appointments/appointments.module';
import { AppointmentRequestsController } from './appointment-requests.controller';
import { AppointmentRequestsRepository } from './appointment-requests.repository';
import { AppointmentRequestsService } from './appointment-requests.service';

@Module({
  imports: [DoctorsModule, AppointmentsModule],
  controllers: [AppointmentRequestsController],
  providers: [AppointmentRequestsService, AppointmentRequestsRepository],
  exports: [AppointmentRequestsService, AppointmentRequestsRepository],
})
export class AppointmentRequestsModule {}
