import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { EmpresasService } from '../empresas/empresas.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: any;
  let empresasService: { getPlans: jest.Mock };

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    empresasService = {
      getPlans: jest.fn().mockReturnValue([
        {
          id: 'starter',
          nombre: 'Starter',
          precioMensual: 19,
          precioAnual: 17,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        mocks.provider,
        { provide: EmpresasService, useValue: empresasService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('getConfig indica simulación cuando no hay credenciales', () => {
    const config = service.getConfig();
    expect(config.simulated).toBe(true);
    expect(config.currency).toBe('USD');
  });

  it('createOrder devuelve orden simulada sin credenciales', async () => {
    const result = await service.createOrder('u1', 'starter', 'monthly');

    expect(result.simulated).toBe(true);
    expect(result.orderId).toContain('SIM-');
    expect(result.amount).toBe(19);
  });

  it('createOrder usa precio anual con ciclo annual', async () => {
    const result = await service.createOrder('u1', 'starter', 'annual');
    expect(result.amount).toBe(17);
  });

  it('createOrder lanza NotFoundException para plan inexistente', async () => {
    await expect(service.createOrder('u1', 'nope')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('captureOrder completa plan update en modo simulado', async () => {
    prisma.usuario.findUnique.mockResolvedValue({ id: 'u1' });

    const result = await service.captureOrder('u1', 'SIM-123', 'starter');

    expect(result.ok).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.plan).toBe('Starter');
  });

  it('captureOrder lanza NotFoundException si el usuario no existe', async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.captureOrder('u1', 'SIM-123', 'starter'),
    ).rejects.toThrow(NotFoundException);
  });

  describe('modo real con credenciales de PayPal', () => {
    let realService: PaymentsService;
    const mockFetch = (results: { ok: boolean; data: any }[]) => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        const r = results.shift()!;
        return { ok: r.ok, status: 400, json: () => r.data };
      });
    };

    beforeAll(() => {
      process.env.PAYPAL_SANDBOX = 'true';
      process.env.PAYPAL_CLIENT_ID_SANDBOX = 'sandbox-id';
      process.env.PAYPAL_CLIENT_SECRET_SANDBOX = 'sandbox-secret';
    });

    afterAll(() => {
      delete process.env.PAYPAL_SANDBOX;
      delete process.env.PAYPAL_CLIENT_ID_SANDBOX;
      delete process.env.PAYPAL_CLIENT_SECRET_SANDBOX;
    });

    beforeEach(() => {
      realService = new PaymentsService(prisma, empresasService as any);
      global.fetch = jest.fn();
    });

    it('getConfig indica modo real', () => {
      expect(realService.getConfig().simulated).toBe(false);
    });

    it('usa el entorno live si PAYPAL_SANDBOX es false', () => {
      process.env.PAYPAL_SANDBOX = 'false';
      const liveService = new PaymentsService(prisma, empresasService as any);
      expect(liveService.getConfig().sandbox).toBe(false);
      process.env.PAYPAL_SANDBOX = 'true';
    });

    it('createOrder crea la orden real en PayPal', async () => {
      mockFetch([
        { ok: true, data: { access_token: 'tok' } },
        {
          ok: true,
          data: {
            id: 'PAY-1',
            links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
          },
        },
      ]);

      const result = await realService.createOrder('u1', 'starter', 'monthly');

      expect(result.simulated).toBe(false);
      expect(result.orderId).toBe('PAY-1');
      expect(result.approveLink).toBe('https://paypal.com/approve');
      expect(result.plan.nombre).toBe('Starter');
    });

    it('createOrder lanza BadRequestException si falla el auth de PayPal', async () => {
      mockFetch([{ ok: false, data: { error_description: 'invalid client' } }]);

      await expect(realService.createOrder('u1', 'starter')).rejects.toThrow(
        'PayPal auth error: invalid client',
      );
    });

    it('createOrder lanza BadRequestException si falla la creación de la orden', async () => {
      mockFetch([
        { ok: true, data: { access_token: 'tok' } },
        { ok: false, data: { message: 'order failed' } },
      ]);

      await expect(realService.createOrder('u1', 'starter')).rejects.toThrow(
        'PayPal create order error: order failed',
      );
    });

    it('createOrder usa el status de la respuesta si no hay mensaje', async () => {
      mockFetch([
        { ok: true, data: { access_token: 'tok' } },
        { ok: false, data: {} },
      ]);

      await expect(realService.createOrder('u1', 'starter')).rejects.toThrow(
        'PayPal create order error: 400',
      );
    });

    it('captureOrder captura la orden real y actualiza el plan', async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: 'u1' });
      mockFetch([
        { ok: true, data: { access_token: 'tok' } },
        { ok: true, data: {} },
      ]);

      const result = await realService.captureOrder('u1', 'PAY-1', 'starter');

      expect(result.ok).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.plan).toBe('Starter');
    });

    it('captureOrder lanza BadRequestException si falla la captura', async () => {
      mockFetch([
        { ok: true, data: { access_token: 'tok' } },
        { ok: false, data: { message: 'capture failed' } },
      ]);

      await expect(
        realService.captureOrder('u1', 'PAY-1', 'starter'),
      ).rejects.toThrow('PayPal capture error: capture failed');
    });
  });
});
