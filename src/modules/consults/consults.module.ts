import { Global, Module } from '@nestjs/common';
import { ConsultsRepository } from './consults.repository';

@Global()
@Module({
  providers: [ConsultsRepository],
  exports: [ConsultsRepository],
})
export class ConsultsModule {}
