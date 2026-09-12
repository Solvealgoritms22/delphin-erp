import { createHash } from 'crypto';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session and tenant boundary', () => {
  const request = {
    headers: { authorization: 'Bearer signed-session-token' },
  } as any;
  const payload = {
    sub: 'u1',
    sessionId: 's1',
    empresaId: 'e1',
    permissions: ['*'],
    iat: 123,
  };
  let prisma: any;
  let strategy: JwtStrategy;
  beforeEach(() => {
    prisma = {
      userSession: {
        findFirst: jest.fn().mockResolvedValue({ ultimoAcceso: new Date() }),
        updateMany: jest.fn(),
      },
      empresa: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ propietarioId: 'owner', estado: 'ACTIVA' }),
      },
      membresia: {
        findUnique: jest.fn().mockResolvedValue({
          estado: 'ACTIVO',
          role: { permissions: ['invoices:read'] },
        }),
      },
    };
    strategy = new JwtStrategy(prisma);
  });
  it('rejects tokens without a tracked session', async () => {
    await expect(strategy.validate(request, { sub: 'u1' })).rejects.toThrow(
      'Sesión inválida',
    );
    expect(prisma.userSession.findFirst).not.toHaveBeenCalled();
  });
  it('binds authentication to the exact bearer hash and rejects revoked sessions', async () => {
    prisma.userSession.findFirst.mockResolvedValue(null);
    await expect(strategy.validate(request, payload)).rejects.toThrow(
      'Sesión revocada',
    );
    expect(prisma.userSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 's1',
          usuarioId: 'u1',
          revokedAt: null,
          tokenHash: createHash('sha256')
            .update('signed-session-token')
            .digest('hex'),
        }),
      }),
    );
  });
  it('uses current database permissions instead of stale token permissions', async () => {
    await expect(strategy.validate(request, payload)).resolves.toMatchObject({
      id: 'u1',
      empresaId: 'e1',
      permissions: ['invoices:read'],
    });
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
  });
  it('rejects an archived company even for its owner', async () => {
    prisma.empresa.findUnique.mockResolvedValue({
      propietarioId: 'u1',
      estado: 'ARCHIVADA',
    });
    await expect(strategy.validate(request, payload)).rejects.toThrow(
      'Empresa inactiva',
    );
  });
  it('rejects a removed membership', async () => {
    prisma.membresia.findUnique.mockResolvedValue(null);
    await expect(strategy.validate(request, payload)).rejects.toThrow(
      'Membresía inactiva',
    );
  });
  it('throttles session activity writes', async () => {
    prisma.userSession.findFirst.mockResolvedValue({
      ultimoAcceso: new Date(Date.now() - 600_000),
    });
    await strategy.validate(request, payload);
    expect(prisma.userSession.updateMany).toHaveBeenCalledTimes(1);
  });
});
