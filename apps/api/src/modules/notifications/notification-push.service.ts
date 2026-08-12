import { Injectable } from '@nestjs/common';
import webpush from 'web-push';

@Injectable()
export class NotificationPushService {
  private readonly enabled =
    process.env.WEB_PUSH_ENABLED === 'true' &&
    !!process.env.VAPID_PUBLIC_KEY &&
    !!process.env.VAPID_PRIVATE_KEY;

  constructor() {
    if (this.enabled) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@dolphin-erp.com',
        process.env.VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!,
      );
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  send(subscription: { endpoint: string; p256dh: string; auth: string }, payload: unknown) {
    if (!this.enabled) return Promise.resolve();
    return webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
  }
}
