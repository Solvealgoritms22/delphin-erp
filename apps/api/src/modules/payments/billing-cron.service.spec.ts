import { Test, TestingModule } from '@nestjs/testing';
import { BillingCronService } from './billing-cron.service';
import { AzulService } from './azul.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('BillingCronService', () => {
  let service: BillingCronService;
  let prisma: any;
  let azulService: { processTokenSale: jest.Mock; isApproved: jest.Mock };

  const dueSubscription = {
    id: 'sub1',
    empresaId: 'e1',
    estado: 'ACTIVE',
    periodicidad: 'MONTHLY',
    azulDataVaultToken: 'tok',
    azulDataVaultExpiration: '202812',
    fechaRenovacion: new Date(Date.now() - 1000),
    plan: { nombre: 'Starter', precioMensual: 19, precioAnual: 17 },
    empresa: { razonSocial: 'Empresa A' },
  };

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    azulService = {
      processTokenSale: jest.fn(),
      isApproved: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingCronService,
        mocks.provider,
        { provide: AzulService, useValue: azulService },
      ],
    }).compile();

    service = module.get<BillingCronService>(BillingCronService);
  });

  it('renueva la suscripción y crea factura cuando el cobro es aprobado', async () => {
    prisma.suscripcion.findMany.mockResolvedValue([dueSubscription]);
    azulService.processTokenSale.mockResolvedValue({
      AzuleOrderId: 'AZ1',
      AuthorizationCode: 'AUTH1',
    });
    azulService.isApproved.mockReturnValue(true);
    prisma.suscripcion.update.mockResolvedValue({});
    prisma.factura.create.mockResolvedValue({});

    await service.handleDailyRenewals();

    expect(azulService.processTokenSale).toHaveBeenCalledWith(
      expect.objectContaining({
        dataVaultToken: 'tok',
        amountCents: 1900,
        orderNumber: expect.stringContaining('RENEW-'),
      }),
    );
    expect(prisma.factura.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        suscripcionId: 'sub1',
        monto: 19,
        estado: 'PAID',
        azulOrderId: 'AZ1',
        azulAuthCode: 'AUTH1',
      }),
    });
    expect(prisma.suscripcion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub1' } }),
    );
  });

  it('marca PAST_DUE cuando el cobro es rechazado', async () => {
    prisma.suscripcion.findMany.mockResolvedValue([dueSubscription]);
    azulService.isApproved.mockReturnValue(false);

    await service.handleDailyRenewals();

    expect(prisma.suscripcion.update).toHaveBeenCalledWith({
      where: { id: 'sub1' },
      data: { estado: 'PAST_DUE' },
    });
    expect(prisma.factura.create).not.toHaveBeenCalled();
  });

  it('no cobra suscripciones sin token o sin vencimiento', async () => {
    prisma.suscripcion.findMany.mockResolvedValue([
      { ...dueSubscription, azulDataVaultToken: null },
      { ...dueSubscription, azulDataVaultExpiration: null },
    ]);

    await service.handleDailyRenewals();

    expect(azulService.processTokenSale).not.toHaveBeenCalled();
  });

  it('no detiene el proceso si un cobro lanza error', async () => {
    prisma.suscripcion.findMany.mockResolvedValue([
      dueSubscription,
      { ...dueSubscription, id: 'sub2' },
    ]);
    azulService.processTokenSale.mockRejectedValue(new Error('gateway down'));

    await expect(service.handleDailyRenewals()).resolves.toBeUndefined();
    expect(azulService.processTokenSale).toHaveBeenCalledTimes(2);
  });
});
