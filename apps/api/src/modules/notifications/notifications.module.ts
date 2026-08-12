import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { NotificationsController } from './notifications.controller';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPushService } from './notification-push.service';
import { NotificationsRealtimeService } from './notifications.realtime';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';

@Module({
  imports: [MailerModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRealtimeService,
    NotificationEmailService,
    NotificationPushService,
    NotificationsWorker,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
