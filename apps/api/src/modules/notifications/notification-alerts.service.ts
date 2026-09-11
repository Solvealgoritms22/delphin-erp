import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { NOTIFICATION_CATALOG } from './notification.catalog';

@Injectable()
export class NotificationAlertsService {
  private running = false;
  private readonly logger = new Logger(NotificationAlertsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Bounded keyset pages, persistent recipient/event/day deduplication across replicas. */
  private async pages<T extends { id: string }>(
    fetch: (cursor?: string) => Promise<T[]>,
    visit: (row: T) => Promise<void>,
  ) {
    let cursor: string | undefined;
    for (;;) {
      const rows = await fetch(cursor);
      for (const row of rows) await visit(row);
      if (rows.length < 100) break;
      cursor = rows[rows.length - 1].id;
    }
  }

  @Interval(300000)
  async scan() {
    if (this.running) return;
    this.running = true;
    const now = new Date(),
      soon = new Date(now.getTime() + 48 * 3600000);
    const day = now.toISOString().slice(0, 10);
    const page = (cursor?: string) => ({
      take: 100,
      orderBy: { id: 'asc' as const },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    try {
      await this.pages(
        (cursor) =>
          this.prisma.empresa.findMany({
            where: { estado: 'ACTIVA' },
            select: { id: true, propietarioId: true },
            ...page(cursor),
          }),
        async (company) => {
          const emit = async (
            tipo: string,
            id: string,
            mensaje: string,
            usuarioId?: string,
          ) => {
            const event = NOTIFICATION_CATALOG.find(
              (item) => item.id === tipo,
            )!;
            await this.notifications.create({
              empresaId: company.id,
              usuarioId,
              tipo,
              titulo: event.name,
              mensaje,
              severidad: event.severity,
              icono: event.icon,
              deduplicationKey:
                tipo === 'INVENTORY_ADJUSTED' ? id : id + ':' + day,
            });
          };
          try {
            await this.pages(
              (cursor) =>
                this.prisma.facturaVenta.findMany({
                  where: {
                    empresaId: company.id,
                    estado: { notIn: ['BORRADOR', 'ANULADA'] },
                    OR: [
                      { fiscalbridgeStatus: 'REJECTED' },
                      {
                        tipoPago: 'CREDITO',
                        balancePendiente: { gt: 0 },
                        fechaVencimiento: { lt: now },
                      },
                    ],
                  },
                  select: {
                    id: true,
                    numeroFactura: true,
                    fiscalbridgeStatus: true,
                    balancePendiente: true,
                    moneda: true,
                    fechaVencimiento: true,
                  },
                  ...page(cursor),
                }),
              async (row) => {
                if (row.fiscalbridgeStatus === 'REJECTED')
                  await emit(
                    'INVOICE_FISCAL_REJECTED',
                    row.id,
                    'La factura ' +
                      row.numeroFactura +
                      ' fue rechazada. Revisa el detalle fiscal antes de volver a enviarla.',
                  );
                if (
                  row.balancePendiente.gt(0) &&
                  row.fechaVencimiento &&
                  row.fechaVencimiento < now
                )
                  await emit(
                    'INVOICE_OVERDUE',
                    row.id,
                    'La factura ' +
                      row.numeroFactura +
                      ' tiene un saldo vencido de ' +
                      row.moneda +
                      ' ' +
                      row.balancePendiente.toFixed(2) +
                      '.',
                  );
              },
            );
            await this.pages(
              (cursor) =>
                this.prisma.cotizacion.findMany({
                  where: {
                    empresaId: company.id,
                    estado: { in: ['ENVIADA', 'ACEPTADA'] },
                    fechaVencimiento: { gte: now, lte: soon },
                  },
                  select: { id: true, numeroCotizacion: true },
                  ...page(cursor),
                }),
              (row) =>
                emit(
                  'QUOTE_EXPIRING',
                  row.id,
                  'La cotización ' +
                    row.numeroCotizacion +
                    ' vence en las próximas 48 horas.',
                ),
            );
            await this.pages(
              (cursor) =>
                this.prisma.facturaCompra.findMany({
                  where: {
                    empresaId: company.id,
                    estado: { notIn: ['ANULADA', 'PAGADA'] },
                    balancePendiente: { gt: 0 },
                    fechaVencimiento: { gte: now, lte: soon },
                  },
                  select: {
                    id: true,
                    numeroFactura: true,
                    balancePendiente: true,
                    moneda: true,
                  },
                  ...page(cursor),
                }),
              (row) =>
                emit(
                  'PURCHASE_INVOICE_DUE',
                  row.id,
                  'La compra ' +
                    row.numeroFactura +
                    ' vence en las próximas 48 horas. Saldo: ' +
                    row.moneda +
                    ' ' +
                    row.balancePendiente.toFixed(2) +
                    '.',
                ),
            );
            await this.pages(
              (cursor) =>
                this.prisma.secuenciaNCF.findMany({
                  where: { empresaId: company.id, activa: true },
                  ...page(cursor),
                }),
              async (row) => {
                const remaining = Math.max(
                  0,
                  row.numeroHasta - row.numeroActual + 1,
                );
                if (row.numeroHasta > 0 && remaining / row.numeroHasta <= 0.1)
                  await emit(
                    'NCF_SEQUENCE_LOW',
                    row.id,
                    'La secuencia ' +
                      row.nombre +
                      ' (' +
                      row.ambiente +
                      ') tiene ' +
                      remaining +
                      ' números disponibles.',
                  );
                if (
                  row.fechaVencimiento &&
                  row.fechaVencimiento >= now &&
                  row.fechaVencimiento.getTime() - now.getTime() <=
                    30 * 86400000
                )
                  await emit(
                    'NCF_SEQUENCE_EXPIRING',
                    row.id,
                    'La secuencia ' +
                      row.nombre +
                      ' (' +
                      row.ambiente +
                      ') vence el ' +
                      row.fechaVencimiento.toISOString().slice(0, 10) +
                      '.',
                  );
              },
            );
            await this.pages(
              (cursor) =>
                this.prisma.inventarioStock.findMany({
                  where: {
                    empresaId: company.id,
                    producto: { estado: 'ACTIVO' },
                    OR: [
                      { cantidad: { lte: 0 } },
                      {
                        stockMinimo: { gt: 0 },
                        cantidad: {
                          lte: this.prisma.inventarioStock.fields.stockMinimo,
                        },
                      },
                    ],
                  },
                  include: {
                    producto: { select: { nombre: true } },
                    almacen: { select: { nombre: true } },
                  },
                  ...page(cursor),
                }),
              (row) =>
                emit(
                  row.cantidad.lte(0)
                    ? 'INVENTORY_STOCK_OUT'
                    : 'INVENTORY_STOCK_LOW',
                  row.id,
                  row.producto.nombre +
                    ' en ' +
                    row.almacen.nombre +
                    ': ' +
                    row.cantidad.toString() +
                    ' unidades. Mínimo: ' +
                    row.stockMinimo.toString() +
                    '.',
                ),
            );
            await this.pages(
              (cursor) =>
                this.prisma.movimientoInventario.findMany({
                  where: {
                    empresaId: company.id,
                    tipo: { in: ['AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'] },
                    creadoEn: { gte: new Date(now.getTime() - 86400000) },
                  },
                  select: {
                    id: true,
                    tipo: true,
                    referenciaDoc: true,
                    cantidad: true,
                  },
                  ...page(cursor),
                }),
              (row) =>
                emit(
                  'INVENTORY_ADJUSTED',
                  row.id,
                  'Se registró ' +
                    row.tipo +
                    ' de ' +
                    row.cantidad.toString() +
                    ' unidades. Referencia: ' +
                    (row.referenciaDoc || row.id) +
                    '.',
                ),
            );
            const subscription = await this.prisma.suscripcion.findUnique({
              where: { empresaId: company.id },
              include: { plan: true },
            });
            if (
              subscription &&
              company.propietarioId &&
              ['ACTIVE', 'TRIAL'].includes(subscription.estado)
            ) {
              const counts = await Promise.all([
                this.prisma.membresia.count({
                  where: { empresaId: company.id, estado: 'ACTIVO' },
                }),
                this.prisma.producto.count({
                  where: { empresaId: company.id, estado: 'ACTIVO' },
                }),
                this.prisma.sucursal.count({
                  where: { empresaId: company.id, estado: 'ACTIVO' },
                }),
              ]);
              const limits = [
                subscription.plan.maxUsuarios,
                subscription.plan.maxProductos,
                subscription.plan.maxSucursales,
              ];
              const labels = ['usuarios', 'productos', 'sucursales'];
              for (let i = 0; i < counts.length; i++)
                if (limits[i] > 0 && counts[i] / limits[i] >= 0.8)
                  await emit(
                    'PLAN_LIMIT_WARNING',
                    labels[i],
                    'Uso del plan ' +
                      subscription.plan.nombre +
                      ': ' +
                      counts[i] +
                      '/' +
                      limits[i] +
                      ' ' +
                      labels[i] +
                      '.',
                    company.propietarioId,
                  );
            }
          } catch {
            this.logger.error(
              'Notification alert scan failed for company ' + company.id,
            );
          }
        },
      );
    } finally {
      this.running = false;
    }
  }
}
