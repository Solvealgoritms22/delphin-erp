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

export interface NotificationCatalogItem {
  id: string;
  category: string;
  categoryLabel: string;
  name: string;
  description: string;
  icon: string;
  severity: string;
  defaultChannels: string[];
}

export const NOTIFICATION_CATALOG: NotificationCatalogItem[] = [
  // 1. Facturación Fiscal & DGII
  {
    id: 'INVOICE_EMITTED',
    category: 'billing_fiscal',
    categoryLabel: 'Facturación Fiscal & DGII',
    name: 'Factura Fiscal Emitida',
    description: 'Notifica cuando una factura es emitida exitosamente con NCF asignado.',
    icon: 'file-text',
    severity: 'SUCCESS',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'INVOICE_FISCAL_REJECTED',
    category: 'billing_fiscal',
    categoryLabel: 'Facturación Fiscal & DGII',
    name: 'Factura Rechazada por DGII',
    description: 'Alerta crítica si la DGII o FiscalBridge rechaza una factura electrónica.',
    icon: 'alert-triangle',
    severity: 'CRITICAL',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
  },
  {
    id: 'INVOICE_VOIDED',
    category: 'billing_fiscal',
    categoryLabel: 'Facturación Fiscal & DGII',
    name: 'Factura Anulada',
    description: 'Avisa cuando una factura de venta es cancelada y su inventario restaurado.',
    icon: 'x-circle',
    severity: 'WARNING',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'NCF_SEQUENCE_LOW',
    category: 'billing_fiscal',
    categoryLabel: 'Facturación Fiscal & DGII',
    name: 'Secuencia NCF por Agotarse',
    description: 'Alerta cuando a una secuencia de comprobantes le queda menos del 10% disponible.',
    icon: 'alert-circle',
    severity: 'WARNING',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
  },
  {
    id: 'NCF_SEQUENCE_EXPIRING',
    category: 'billing_fiscal',
    categoryLabel: 'Facturación Fiscal & DGII',
    name: 'Secuencia NCF Próxima a Vencer',
    description: 'Aviso anticipado cuando una secuencia fiscal de DGII está cerca de expirar.',
    icon: 'calendar-clock',
    severity: 'CRITICAL',
    defaultChannels: ['IN_APP', 'EMAIL'],
  },
  {
    id: 'CREDIT_NOTE_EMITTED',
    category: 'billing_fiscal',
    categoryLabel: 'Facturación Fiscal & DGII',
    name: 'Nota de Crédito Emitida',
    description: 'Notifica la emisión de una nota de crédito que modifica una factura.',
    icon: 'file-minus',
    severity: 'INFO',
    defaultChannels: ['IN_APP'],
  },

  // 2. Cotizaciones y Ventas
  {
    id: 'QUOTE_SENT',
    category: 'sales_quotes',
    categoryLabel: 'Cotizaciones y Ventas',
    name: 'Cotización Enviada al Cliente',
    description: 'Confirma que la cotización fue despachada por correo electrónico al cliente.',
    icon: 'send',
    severity: 'SUCCESS',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'QUOTE_EXPIRING',
    category: 'sales_quotes',
    categoryLabel: 'Cotizaciones y Ventas',
    name: 'Cotización Próxima a Vencer',
    description: 'Avisa 48 horas antes de que expire la validez de la oferta comercial.',
    icon: 'clock',
    severity: 'WARNING',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'QUOTE_CONVERTED',
    category: 'sales_quotes',
    categoryLabel: 'Cotizaciones y Ventas',
    name: 'Cotización Convertida a Factura',
    description: 'Notifica cuando una cotización es aprobada y facturada.',
    icon: 'check-circle',
    severity: 'SUCCESS',
    defaultChannels: ['IN_APP'],
  },

  // 3. Cobranzas y Cuentas por Cobrar
  {
    id: 'PAYMENT_RECEIVED',
    category: 'cxc_payments',
    categoryLabel: 'Cobranzas y Cuentas por Cobrar',
    name: 'Cobro de Cliente Registrado',
    description: 'Notifica cuando se registra un abono o pago total sobre una factura a crédito.',
    icon: 'dollar-sign',
    severity: 'SUCCESS',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'INVOICE_OVERDUE',
    category: 'cxc_payments',
    categoryLabel: 'Cobranzas y Cuentas por Cobrar',
    name: 'Factura en Mora (Vencida)',
    description: 'Alerta sobre facturas a crédito cuya fecha límite de pago ha sido superada.',
    icon: 'clock-alert',
    severity: 'WARNING',
    defaultChannels: ['IN_APP', 'EMAIL'],
  },

  // 4. Inventario y Almacenes
  {
    id: 'INVENTORY_STOCK_LOW',
    category: 'inventory_stock',
    categoryLabel: 'Inventario y Almacenes',
    name: 'Stock Mínimo Alcanzado',
    description: 'Alerta cuando las existencias de un producto bajan del límite de seguridad.',
    icon: 'package-alert',
    severity: 'WARNING',
    defaultChannels: ['IN_APP', 'PUSH'],
  },
  {
    id: 'INVENTORY_STOCK_OUT',
    category: 'inventory_stock',
    categoryLabel: 'Inventario y Almacenes',
    name: 'Quiebre de Stock (Agotado)',
    description: 'Aviso crítico cuando el stock de un producto llega a 0 tras una venta o ajuste.',
    icon: 'package-x',
    severity: 'CRITICAL',
    defaultChannels: ['IN_APP', 'PUSH'],
  },
  {
    id: 'INVENTORY_ADJUSTED',
    category: 'inventory_stock',
    categoryLabel: 'Inventario y Almacenes',
    name: 'Ajuste de Inventario Realizado',
    description: 'Notifica ajustes de entrada o salida manuales en los almacenes.',
    icon: 'arrow-left-right',
    severity: 'INFO',
    defaultChannels: ['IN_APP'],
  },

  // 5. Compras y Cuentas por Pagar
  {
    id: 'PURCHASE_REGISTERED',
    category: 'purchases_cxp',
    categoryLabel: 'Compras y Cuentas por Pagar',
    name: 'Nueva Factura de Compra',
    description: 'Notifica el registro de compras de mercancía o insumos.',
    icon: 'shopping-bag',
    severity: 'INFO',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'PURCHASE_INVOICE_DUE',
    category: 'purchases_cxp',
    categoryLabel: 'Compras y Cuentas por Pagar',
    name: 'Factura de Proveedor por Vencer',
    description: 'Avisa sobre pagos a proveedores próximos a su fecha de vencimiento.',
    icon: 'calendar-alert',
    severity: 'WARNING',
    defaultChannels: ['IN_APP'],
  },

  // 6. Copias de Seguridad
  {
    id: 'BACKUP_SUCCESS',
    category: 'backups',
    categoryLabel: 'Copias de Seguridad',
    name: 'Backup Completado Exitosamente',
    description: 'Confirmación de respaldo local o en Google Drive generado sin errores.',
    icon: 'database-zap',
    severity: 'SUCCESS',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'BACKUP_FAILED',
    category: 'backups',
    categoryLabel: 'Copias de Seguridad',
    name: 'Fallo en Creación de Backup',
    description: 'Alerta crítica si un respaldo de base de datos no pudo completarse.',
    icon: 'database-alert',
    severity: 'CRITICAL',
    defaultChannels: ['IN_APP', 'EMAIL', 'PUSH'],
  },

  // 7. Seguridad y Cuenta
  {
    id: 'SECURITY_LOGIN',
    category: 'security_account',
    categoryLabel: 'Seguridad y Cuenta',
    name: 'Nuevo Inicio de Sesión',
    description: 'Notifica cada inicio de sesión exitoso en la cuenta.',
    icon: 'shield-check',
    severity: 'INFO',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'SECURITY_LOGIN_FAILED',
    category: 'security_account',
    categoryLabel: 'Seguridad y Cuenta',
    name: 'Intentos Fallidos de Inicio de Sesión',
    description: 'Avisa cuando se detectan contraseñas erróneas consecutivas.',
    icon: 'shield-alert',
    severity: 'WARNING',
    defaultChannels: ['IN_APP', 'EMAIL'],
  },
  {
    id: 'SECURITY_PASSWORD_CHANGED',
    category: 'security_account',
    categoryLabel: 'Seguridad y Cuenta',
    name: 'Contraseña Modificada',
    description: 'Aviso inmediato tras actualizar las credenciales de acceso.',
    icon: 'key-round',
    severity: 'WARNING',
    defaultChannels: ['IN_APP', 'EMAIL'],
  },
  {
    id: 'USER_JOINED',
    category: 'security_account',
    categoryLabel: 'Seguridad y Cuenta',
    name: 'Nuevo Colaborador Incorporado',
    description: 'Notifica al administrador cuando un invitado activa su membresía.',
    icon: 'user-check',
    severity: 'SUCCESS',
    defaultChannels: ['IN_APP'],
  },
  {
    id: 'PLAN_LIMIT_WARNING',
    category: 'security_account',
    categoryLabel: 'Seguridad y Cuenta',
    name: 'Límite de Plan por Alcanzarse',
    description: 'Alerta cuando se alcanza el 80% o 90% del límite de comprobantes o usuarios.',
    icon: 'zap',
    severity: 'WARNING',
    defaultChannels: ['IN_APP', 'EMAIL'],
  },
  {
    id: 'API_KEY_EVENT',
    category: 'security_account',
    categoryLabel: 'Seguridad y Cuenta',
    name: 'Llave API Creada / Revocada',
    description: 'Notifica la generación, rotación o revocación de llaves públicas de acceso.',
    icon: 'code',
    severity: 'INFO',
    defaultChannels: ['IN_APP'],
  },
];

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
            membresias: {
              some: { empresaId: input.empresaId, estado: 'ACTIVO' },
            },
          },
          select: { id: true },
        });

    const notifications: any[] = [];
    for (const recipient of recipients) {
      const requestedChannels = input.canales || ['IN_APP'];
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

  async list(
    userId: string,
    query: { page?: number; limit?: number; unread?: boolean; tipo?: string },
  ) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 25, 100);
    const where = {
      OR: [
        { usuarioId: userId },
        {
          empresa: {
            membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } },
          },
        },
      ],
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
          OR: [
            { usuarioId: userId },
            {
              empresa: {
                membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } },
              },
            },
          ],
        },
      })
      .then((count) => ({ count }));
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        id,
        OR: [
          { usuarioId: userId },
          {
            empresa: {
              membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } },
            },
          },
        ],
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
        OR: [
          { usuarioId: userId },
          {
            empresa: {
              membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } },
            },
          },
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
          {
            empresa: {
              membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } },
            },
          },
        ],
      },
    });
    if (!result.count)
      throw new NotFoundException('Notificación no encontrada');
    return { success: true };
  }

  async clear(userId: string) {
    const result = await this.prisma.notification.deleteMany({
      where: {
        OR: [
          { usuarioId: userId },
          {
            empresa: {
              membresias: { some: { usuarioId: userId, estado: 'ACTIVO' } },
            },
          },
        ],
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

  savePreference(
    userId: string,
    tipo: string,
    canal: string,
    habilitado: boolean,
  ) {
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
    return this.realtime.stream(userId);
  }

  async deliver(notificationId: string) {
    const notification: any = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: { usuario: true, deliveries: true },
    });
    if (!notification) return;
    for (const delivery of notification.deliveries) {
      try {
        let providerMessageId: string | undefined;
        if (delivery.canal === 'EMAIL' && notification.usuario?.email) {
          providerMessageId = await this.email.send(
            notification.usuario.email,
            notification.titulo,
            notification.mensaje,
          );
        }
        if (delivery.canal === 'PUSH') {
          const subscriptions = await this.prisma.pushSubscription.findMany({
            where: { usuarioId: notification.usuarioId },
          });
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
      } catch (error) {
        await this.prisma.notificationDelivery.update({
          where: { id: delivery.id },
          data: {
            estado: 'RETRYING',
            intentos: { increment: 1 },
            ultimoError: String(error),
            proximoIntentoEn: new Date(Date.now() + 60000),
          },
        });
      }
    }
  }

  private serialize(item: any) {
    return { ...item, payload: item.payload ? JSON.parse(item.payload) : null };
  }
}
