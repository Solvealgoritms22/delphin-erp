import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsWorker {
  private readonly logger = new Logger(NotificationsWorker.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Interval(5000)
  async processOutbox() {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { estado: 'PENDING', OR: [{ proximoIntentoEn: null }, { proximoIntentoEn: { lte: new Date() } }] },
        orderBy: { creadoEn: 'asc' },
        take: 50,
      });
      for (const event of events) {
        await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { estado: 'PROCESSING', intentos: { increment: 1 } } });
        try {
          const payload = JSON.parse(event.payload) as { notificationId: string };
          await this.notifications.deliver(payload.notificationId);
          await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { estado: 'PROCESSED', procesadoEn: new Date() } });
        } catch (error) {
          this.logger.error(`Notification event ${event.id} failed`, error);
          await this.prisma.outboxEvent.update({ where: { id: event.id }, data: { estado: 'PENDING', proximoIntentoEn: new Date(Date.now() + 60000) } });
        }
      }
    } finally {
      this.running = false;
    }
  }

  @Interval(86400000)
  async purgeExpired() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await this.prisma.notification.deleteMany({ where: { creadaEn: { lt: cutoff } } });
    await this.prisma.outboxEvent.deleteMany({ where: { creadoEn: { lt: cutoff }, estado: 'PROCESSED' } });
  }
}
