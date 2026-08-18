import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { Observable, Subject } from 'rxjs';

export interface NotificationRealtimeEvent {
  userId: string;
  notification: unknown;
}

@Injectable()
export class NotificationsRealtimeService implements OnModuleDestroy {
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
      this.publisher.on('error', () => undefined);
      this.subscriber.on('error', () => undefined);
      void this.publisher.connect().catch(() => undefined);
      void this.subscriber
        .connect()
        .then(() => this.subscriber?.subscribe('notifications'))
        .catch(() => undefined);
      this.subscriber.on('message', (_channel, message) => {
        const event = JSON.parse(message) as NotificationRealtimeEvent;
        this.localStream(event.userId).next(event);
      });
    }
  }

  stream(userId: string): Observable<NotificationRealtimeEvent> {
    return this.localStream(userId).asObservable();
  }

  publish(userId: string, notification: unknown): void {
    const event = { userId, notification };
    this.localStream(userId).next(event);
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
