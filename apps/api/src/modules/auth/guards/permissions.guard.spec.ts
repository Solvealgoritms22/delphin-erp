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

  it('permite cuando no hay permisos requeridos', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(makeCtx({}) as any)).toBe(true);
  });

  it('lanza ForbiddenException si no hay usuario ni permisos', () => {
    reflector.getAllAndOverride.mockReturnValue(['facturas:leer']);

    expect(() => guard.canActivate(makeCtx() as any)).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(makeCtx({}) as any)).toThrow(
      ForbiddenException,
    );
  });

  it('permite con wildcard *', () => {
    reflector.getAllAndOverride.mockReturnValue(['facturas:leer']);

    expect(guard.canActivate(makeCtx({ permissions: ['*'] }) as any)).toBe(
      true,
    );
  });

  it('permite cuando el usuario tiene todos los permisos', () => {
    reflector.getAllAndOverride.mockReturnValue(['a', 'b']);

    expect(guard.canActivate(makeCtx({ permissions: ['a', 'b'] }) as any)).toBe(
      true,
    );
  });

  it('lanza ForbiddenException si falta un permiso', () => {
    reflector.getAllAndOverride.mockReturnValue(['a', 'b']);

    expect(() =>
      guard.canActivate(makeCtx({ permissions: ['a'] }) as any),
    ).toThrow(ForbiddenException);
  });
});
