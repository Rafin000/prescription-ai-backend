import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { DoctorsRepository } from './doctors.repository';
import { DoctorsService } from './doctors.service';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService, DoctorsRepository],
  exports: [DoctorsService, DoctorsRepository],
})
export class DoctorsModule {}
