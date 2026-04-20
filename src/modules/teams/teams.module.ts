import { Global, Module } from '@nestjs/common';
import { TeamsRepository } from './teams.repository';

@Global()
@Module({
  providers: [TeamsRepository],
  exports: [TeamsRepository],
})
export class TeamsModule {}
