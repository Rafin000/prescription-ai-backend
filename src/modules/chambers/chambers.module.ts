import { Global, Module } from '@nestjs/common';
import { ChambersRepository } from './chambers.repository';

@Global()
@Module({
  providers: [ChambersRepository],
  exports: [ChambersRepository],
})
export class ChambersModule {}
