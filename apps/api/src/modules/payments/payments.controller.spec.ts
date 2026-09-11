import { BillingAttemptsService } from './billing-attempts.service';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { AzulService } from './azul.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let prisma: any;
  let paymentsService: { getConfig: jest.Mock };
  let azulService: {
    processCardSaleWithTokenization: jest.Mock;
    processTokenSale: jest.Mock;
    isApproved: jest.Mock;
    voidTransaction: jest.Mock;
  };

  const user = { id: 'u1', empresaId: 'e1' };

  beforeEach(async () => {
    process.env.SECRETS_ENCRYPTION_KEYS = JSON.stringify({ v1: Buffer.alloc(32, 7).toString('base64') });
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    paymentsService = { getConfig: jest.fn() };
    azulService = {
      processCardSaleWithTokenization: jest.fn(),
      processTokenSale: jest.fn(),
      isApproved: jest.fn(),
      voidTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: BillingAttemptsService, useValue: { execute: jest.fn((_empresa, _kind, _key, operation) => operation()) } },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: AzulService, useValue: azulService },
        mocks.provider,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('getConfig delega al service', () => {
    controller.getConfig();
    expect(paymentsService.getConfig).toHaveBeenCalled();
  });

  it('getPaymentMethod exige tenant seleccionado', async () => {
    await expect(controller.getPaymentMethod({} as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('getPaymentMethod devuelve hasPaymentMethod false sin tarjeta guardada', async () => {
    prisma.empresa.findUnique.mockResolvedValue({ suscripcion: null });

    const result = await controller.getPaymentMethod(user);

    expect(result).toEqual({ hasPaymentMethod: false });
  });

  it('getPaymentMethod formatea la expiración de la tarjeta', async () => {
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: {
        azulDataVaultExpiration: '202812',
        azulCardBrand: 'VISA',
        azulCardLast4: '1111',
      },
    });

    const result = await controller.getPaymentMethod(user);

    expect(result).toEqual({
      hasPaymentMethod: true,
      cardBrand: 'VISA',
      cardLast4: '1111',
      cardHolder: undefined,
      expiration: '12/28',
    });
  });

  it('addPaymentMethod valida campos y tokeniza', async () => {
    azulService.processCardSaleWithTokenization.mockResolvedValue({
      IsoCode: '00',
      DataVaultToken: 'tok',
      CardNumber: '****1111',
      CardBrand: 'VISA',
      AzuleOrderId: 'AZ1',
    });
    azulService.isApproved.mockReturnValue(true);
    prisma.suscripcion.upsert.mockResolvedValue({});

    const result = await controller.addPaymentMethod(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
      cardNumber: '4111 1111 1111 1111',
      expiration: '1228',
      cvc: '123',
      cardHolder: 'Ana',
    });

    expect(result.success).toBe(true);
    expect(prisma.suscripcion.upsert).toHaveBeenCalled();
    expect(azulService.voidTransaction).toHaveBeenCalled();
  });

  it('addPaymentMethod rechaza tarjeta declinada', async () => {
    azulService.processCardSaleWithTokenization.mockResolvedValue({
      IsoCode: '51',
      ResponseMessage: 'Fondos insuficientes',
    });
    azulService.isApproved.mockReturnValue(false);

    await expect(
      controller.addPaymentMethod(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
        cardNumber: '4111111111111111',
        expiration: '1228',
        cvc: '123',
        cardHolder: 'Ana',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('addPaymentMethod valida que todos los campos estén presentes', async () => {
    await expect(
      controller.addPaymentMethod(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
        cardNumber: '4111111111111111',
        expiration: '',
        cvc: '123',
        cardHolder: 'Ana',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('addPaymentMethod valida la longitud de la tarjeta', async () => {
    await expect(
      controller.addPaymentMethod(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
        cardNumber: '4111',
        expiration: '1228',
        cvc: '123',
        cardHolder: 'Ana',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('addPaymentMethod rechaza si no se pudo tokenizar', async () => {
    azulService.processCardSaleWithTokenization.mockResolvedValue({
      IsoCode: '00',
    });
    azulService.isApproved.mockReturnValue(true);

    await expect(
      controller.addPaymentMethod(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
        cardNumber: '4111111111111111',
        expiration: '1228',
        cvc: '123',
        cardHolder: 'Ana',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('changePlan exige método de pago registrado', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue(null);

    await expect(
      controller.changePlan(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001', planId: 'pro', billingCycle: 'monthly' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('changePlan actualiza la suscripción en modo simulado', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue({
      azulDataVaultToken: 'tok',
      azulDataVaultExpiration: '202812',
    });
    prisma.plan.findUnique.mockResolvedValue({
      id: 'pro',
      nombre: 'Pro',
      precioMensual: 49,
      precioAnual: 44,
    });
    process.env.AZUL_ENV = 'MOCK';
    prisma.suscripcion.update.mockResolvedValue({});
    azulService.processTokenSale.mockResolvedValue({ IsoCode: '00' });
    azulService.isApproved.mockReturnValue(true);

    const result = await controller.changePlan(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
      planId: 'pro',
      billingCycle: 'monthly',
    });

    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
    expect(azulService.processTokenSale).toHaveBeenCalled();
    expect(prisma.suscripcion.update).toHaveBeenCalled();
  });
  it('no transforma el trial gratuito en suscripción ACTIVE', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue({azulDataVaultToken:'tok'});
    prisma.plan.findUnique.mockResolvedValue({id:'trial',precioMensual:0,precioAnual:0});
    await expect(controller.changePlan(user, {
      idempotencyKey:'10000000-0000-4000-8000-000000000001',
      planId:'trial',billingCycle:'monthly',
    })).rejects.toThrow(BadRequestException);
    expect(prisma.suscripcion.update).not.toHaveBeenCalled();
    expect(azulService.processTokenSale).not.toHaveBeenCalled();
  });

  it('changePlan cobra con token y actualiza a ciclo anual', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue({
      azulDataVaultToken: 'tok',
      azulDataVaultExpiration: '202812',
    });
    prisma.plan.findUnique.mockResolvedValue({
      id: 'pro',
      nombre: 'Pro',
      precioMensual: 49,
      precioAnual: 44,
    });
    process.env.AZUL_ENV = 'TESTING';
    azulService.processTokenSale.mockResolvedValue({ IsoCode: '00' });
    azulService.isApproved.mockReturnValue(true);
    prisma.suscripcion.update.mockResolvedValue({});

    const result = await controller.changePlan(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001',
      planId: 'pro',
      billingCycle: 'annual',
    });

    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(false);
    expect(azulService.processTokenSale).toHaveBeenCalledWith(
      expect.objectContaining({ dataVaultToken: 'tok', amountCents: 4400 }),
    );
  });

  it('changePlan rechaza el cobro con token si es declinado', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue({
      azulDataVaultToken: 'tok',
      azulDataVaultExpiration: '202812',
    });
    prisma.plan.findUnique.mockResolvedValue({
      id: 'pro',
      nombre: 'Pro',
      precioMensual: 49,
      precioAnual: 44,
    });
    process.env.AZUL_ENV = 'TESTING';
    azulService.processTokenSale.mockResolvedValue({
      IsoCode: '51',
      ResponseMessage: 'Declinada',
    });
    azulService.isApproved.mockReturnValue(false);

    await expect(
      controller.changePlan(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001', planId: 'pro', billingCycle: 'monthly' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('changePlan lanza error si el plan no existe', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue({
      azulDataVaultToken: 'tok',
    });
    prisma.plan.findUnique.mockResolvedValue(null);

    await expect(
      controller.changePlan(user, { idempotencyKey: '10000000-0000-4000-8000-000000000001', planId: 'nope', billingCycle: 'monthly' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('removePaymentMethod limpia los datos de tarjeta', async () => {
    prisma.suscripcion.updateMany.mockResolvedValue({});

    const result = await controller.removePaymentMethod(user);

    expect(result.success).toBe(true);
    expect(prisma.suscripcion.updateMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
      data: expect.objectContaining({ azulDataVaultToken: null }),
    });
  });
});
