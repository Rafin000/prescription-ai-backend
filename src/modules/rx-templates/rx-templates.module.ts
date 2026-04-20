import { Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { RxTemplatesController } from './rx-templates.controller';
import { RxTemplatesRepository } from './rx-templates.repository';
import { RxTemplatesService } from './rx-templates.service';

@Module({
  imports: [DoctorsModule],
  controllers: [RxTemplatesController],
  providers: [RxTemplatesService, RxTemplatesRepository],
  exports: [RxTemplatesService, RxTemplatesRepository],
})
export class RxTemplatesModule {}
