import { Global, Module } from '@nestjs/common';
import { DoctorsModule } from 'src/modules/doctors/doctors.module';
import { ChambersController } from './chambers.controller';
import { ChambersRepository } from './chambers.repository';

@Global()
@Module({
  imports: [DoctorsModule],
  controllers: [ChambersController],
  providers: [ChambersRepository],
  exports: [ChambersRepository],
})
export class ChambersModule {}
