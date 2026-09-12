import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import Redis, { RedisOptions } from 'ioredis';
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

  private publisherWarned = false;
  private subscriberWarned = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL?.trim();
    if (redisUrl && redisUrl !== 'disabled' && redisUrl !== 'none') {
      const options: RedisOptions = {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          // Backoff exponencial para evitar saturar CPU y logs si Redis no está disponible
          if (times > 5) {
            return 30000; // Máximo 1 intento cada 30 segundos
          }
          return Math.min(times * 2000, 30000);
        },
        reconnectOnError: () => false,
      };

      this.publisher = new Redis(redisUrl, options);
      this.subscriber = new Redis(redisUrl, options);

      this.publisher.on('error', (err: any) => {
        if (!this.publisherWarned) {
          this.logger.warn(
            `Redis notification publisher unavailable (${err?.code || err?.message || 'connection failed'}). Running with in-memory fallback.`,
          );
          this.publisherWarned = true;
        }
      });

      this.publisher.on('ready', () => {
        if (this.publisherWarned) {
          this.logger.log('Redis notification publisher reconnected.');
          this.publisherWarned = false;
        }
      });

      this.subscriber.on('error', (err: any) => {
        if (!this.subscriberWarned) {
          this.logger.warn(
            `Redis notification subscriber unavailable (${err?.code || err?.message || 'connection failed'}). Running with in-memory fallback.`,
          );
          this.subscriberWarned = true;
        }
      });

      this.subscriber.on('ready', () => {
        if (this.subscriberWarned) {
          this.logger.log('Redis notification subscriber reconnected.');
          this.subscriberWarned = false;
        }
        void this.subscriber?.subscribe('notifications').catch(() => undefined);
      });

      this.subscriber.on('message', (_channel, message) => {
        try {
          const event = JSON.parse(message) as NotificationRealtimeEvent;
          if (event.source !== this.instanceId)
            this.streams.get(event.userId)?.next(event);
        } catch {
          this.logger.warn('Invalid Redis notification event');
        }
      });

      void this.publisher.connect().catch(() => undefined);
      void this.subscriber.connect().catch(() => undefined);
    } else {
      this.logger.log(
        'Redis is not configured. Running in-memory realtime notification service.',
      );
    }
  }

  stream(userId: string): Observable<NotificationRealtimeEvent> {
    return new Observable((subscriber) => {
      const stream = this.localStream(userId);
      this.listeners.set(userId, (this.listeners.get(userId) || 0) + 1);
      const subscription = stream.subscribe(subscriber);
      return () => {
        subscription.unsubscribe();
        const remaining = (this.listeners.get(userId) || 1) - 1;
        if (remaining > 0) this.listeners.set(userId, remaining);
        else {
          this.listeners.delete(userId);
          this.streams.delete(userId);
          stream.complete();
        }
      };
    });
  }

  publish(userId: string, notification: unknown): void {
    const event = { userId, notification, source: this.instanceId };
    this.streams.get(userId)?.next(event);
    if (this.publisher && this.publisher.status === 'ready') {
      void this.publisher
        .publish('notifications', JSON.stringify(event))
        .catch(() => undefined);
    }
  }

  private localStream(userId: string): Subject<NotificationRealtimeEvent> {
    let stream = this.streams.get(userId);
    if (!stream) {
      stream = new Subject<NotificationRealtimeEvent>();
      this.streams.set(userId, stream);
    }
    return stream;
  }

  onModuleDestroy(): void {
    for (const stream of this.streams.values()) stream.complete();
    try {
      if (this.publisher && this.publisher.status !== 'end') {
        this.publisher.disconnect();
      }
      if (this.subscriber && this.subscriber.status !== 'end') {
        this.subscriber.disconnect();
      }
    } catch {
      // Ignorar errores de desconexión al cerrar
    }
  }
}
