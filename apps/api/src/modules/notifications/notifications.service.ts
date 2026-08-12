import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationEmailService } from './notification-email.service';
import { NotificationPushService } from './notification-push.service';
import { NotificationsRealtimeService } from './notifications.realtime';

export interface CreateNotificationInput {
  usuarioId?: string;
  empresaId?: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  severidad?: string;
  icono?: string;
  payload?: Record<string, unknown>;
  canales?: string[];
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationsRealtimeService,
    private readonly email: NotificationEmailService,
    private readonly push: NotificationPushService,
  ) {}

  async create(input: CreateNotificationInput) {
    const recipients = input.usuarioId
      ? [{ id: input.usuarioId }]
      : await this.prisma.usuario.findMany({
          where: {
            membresias: { some: { empresaId: input.empresaId, estado: 'ACTIVO' } },
          },
          select: { id: true },
        });

    const notifications: any[] = [];
      for (const recipient of recipients) {
      const requestedChannels = input.canales || ['IN_APP'];
      const preferences = (await this.prisma.notificationPreference.findMany({
        where: {
          usuarioId: recipient.id,
          canal: { in: requestedChannels },
          tipo: { in: [input.tipo, 'ALL'] },
        },
      })) || [];
      const enabledChannels = requestedChannels.filter((canal) => {
        const specific = preferences.find((preference: any) => preference.tipo === input.tipo && preference.canal === canal);
        const global = preferences.find((preference: any) => preference.tipo === 'ALL' && preference.canal === canal);
        return (specific || global)?.habilitado !== false;
      });
      if (enabledChannels.length === 0) continue;

      const notification = await this.prisma.notification.create({
        data: {
          usuarioId: recipient.id,
          empresaId: input.empresaId,
          audience: input.usuarioId ? 'USER' : 'COMPANY',
          tipo: input.tipo,
          titulo: input.titulo,
          mensaje: input.mensaje,
          severidad: input.severidad || 'INFO',
          icono: input.icono,
          payload: input.payload ? JSON.stringify(input.payload) : null,
          deliveries: {
            create: enabledChannels.map((canal) => ({ canal })),
          },
        },
      });
      await this.prisma.outboxEvent.create({
        data: {
          tipo: 'NOTIFICATION_CREATED',
          aggregateId: notification.id,
          payload: JSON.stringify({ notificationId: notification.id }),
        },
      });
      this.realtime.publish(recipient.id, this.serialize(notification));
      notifications.push(this.serialize(notification));
    }
    return notifications;
  }

  async list(userId: string, query: { page?: number; limit?: number; unread?: boolean; tipo?: string }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const where = {
      OR: [{ usuarioId: userId }, { empresa: { membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } } } }],
      ...(query.unread ? { leidaEn: null } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
    } as any;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { creadaEn: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.notification.count({ where }),
    ]);
    return { items: items.map((item: any) => this.serialize(item)), total, page, limit };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        leidaEn: null,
        OR: [
          { usuarioId: userId },
          { empresa: { membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } } } },
        ],
      },
    }).then((count) => ({ count }));
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id,
        OR: [
          { usuarioId: userId },
          { empresa: { membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } } } },
        ],
      },
      data: { leidaEn: new Date() },
    });
    if (!result.count) throw new NotFoundException('Notificación no encontrada');
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        leidaEn: null,
        OR: [
          { usuarioId: userId },
          { empresa: { membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } } } },
        ],
      },
      data: { leidaEn: new Date() },
    });
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id,
        OR: [
          { usuarioId: userId },
          { empresa: { membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } } } },
        ],
      },
    });
    if (!result.count) throw new NotFoundException('Notificación no encontrada');
    return { success: true };
  }

  async clear(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        OR: [
          { usuarioId: userId },
          { empresa: { membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } } } },
        ],
      },
    });
    return { success: true, count: result.count };
  }

  preferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { usuarioId: userId }, orderBy: [{ tipo: 'asc' }, { canal: 'asc' }] });
  }

  savePreference(userId: string, tipo: string, canal: string, habilitado: boolean) {
    return this.prisma.notificationPreference.upsert({
      where: { usuarioId_tipo_canal: { usuarioId: userId, tipo, canal } },
      update: { habilitado },
      create: { usuarioId: userId, tipo, canal, habilitado },
    });
  }

  savePushSubscription(userId: string, data: { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: { usuarioId: userId, p256dh: data.keys.p256dh, auth: data.keys.auth, userAgent: data.userAgent, ultimoUsoEn: new Date() },
      create: { usuarioId: userId, endpoint: data.endpoint, p256dh: data.keys.p256dh, auth: data.keys.auth, userAgent: data.userAgent },
    });
  }

  stream(userId: string) {
    return this.realtime.stream(userId);
  }

  async deliver(notificationId: string) {
    const notification: any = await this.prisma.notification.findUnique({ where: { id: notificationId }, include: { usuario: true, deliveries: true } });
    if (!notification) return;
    for (const delivery of notification.deliveries) {
      try {
        let providerMessageId: string | undefined;
        if (delivery.canal === 'EMAIL' && notification.usuario?.email) {
          providerMessageId = await this.email.send(notification.usuario.email, notification.titulo, notification.mensaje);
        }
        if (delivery.canal === 'PUSH') {
          const subscriptions = await this.prisma.pushSubscription.findMany({ where: { usuarioId: notification.usuarioId } });
          await Promise.all(subscriptions.map((subscription: any) => this.push.send(subscription, this.serialize(notification))));
        }
        await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { estado: 'SENT', providerMessageId, enviadaEn: new Date() } });
      } catch (error) {
        await this.prisma.notificationDelivery.update({ where: { id: delivery.id }, data: { estado: 'RETRYING', intentos: { increment: 1 }, ultimoError: String(error), proximoIntentoEn: new Date(Date.now() + 60000) } });
      }
    }
  }

  private serialize(item: any) {
    return { ...item, payload: item.payload ? JSON.parse(item.payload) : null };
  }
}
