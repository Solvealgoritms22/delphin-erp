import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { NotificationsController } from './notifications.controller';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPushService } from './notification-push.service';
import { NotificationsRealtimeService } from './notifications.realtime';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';
import { NotificationAlertsService } from './notification-alerts.service';

@Global()
@Module({
  imports: [MailerModule, EmailTemplatesModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRealtimeService,
    NotificationEmailService,
    NotificationPushService,
    NotificationsWorker,
    NotificationAlertsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
