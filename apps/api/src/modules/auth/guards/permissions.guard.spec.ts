import { ForbiddenException } from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const makeCtx = (user?: any) => ({
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  });

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as any);
  });

  it('permite cuando no hay permisos requeridos', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(guard.canActivate(makeCtx({}) as any)).resolves.toBe(true);
  });

  it('lanza ForbiddenException si no hay usuario ni permisos', async () => {
    reflector.getAllAndOverride.mockReturnValue(['facturas:leer']);

    await expect(guard.canActivate(makeCtx() as any)).rejects.toThrow(
      ForbiddenException,
    );
    await expect(guard.canActivate(makeCtx({}) as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('permite con wildcard *', async () => {
    reflector.getAllAndOverride.mockReturnValue(['facturas:leer']);

    await expect(
      guard.canActivate(makeCtx({ permissions: ['*'] }) as any),
    ).resolves.toBe(true);
  });

  it('permite cuando el usuario tiene todos los permisos', async () => {
    reflector.getAllAndOverride.mockReturnValue(['a', 'b']);

    await expect(
      guard.canActivate(makeCtx({ permissions: ['a', 'b'] }) as any),
    ).resolves.toBe(true);
  });

  it('retorna false si falta un permiso', async () => {
    reflector.getAllAndOverride.mockReturnValue(['a', 'b']);

    await expect(
      guard.canActivate(makeCtx({ permissions: ['a'] }) as any),
    ).resolves.toBe(false);
  });
});
