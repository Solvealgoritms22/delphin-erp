import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  it('mapea el payload del token en validate', () => {
    const strategy = new JwtStrategy({ userSession: { findFirst: jest.fn(), update: jest.fn() } } as any);

    const result = strategy.validate({
      sub: 'u1',
      email: 'a@b.com',
      empresaId: 'e1',
      roleId: null,
      name: 'Admin',
      avatar: null,
      permissions: ['*'],
      plan: 'Pro',
    });

    expect(result).resolves.toEqual({
      id: 'u1',
      email: 'a@b.com',
      empresaId: 'e1',
      roleId: null,
      name: 'Admin',
      avatar: null,
      permissions: ['*'],
      sessionId: undefined,
      plan: 'Pro',
    });
  });

  it('rechaza una sesión revocada', async () => {
    const prisma = { userSession: { findFirst: jest.fn().mockResolvedValue(null) } };
    const strategy = new JwtStrategy(prisma as any);

    await expect(
      strategy.validate({ sub: 'u1', sessionId: 's1' }),
    ).rejects.toThrow('Sesión revocada o expirada');
  });

  it('acepta y actualiza una sesión vigente', async () => {
    const prisma = {
      userSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 's1' }),
        update: jest.fn(),
      },
    };
    const strategy = new JwtStrategy(prisma as any);

    await expect(strategy.validate({ sub: 'u1', sessionId: 's1' })).resolves.toMatchObject({
      id: 'u1',
      empresaId: undefined,
    });
    expect(prisma.userSession.update).toHaveBeenCalled();
  });
});
