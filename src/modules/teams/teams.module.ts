import { Global, Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsRepository } from './teams.repository';

@Global()
@Module({
  controllers: [TeamsController],
  providers: [TeamsRepository],
  exports: [TeamsRepository],
})
export class TeamsModule {}
