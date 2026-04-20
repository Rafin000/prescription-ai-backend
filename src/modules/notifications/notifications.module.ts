import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';
import { SmsProvider } from './providers/sms.provider';
import { EmailProvider } from './providers/email.provider';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsRepository, SmsProvider, EmailProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
