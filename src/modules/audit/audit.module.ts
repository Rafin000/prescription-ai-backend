import { Global, Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';

@Global()
@Module({
  controllers: [AuditController],
  providers: [AuditRepository],
  exports: [AuditRepository],
})
export class AuditModule {}
