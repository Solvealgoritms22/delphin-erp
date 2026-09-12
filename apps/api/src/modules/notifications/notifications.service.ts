import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { normalizePermissions } from '../../common/permissions.util';
import { TenantContext } from '../../common/tenant/tenant-context';
import { filter } from 'rxjs';
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
  deduplicationKey?: string;
}

import { NOTIFICATION_CATALOG } from './notification.catalog';
export { NOTIFICATION_CATALOG } from './notification.catalog';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: NotificationsRealtimeService,
    private readonly email: NotificationEmailService,
    private readonly push: NotificationPushService,
  ) {}

  async create(input: CreateNotificationInput) {
    if (!input.usuarioId && !input.empresaId)
      throw new BadRequestException('Destinatario requerido');
    const catalog = NOTIFICATION_CATALOG.find((item) => item.id === input.tipo);
    const recipients = await this.recipients(input);
    const notifications: any[] = [];
    for (const recipient of recipients) {
      const defaults = catalog?.defaultChannels || input.canales || ['IN_APP'];
      const requestedChannels = ['IN_APP', 'EMAIL', 'PUSH'];
      const preferences =
        (await this.prisma.notificationPreference.findMany({
          where: {
            usuarioId: recipient.id,
            canal: { in: requestedChannels },
            tipo: { in: [input.tipo, 'ALL'] },
          },
        })) || [];
      const enabledChannels = requestedChannels.filter((canal) => {
        const specific = preferences.find(
          (preference: any) =>
            preference.tipo === input.tipo && preference.canal === canal,
        );
        const global = preferences.find(
          (preference: any) =>
            preference.tipo === 'ALL' && preference.canal === canal,
        );
        return (specific || global)?.habilitado ?? defaults.includes(canal);
      });
      if (enabledChannels.length === 0) continue;

      const id = input.deduplicationKey
        ? createHash('sha256')
            .update(
              JSON.stringify([
                input.empresaId,
                recipient.id,
                input.tipo,
                input.deduplicationKey,
              ]),
            )
            .digest('hex')
        : undefined;
      const notification = await this.prisma
        .$transaction(async (tx) => {
          if (
            id &&
            (await tx.notification.findUnique({
              where: { id },
              select: { id: true },
            }))
          )
            return null;
          const created = await tx.notification.create({
            data: {
              id,
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
          await tx.outboxEvent.create({
            data: {
              tipo: 'NOTIFICATION_CREATED',
              empresaId: input.empresaId,
              aggregateId: created.id,
              payload: JSON.stringify({ notificationId: created.id }),
            },
          });
          return created;
        })
        .catch((error) => {
          if (
            id &&
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          )
            return null;
          throw error;
        });
      if (!notification) continue;
      if (enabledChannels.includes('IN_APP'))
        this.realtime.publish(recipient.id, this.serialize(notification));
      notifications.push(this.serialize(notification));
    }
    return notifications;
  }

  async list(
    userId: string,
    query: { page?: number; limit?: number; unread?: boolean; tipo?: string },
  ) {
    const page =
      Number.isInteger(query.page) && query.page! > 0 ? query.page! : 1;
    const limit =
      Number.isInteger(query.limit) && query.limit! > 0
        ? Math.min(query.limit!, 100)
        : 25;
    const where = {
      usuarioId: userId,
      empresaId: TenantContext.getTenantId(),
      deliveries: { some: { canal: 'IN_APP' } },
      ...(query.unread ? { leidaEn: null } : {}),
      ...(query.tipo ? { tipo: query.tipo } : {}),
    } as any;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { creadaEn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return {
      items: items.map((item: any) => this.serialize(item)),
      total,
      page,
      limit,
    };
  }

  unreadCount(userId: string) {
    return this.prisma.notification
      .count({
        where: {
          leidaEn: null,
          deliveries: { some: { canal: 'IN_APP' } },
          usuarioId: userId,
          empresaId: TenantContext.getTenantId(),
        },
      })
      .then((count) => ({ count }));
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id,
        usuarioId: userId,
        empresaId: TenantContext.getTenantId(),
      },
      data: { leidaEn: new Date() },
    });
    if (!result.count)
      throw new NotFoundException('Notificación no encontrada');
    return { success: true };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        leidaEn: null,
        usuarioId: userId,
        empresaId: TenantContext.getTenantId(),
      },
      data: { leidaEn: new Date() },
    });
    return { success: true };
  }

  async remove(userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        id,
        usuarioId: userId,
        empresaId: TenantContext.getTenantId(),
      },
    });
    if (!result.count)
      throw new NotFoundException('Notificación no encontrada');
    return { success: true };
  }

  async clear(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        usuarioId: userId,
        empresaId: TenantContext.getTenantId(),
      },
    });
    return { success: true, count: result.count };
  }

  preferences(userId: string) {
    return this.prisma.notificationPreference.findMany({
      where: { usuarioId: userId },
      orderBy: [{ tipo: 'asc' }, { canal: 'asc' }],
    });
  }

  getCatalog() {
    return NOTIFICATION_CATALOG;
  }

  pushConfiguration() {
    return {
      enabled: this.push.isEnabled(),
      publicKey: this.push.isEnabled() ? process.env.VAPID_PUBLIC_KEY : null,
    };
  }

  savePreference(
    userId: string,
    tipo: string,
    canal: string,
    habilitado: boolean,
  ) {
    this.validatePreference(tipo, canal, habilitado);
    return this.prisma.notificationPreference.upsert({
      where: { usuarioId_tipo_canal: { usuarioId: userId, tipo, canal } },
      update: { habilitado },
      create: { usuarioId: userId, tipo, canal, habilitado },
    });
  }

  async savePreferencesBatch(
    userId: string,
    preferences: Array<{ tipo: string; canal: string; habilitado: boolean }>,
  ) {
    if (!Array.isArray(preferences) || preferences.length > 300)
      throw new BadRequestException('Preferencias inválidas');
    for (const p of preferences)
      this.validatePreference(p?.tipo, p?.canal, p?.habilitado);
    return this.prisma.$transaction(
      preferences.map((p) =>
        this.prisma.notificationPreference.upsert({
          where: {
            usuarioId_tipo_canal: {
              usuarioId: userId,
              tipo: p.tipo,
              canal: p.canal,
            },
          },
          update: { habilitado: p.habilitado },
          create: {
            usuarioId: userId,
            tipo: p.tipo,
            canal: p.canal,
            habilitado: p.habilitado,
          },
        }),
      ),
    );
  }

  async resetPreferences(userId: string) {
    await this.prisma.notificationPreference.deleteMany({
      where: { usuarioId: userId },
    });
    return { success: true };
  }

  savePushSubscription(
    userId: string,
    data: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
      userAgent?: string;
    },
  ) {
    let endpoint: URL;
    try {
      endpoint = new URL(data?.endpoint);
    } catch {
      throw new BadRequestException('Suscripción push inválida');
    }
    const hosts = [
      'fcm.googleapis.com',
      'updates.push.services.mozilla.com',
      'push.services.mozilla.com',
      'web.push.apple.com',
      'notify.windows.com',
    ];
    if (
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      (endpoint.port && endpoint.port !== '443') ||
      !hosts.some(
        (host) =>
          endpoint.hostname === host || endpoint.hostname.endsWith('.' + host),
      )
    )
      throw new BadRequestException('Proveedor push no permitido');
    if (
      !data.keys ||
      !/^[A-Za-z0-9_+/=-]+$/.test(data.keys.p256dh || '') ||
      !/^[A-Za-z0-9_+/=-]+$/.test(data.keys.auth || '') ||
      Buffer.from(data.keys.p256dh, 'base64').length !== 65 ||
      Buffer.from(data.keys.auth, 'base64').length !== 16
    )
      throw new BadRequestException('Claves push inválidas');
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      update: {
        usuarioId: userId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
        ultimoUsoEn: new Date(),
      },
      create: {
        usuarioId: userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
    });
  }

  stream(userId: string) {
    const empresaId = TenantContext.getTenantId();
    return this.realtime
      .stream(userId)
      .pipe(
        filter(
          (event) =>
            (event.notification as { empresaId?: string }).empresaId ===
            empresaId,
        ),
      );
  }

  async deliver(notificationId: string) {
    const notification: any = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { usuario: true, deliveries: true },
    });
    if (!notification) return;
    const allowed = await this.recipients({
      empresaId: notification.empresaId,
      usuarioId: notification.usuarioId,
      tipo: notification.tipo,
    });
    if (!allowed.length) {
      await this.prisma.notificationDelivery.updateMany({
        where: { notificationId, estado: { not: 'SENT' } },
        data: { estado: 'SKIPPED' },
      });
      return;
    }
    let failed = false;
    for (const delivery of notification.deliveries) {
      if (['SENT', 'SKIPPED'].includes(delivery.estado)) continue;
      try {
        let providerMessageId: string | undefined;
        const preferences = await this.prisma.notificationPreference.findMany({
          where: {
            usuarioId: notification.usuarioId,
            tipo: { in: [notification.tipo, 'ALL'] },
            canal: delivery.canal,
          },
        });
        const preference =
          preferences.find((p) => p.tipo === notification.tipo) ||
          preferences.find((p) => p.tipo === 'ALL');
        if (preference?.habilitado === false) {
          await this.prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: { estado: 'SKIPPED' },
          });
          continue;
        }
        if (delivery.canal === 'EMAIL') {
          if (!notification.usuario?.email)
            throw new Error('Email recipient unavailable');
          providerMessageId = await this.email.send(
            notification.usuario.email,
            notification.titulo,
            notification.mensaje,
            {
              empresaId: notification.empresaId,
              tipo: notification.tipo,
              name: notification.usuario.nombre || notification.usuario.email,
              deliveryId: delivery.id,
            },
          );
        }
        if (delivery.canal === 'PUSH') {
          if (!this.push.isEnabled())
            throw new Error('Push delivery is not configured');
          const subscriptions = await this.prisma.pushSubscription.findMany({
            where: { usuarioId: notification.usuarioId },
          });
          if (!subscriptions.length) {
            await this.prisma.notificationDelivery.update({
              where: { id: delivery.id },
              data: { estado: 'SKIPPED' },
            });
            continue;
          }
          await Promise.all(
            subscriptions.map((subscription: any) =>
              this.push.send(subscription, this.serialize(notification)),
            ),
          );
        }
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: { estado: 'SENT', providerMessageId, enviadaEn: new Date() },
        });
      } catch {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            estado: 'RETRYING',
            intentos: { increment: 1 },
            ultimoError: 'Delivery failed',
            proximoIntentoEn: new Date(Date.now() + 60000),
          },
        });
        failed = true;
      }
    }
    if (failed) throw new Error('One or more notification channels failed');
  }

  private async recipients(
    input: Pick<CreateNotificationInput, 'usuarioId' | 'empresaId' | 'tipo'>,
  ) {
    if (!input.empresaId)
      return input.usuarioId ? [{ id: input.usuarioId }] : [];
    const company = await this.prisma.empresa.findFirst({
      where: { id: input.empresaId, estado: 'ACTIVA' },
      select: { propietarioId: true },
    });
    if (!company) return [];
    const members = await this.prisma.membresia.findMany({
      where: {
        empresaId: input.empresaId,
        estado: 'ACTIVO',
        ...(input.usuarioId ? { usuarioId: input.usuarioId } : {}),
      },
      include: { role: true },
    });
    const category = NOTIFICATION_CATALOG.find(
      (event) => event.id === input.tipo,
    )?.category;
    const permission =
      (
        {
          billing_fiscal: 'invoices:read',
          sales_quotes: 'commercial:read',
          cxc_payments: 'commercial:read',
          inventory_stock: 'inventory:read',
          purchases_cxp: 'commercial:read',
          backups: 'backups:read',
          security_account: 'security:read',
        } as Record<string, string>
      )[category || ''] || 'company:read';
    const ids = new Set<string>();
    if (
      company.propietarioId &&
      (!input.usuarioId || input.usuarioId === company.propietarioId)
    )
      ids.add(company.propietarioId);
    for (const member of members) {
      const permissions = normalizePermissions(member.role?.permissions);
      const ownSecurity =
        input.usuarioId === member.usuarioId &&
        input.tipo.startsWith('SECURITY_');
      if (
        ownSecurity ||
        permissions.includes('*') ||
        permissions.includes(permission)
      )
        ids.add(member.usuarioId);
    }
    return [...ids].map((id) => ({ id }));
  }

  private validatePreference(tipo: string, canal: string, habilitado: boolean) {
    if (
      (tipo !== 'ALL' &&
        !NOTIFICATION_CATALOG.some((item) => item.id === tipo)) ||
      !['IN_APP', 'EMAIL', 'PUSH'].includes(canal) ||
      typeof habilitado !== 'boolean'
    )
      throw new BadRequestException('Preferencia de notificación inválida');
  }

  private serialize(item: any) {
    return { ...item, payload: item.payload ? JSON.parse(item.payload) : null };
  }
}
