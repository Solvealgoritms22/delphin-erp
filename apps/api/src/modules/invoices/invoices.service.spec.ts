import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalBridgeService } from './fiscalbridge.service';
import { BillingConfigService } from '../billing-config/billing-config.service';
import { FiscalOutboxService } from './fiscal-outbox.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: any;

  const mockSequencesService = {
    getNextNcf: jest.fn(),
    reserveNextSequence: jest.fn(),
  };

  const mockFiscalBridgeService = {
    emitInvoice: jest.fn(),
  };

  const mockBillingConfig = {
    getCompanyConfig: jest.fn(),
    getActiveTaxes: jest.fn(),
    getExchangeRates: jest.fn().mockResolvedValue({ USD: 60.0, EUR: 65.0 }),
  };

  const mockFiscalOutbox = {
    createOutboxRecord: jest.fn(),
  };

  const mockActivityLog = {
    log: jest.fn(),
  };

  const mockNotifications = {
    notify: jest.fn(),
  };

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        mocks.provider,
        { provide: SequencesService, useValue: mockSequencesService },
        { provide: FiscalBridgeService, useValue: mockFiscalBridgeService },
        { provide: BillingConfigService, useValue: mockBillingConfig },
        { provide: FiscalOutboxService, useValue: mockFiscalOutbox },
        { provide: ActivityLogService, useValue: mockActivityLog },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create', () => {
    it('debe lanzar BadRequestException si la lista de items está vacía', async () => {
      await expect(
        service.create('emp-1', 'usr-1', {
          items: [],
          clienteId: 'cli-1',
          tipoPago: 'CONTADO',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si la empresa no existe', async () => {
      prisma.empresa.findUnique.mockResolvedValue(null);

      await expect(
        service.create('emp-nonexistent', 'usr-1', {
          items: [{ productoId: 'prod-1', cantidad: 1, precioUnitario: 100 }],
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('debe retornar la factura si existe y pertenece a la empresa', async () => {
      const mockFactura = {
        id: 'fac-1',
        empresaId: 'emp-1',
        numeroFactura: 'B0200000001',
        total: 1180,
      };

      prisma.facturaVenta.findFirst.mockResolvedValue(mockFactura);

      const result = await service.findOne('emp-1', 'fac-1');
      expect(result).toEqual(mockFactura);
      expect(prisma.facturaVenta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'fac-1', empresaId: 'emp-1' },
        }),
      );
    });

    it('debe lanzar NotFoundException si la factura no existe', async () => {
      prisma.facturaVenta.findFirst.mockResolvedValue(null);

      await expect(service.findOne('emp-1', 'fac-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('debe lanzar NotFoundException si se intenta cancelar una factura inexistente', async () => {
      prisma.facturaVenta.findFirst.mockResolvedValue(null);

      await expect(service.cancel('emp-1', 'usr-1', 'fac-404')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
