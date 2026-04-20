import { Global, Module } from '@nestjs/common';
import { SubscriptionsRepository } from './subscriptions.repository';

@Global()
@Module({
  providers: [SubscriptionsRepository],
  exports: [SubscriptionsRepository],
})
export class SubscriptionsModule {}
