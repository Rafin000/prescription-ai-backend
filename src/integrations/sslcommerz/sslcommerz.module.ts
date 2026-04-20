import { Global, Module } from '@nestjs/common';
import { SslCommerzProvider } from './sslcommerz.provider';

@Global()
@Module({
  providers: [SslCommerzProvider],
  exports: [SslCommerzProvider],
})
export class SslCommerzModule {}
