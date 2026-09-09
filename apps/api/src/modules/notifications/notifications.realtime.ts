import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';

export interface NotificationRealtimeEvent {
  userId: string;
  source?: string;
  notification: unknown;
}

@Injectable()
export class NotificationsRealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsRealtimeService.name);
  private readonly instanceId = randomUUID();
  private readonly listeners = new Map<string, number>();
  private readonly streams = new Map<
    string,
    Subject<NotificationRealtimeEvent>
  >();
  private readonly publisher?: Redis;
  private readonly subscriber?: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.publisher = new Redis(redisUrl, { lazyConnect: true });
      this.subscriber = new Redis(redisUrl, { lazyConnect: true });
      this.publisher.on('error', () => this.logger.warn('Redis notification publisher unavailable'));
      this.subscriber.on('error', () => this.logger.warn('Redis notification subscriber unavailable'));
      void this.publisher.connect().catch(() => undefined);
      void this.subscriber
        .connect()
        .then(() => this.subscriber?.subscribe('notifications'))
        .catch(() => undefined);
      this.subscriber.on('message', (_channel, message) => {
        try {
          const event = JSON.parse(message) as NotificationRealtimeEvent;
          if (event.source !== this.instanceId) this.streams.get(event.userId)?.next(event);
        } catch { this.logger.warn('Invalid Redis notification event'); }
      });
    }
  }

  stream(userId: string): Observable<NotificationRealtimeEvent> {
    return new Observable(subscriber => {
      const stream = this.localStream(userId);
      this.listeners.set(userId, (this.listeners.get(userId) || 0) + 1);
      const subscription = stream.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        const remaining = (this.listeners.get(userId) || 1) - 1;
        if (remaining > 0) this.listeners.set(userId, remaining);
        else { this.listeners.delete(userId); this.streams.delete(userId); stream.complete(); }
      };
    });
  }

  publish(userId: string, notification: unknown): void {
    const event = { userId, notification, source: this.instanceId };
    this.streams.get(userId)?.next(event);
    void this.publisher
      ?.publish('notifications', JSON.stringify(event))
      .catch(() => undefined);
  }

  private localStream(userId: string): Subject<NotificationRealtimeEvent> {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new Subject<NotificationRealtimeEvent>();
      this.streams.set(userId, stream);
    }
    return stream;
  }

  async onModuleDestroy(): Promise<void> {
    for (const stream of this.streams.values()) stream.complete();
    await this.publisher?.quit();
    await this.subscriber?.quit();
  }
}
