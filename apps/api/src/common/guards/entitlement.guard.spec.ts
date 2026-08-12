import { ForbiddenException, HttpException } from '@nestjs/common';
import { EntitlementGuard } from './entitlement.guard';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('EntitlementGuard', () => {
  let guard: EntitlementGuard;
  let prisma: any;
  let reflector: { getAllAndOverride: jest.Mock };

  const makeCtx = (user?: any) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });

  const suscripcion = (estado: string, plan?: any, fechaRenovacion?: Date) => ({
    estado,
    plan,
    fechaRenovacion,
  });

  beforeEach(() => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    reflector = { getAllAndOverride: jest.fn() };
    guard = new EntitlementGuard(reflector as any, prisma);
  });

  it('permite cuando no hay entitlement requerido', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(makeCtx({}) as any)).resolves.toBe(true);
  });

  it('lanza ForbiddenException si no hay usuario o empresaId', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxUsuarios');

    await expect(guard.canActivate(makeCtx() as any)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(makeCtx({}) as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lanza ForbiddenException si la empresa no existe', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxUsuarios');
    prisma.empresa.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(makeCtx({ empresaId: 'e1' }) as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('permite con trial vigente', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxUsuarios');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion(
        'TRIAL',
        { maxUsuarios: 5 },
        new Date(Date.now() + 86400000),
      ),
    });

    await expect(
      guard.canActivate(makeCtx({ empresaId: 'e1' }) as any),
    ).resolves.toBe(true);
  });

  it('bloquea trial expirado con código TRIAL_EXPIRED', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxUsuarios');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion(
        'TRIAL',
        { maxUsuarios: 5 },
        new Date(Date.now() - 86400000),
      ),
    });

    const error = await guard
      .canActivate(makeCtx({ empresaId: 'e1' }) as any)
      .catch((e: any) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.response.code).toBe('TRIAL_EXPIRED');
  });

  it('bloquea suscripción inactiva con código SUBSCRIPTION_INACTIVE', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxUsuarios');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion('PAST_DUE', { maxUsuarios: 5 }),
    });

    const error = await guard
      .canActivate(makeCtx({ empresaId: 'e1' }) as any)
      .catch((e: any) => e);
    expect(error).toBeInstanceOf(HttpException);
    expect(error.response.code).toBe('SUBSCRIPTION_INACTIVE');
  });

  it('resuelve plan trial por defecto y permite bajo el límite', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxSucursales');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion('ACTIVE', null),
    });
    prisma.plan.findUnique.mockResolvedValue({ id: 'trial', maxSucursales: 3 });
    prisma.sucursal.count.mockResolvedValue(1);

    await expect(
      guard.canActivate(makeCtx({ empresaId: 'e1' }) as any),
    ).resolves.toBe(true);
    expect(prisma.sucursal.count).toHaveBeenCalledWith({
      where: { empresaId: 'e1', estado: 'ACTIVO' },
    });
  });

  it('bloquea al alcanzar el límite de usuarios', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxUsuarios');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion('ACTIVE', { maxUsuarios: 1 }),
    });
    prisma.membresia.count.mockResolvedValue(1);

    const error = await guard
      .canActivate(makeCtx({ empresaId: 'e1' }) as any)
      .catch((e: any) => e);
    expect(error.response.code).toBe('LIMIT_EXCEEDED');
  });

  it('cuenta productos activos', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxProductos');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion('ACTIVE', { maxProductos: 2 }),
    });
    prisma.producto.count.mockResolvedValue(1);

    await expect(
      guard.canActivate(makeCtx({ empresaId: 'e1' }) as any),
    ).resolves.toBe(true);
    expect(prisma.producto.count).toHaveBeenCalledWith({
      where: { empresaId: 'e1', estado: 'ACTIVO' },
    });
  });

  it('permite si el entitlement no está definido en el plan (fallback 1)', async () => {
    reflector.getAllAndOverride.mockReturnValue('maxFacturas');
    prisma.empresa.findUnique.mockResolvedValue({
      suscripcion: suscripcion('ACTIVE', {}),
    });

    await expect(
      guard.canActivate(makeCtx({ empresaId: 'e1' }) as any),
    ).resolves.toBe(true);
  });
});
