import { Global, Module } from '@nestjs/common';
import { InvoicesRepository } from './invoices.repository';

@Global()
@Module({
  providers: [InvoicesRepository],
  exports: [InvoicesRepository],
})
export class InvoicesModule {}
