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
      await this.prisma.outboxEvent.updateMany({
        where: {
          tipo: 'NOTIFICATION_CREATED',
          estado: 'PROCESSING',
          intentos: { gte: 5 },
          proximoIntentoEn: { lte: new Date() },
        },
        data: { estado: 'DEAD_LETTER' },
      });
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          tipo: 'NOTIFICATION_CREATED',
          intentos: { lt: 5 },
          OR: [
            {
              estado: 'PENDING',
              OR: [
                { proximoIntentoEn: null },
                { proximoIntentoEn: { lte: new Date() } },
              ],
            },
            { estado: 'PROCESSING', proximoIntentoEn: { lte: new Date() } },
          ],
        },
        orderBy: { creadoEn: 'asc' },
        take: 50,
      });
      for (const event of events) {
        const lease = new Date(Date.now() + 5 * 60_000);
        const claimed = await this.prisma.outboxEvent.updateMany({
          where: {
            id: event.id,
            estado: event.estado,
            intentos: event.intentos,
            proximoIntentoEn: event.proximoIntentoEn,
          },
          data: {
            estado: 'PROCESSING',
            intentos: { increment: 1 },
            proximoIntentoEn: lease,
          },
        });
        if (claimed.count !== 1) continue;
        try {
          const payload = JSON.parse(event.payload) as {
            notificationId: string;
          };
          await this.notifications.deliver(payload.notificationId);
          await this.prisma.outboxEvent.updateMany({
            where: {
              id: event.id,
              estado: 'PROCESSING',
              proximoIntentoEn: lease,
            },
            data: { estado: 'PROCESSED', procesadoEn: new Date() },
          });
        } catch {
          this.logger.error(
            `Notification event ${event.id} failed; attempt ${event.intentos + 1}`,
          );
          await this.prisma.outboxEvent.updateMany({
            where: {
              id: event.id,
              estado: 'PROCESSING',
              proximoIntentoEn: lease,
            },
            data: {
              estado: event.intentos + 1 >= 5 ? 'DEAD_LETTER' : 'PENDING',
              proximoIntentoEn: new Date(
                Date.now() + Math.min(3600_000, 60_000 * 2 ** event.intentos),
              ),
            },
          });
        }
      }
    } finally {
      this.running = false;
    }
  }

  @Interval(86400000)
  async purgeExpired() {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await this.prisma.notification.deleteMany({
      where: { creadaEn: { lt: cutoff } },
    });
    await this.prisma.outboxEvent.deleteMany({
      where: { creadoEn: { lt: cutoff }, estado: 'PROCESSED' },
    });
  }
}
