import { Prisma } from '@prisma/client';
import { NotificationAlertsService } from './notification-alerts.service';
describe('Notification alerts', () => {
  it('detects real overdue, rejected, expiring, stock and plan conditions without inventing events', async () => {
    const empty = () => ({ findMany: jest.fn().mockResolvedValue([]) });
    const prisma: any = {
      empresa: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'company', propietarioId: 'owner' }]),
      },
      facturaVenta: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'invoice',
            numeroFactura: 'FAC-1',
            fiscalbridgeStatus: 'REJECTED',
            balancePendiente: new Prisma.Decimal(100),
            moneda: 'DOP',
            fechaVencimiento: new Date(Date.now() - 86400000),
          },
        ]),
      },
      cotizacion: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'quote', numeroCotizacion: 'COT-1' }]),
      },
      facturaCompra: empty(),
      secuenciaNCF: empty(),
      inventarioStock: { ...empty(), fields: { stockMinimo: 'stockMinimo' } },
      movimientoInventario: empty(),
      suscripcion: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'ACTIVE',
          plan: {
            nombre: 'Plan',
            maxUsuarios: 10,
            maxProductos: 100,
            maxSucursales: 5,
          },
        }),
      },
      membresia: { count: jest.fn().mockResolvedValue(8) },
      producto: { count: jest.fn().mockResolvedValue(0) },
      sucursal: { count: jest.fn().mockResolvedValue(1) },
    };
    const notifications = { create: jest.fn() };
    await new NotificationAlertsService(prisma, notifications as any).scan();
    const events = notifications.create.mock.calls.map((call) => call[0]);
    expect(events.map((e) => e.tipo)).toEqual([
      'INVOICE_FISCAL_REJECTED',
      'INVOICE_OVERDUE',
      'QUOTE_EXPIRING',
      'PLAN_LIMIT_WARNING',
    ]);
    expect(
      events.every((e) => e.empresaId === 'company' && e.deduplicationKey),
    ).toBe(true);
    expect(events.find((e) => e.tipo === 'PLAN_LIMIT_WARNING').usuarioId).toBe(
      'owner',
    );
    expect(prisma.facturaCompra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          empresaId: 'company',
          balancePendiente: { gt: 0 },
        }),
        take: 100,
      }),
    );
  });
});
