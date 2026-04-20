import { Module } from '@nestjs/common';
import { DoctorController, PublicDoctorsController } from './doctors.controller';
import { DoctorsRepository } from './doctors.repository';
import { DoctorsService } from './doctors.service';

@Module({
  controllers: [PublicDoctorsController, DoctorController],
  providers: [DoctorsService, DoctorsRepository],
  exports: [DoctorsService, DoctorsRepository],
})
export class DoctorsModule {}
