import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreditNotesService } from './credit-notes.service';
import { SequencesService } from '../sequences/sequences.service';
import { BillingConfigService } from '../billing-config/billing-config.service';
import { FiscalOutboxService } from '../invoices/fiscal-outbox.service';
import { FiscalBridgeService } from '../invoices/fiscalbridge.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('CreditNotesService', () => {
  let service: CreditNotesService;
  let prisma: any;
  let sequencesService: jest.Mocked<Partial<SequencesService>>;
  let billingConfig: jest.Mocked<Partial<BillingConfigService>>;
  let fiscalOutbox: jest.Mocked<Partial<FiscalOutboxService>>;
  let fiscalBridgeService: jest.Mocked<Partial<FiscalBridgeService>>;
  let activity: jest.Mocked<Partial<ActivityLogService>>;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    sequencesService = {
      getNextNCF: jest.fn().mockResolvedValue({
        ncf: 'E3400000001',
        fechaVencimiento: new Date('2028-12-31'),
      }),
    };

    billingConfig = {
      get: jest.fn().mockResolvedValue({
        configuracion: { precisionMoneda: 2, monedaBase: 'DOP' },
      } as any),
    };

    fiscalOutbox = {
      transmitNow: jest.fn().mockResolvedValue(undefined),
    };

    fiscalBridgeService = {
      buildEcfPayload: jest.fn().mockReturnValue({}),
    };

    activity = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreditNotesService,
        mocks.provider,
        { provide: SequencesService, useValue: sequencesService },
        { provide: BillingConfigService, useValue: billingConfig },
        { provide: FiscalOutboxService, useValue: fiscalOutbox },
        { provide: FiscalBridgeService, useValue: fiscalBridgeService },
        { provide: ActivityLogService, useValue: activity },
      ],
    }).compile();

    service = module.get<CreditNotesService>(CreditNotesService);
  });

  const mockOriginalInvoice = (overrides: Partial<any> = {}) => ({
    id: 'fac-1',
    empresaId: 'emp-1',
    numeroFactura: 'FAC-000001',
    ncf: 'E3100000001',
    tipoNcf: 'E31',
    estado: 'EMITIDA',
    tipoPago: 'CREDITO',
    metodoPago: 'EFECTIVO',
    moneda: 'DOP',
    tasaCambio: new Prisma.Decimal(1),
    monedaBase: 'DOP',
    subtotal: new Prisma.Decimal(160),
    descuento: new Prisma.Decimal(40),
    itbis: new Prisma.Decimal(28.8),
    total: new Prisma.Decimal(188.8),
    balancePendiente: new Prisma.Decimal(188.8),
    montoPagado: new Prisma.Decimal(0),
    fecha: new Date(),
    almacenId: 'alm-1',
    sucursalId: 'suc-1',
    clienteId: 'cli-1',
    facturaOriginalId: null,
    detalles: [
      {
        id: 'det-1',
        productoId: 'prod-1',
        cantidad: new Prisma.Decimal(2),
        precioUnitario: new Prisma.Decimal(100),
        descuento: new Prisma.Decimal(40), // 20 por unidad
        subtotal: new Prisma.Decimal(160), // (100*2) - 40 = 160
        tasaItbis: new Prisma.Decimal(18),
        itbis: new Prisma.Decimal(28.8), // 160 * 18% = 28.8
        total: new Prisma.Decimal(188.8),
        indicadorFacturacion: '1',
        lineasCredito: [],
        producto: { tipo: 'PRODUCTO', nombre: 'Pantalón' },
      },
    ],
    cliente: { id: 'cli-1', nombreRazonSocial: 'Juan Perez' },
    ...overrides,
  });

  it('calcula la nota de crédito respetando el descuento proporcional original', async () => {
    const original = mockOriginalInvoice();

    prisma.facturaVenta.findFirst.mockResolvedValue(original);
    prisma.empresa.findUnique.mockResolvedValue({
      id: 'emp-1',
      fiscalbridgeEnv: 'TEST',
      fiscalbridgeEnabled: true,
    });
    prisma.$queryRaw.mockResolvedValue([{ value: BigInt(1) }]);
    prisma.facturaVenta.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'nc-1',
        numeroFactura: 'NC-000001',
        ncf: 'E3400000001',
        ...data,
        detalles: [
          {
            id: 'ncd-1',
            ...data.detalles.create[0],
            producto: { nombre: 'Pantalón' },
          },
        ],
      }),
    );
    prisma.facturaVenta.update.mockResolvedValue({});

    // Acreditar 1 unidad de 2 (la mitad)
    const result = await service.create('emp-1', 'user-1', {
      facturaOriginalId: 'fac-1',
      motivoModificacion: '1',
      returnToInventory: true,
      lines: [{ detalleOriginalId: 'det-1', cantidad: 1 }],
    });

    expect(result.id).toBe('nc-1');
    expect(result.subtotal.toString()).toBe('80'); // 100 - 20 = 80
    expect(result.descuento.toString()).toBe('20');
    expect(result.itbis.toString()).toBe('14.4'); // 80 * 18% = 14.4
    expect(result.total.toString()).toBe('94.4'); // 80 + 14.4 = 94.4

    // Factura original balance pendiente se redujo por 94.4
    expect(prisma.facturaVenta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'fac-1' },
        data: expect.objectContaining({
          balancePendiente: new Prisma.Decimal('94.4'),
        }),
      }),
    );

    // NCF reservado dentro de la transacción con tx
    expect(sequencesService.getNextNCF).toHaveBeenCalledWith(
      'emp-1',
      'E34',
      'TEST',
      expect.anything(),
    );

    // Validación fiscal pre-commit llamada
    expect(fiscalBridgeService.buildEcfPayload).toHaveBeenCalled();
  });

  it('agrega líneas duplicadas en el input para no saltar el límite de cantidad disponible', async () => {
    const original = mockOriginalInvoice();
    prisma.facturaVenta.findFirst.mockResolvedValue(original);
    prisma.empresa.findUnique.mockResolvedValue({ id: 'emp-1' });

    // La factura original tiene 2 unidades disponibles.
    // El atacante manda 2 líneas de 1.5 unidades (total 3 > 2)
    await expect(
      service.create('emp-1', 'user-1', {
        facturaOriginalId: 'fac-1',
        motivoModificacion: '1',
        lines: [
          { detalleOriginalId: 'det-1', cantidad: 1.5 },
          { detalleOriginalId: 'det-1', cantidad: 1.5 },
        ],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza emitir nota de crédito sobre una factura anulada', async () => {
    const original = mockOriginalInvoice({ estado: 'ANULADA' });
    prisma.facturaVenta.findFirst.mockResolvedValue(original);

    await expect(
      service.create('emp-1', 'user-1', {
        facturaOriginalId: 'fac-1',
        motivoModificacion: '1',
        lines: [{ detalleOriginalId: 'det-1', cantidad: 1 }],
      }),
    ).rejects.toThrow('No se puede emitir una nota de crédito sobre una factura anulada.');
  });

  it('rechaza emitir nota de crédito sobre otra nota de crédito', async () => {
    const original = mockOriginalInvoice({ facturaOriginalId: 'fac-original-id' });
    prisma.facturaVenta.findFirst.mockResolvedValue(original);

    await expect(
      service.create('emp-1', 'user-1', {
        facturaOriginalId: 'fac-1',
        motivoModificacion: '1',
        lines: [{ detalleOriginalId: 'det-1', cantidad: 1 }],
      }),
    ).rejects.toThrow('No se puede emitir una nota de crédito sobre otra nota de crédito.');
  });

  it('registra saldo a favor explícito cuando la factura original ya estaba saldada', async () => {
    const original = mockOriginalInvoice({
      balancePendiente: new Prisma.Decimal(0),
      montoPagado: new Prisma.Decimal(188.8),
      estado: 'PAGADA',
    });

    prisma.facturaVenta.findFirst.mockResolvedValue(original);
    prisma.empresa.findUnique.mockResolvedValue({ id: 'emp-1' });
    prisma.$queryRaw.mockResolvedValue([{ value: BigInt(2) }]);
    prisma.facturaVenta.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'nc-2',
        numeroFactura: 'NC-000002',
        ...data,
        detalles: [],
      }),
    );
    prisma.facturaVenta.update.mockResolvedValue({});

    const result = await service.create('emp-1', 'user-1', {
      facturaOriginalId: 'fac-1',
      motivoModificacion: '1',
      lines: [{ detalleOriginalId: 'det-1', cantidad: 2 }],
    });

    expect(result.notas).toContain('Saldo a favor generado: 188.80');
    expect(prisma.facturaVenta.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          balancePendiente: new Prisma.Decimal(0),
          estado: 'PAGADA',
        }),
      }),
    );
  });
});
