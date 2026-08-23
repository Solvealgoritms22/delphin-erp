import { NotFoundException } from '@nestjs/common';
import { SessionService } from './session.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('SessionService', () => {
  it('lista solo sesiones activas y calcula estado/current', async () => {
    const { prisma } = createPrismaMock();
    const service = new SessionService(prisma);
    prisma.userSession.findMany.mockResolvedValue([
      {
        id: 's1',
        browserName: null,
        osName: null,
        ipAddress: null,
        locationCountry: null,
        userAgent: null,
        creadoEn: new Date(),
        ultimoAcceso: new Date(),
        expiraEn: new Date(Date.now() + 60000),
        revokedAt: null,
        usuario: { nombre: 'Cuenta', email: 'cuenta@empresa.local' },
      },
      {
        id: 's3',
        browserName: 'Firefox',
        osName: 'Linux',
        ipAddress: '127.0.0.2',
        locationCountry: 'DO',
        creadoEn: new Date(),
        ultimoAcceso: new Date(),
        expiraEn: new Date(Date.now() - 60000),
        revokedAt: null,
        usuario: { nombre: null, email: 'cuenta@empresa.local' },
      },
    ]);

    const result = await service.findForUser('u1', 's1');

    expect(prisma.userSession.findMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1' },
      include: {
        usuario: { select: { nombre: true, email: true, avatar: true } },
      },
      orderBy: { ultimoAcceso: 'desc' },
      take: 50,
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 's1',
      personName: 'Cuenta',
      isCurrent: true,
      isActive: true,
    });
    expect(result[1]).toMatchObject({ isCurrent: false, isActive: false });
  });

  it('revoca una sesión propia', async () => {
    const { prisma } = createPrismaMock();
    const service = new SessionService(prisma);
    prisma.userSession.findFirst.mockResolvedValue({ id: 's1' });

    await expect(service.revoke('u1', 's1')).resolves.toEqual({
      success: true,
    });
    expect(prisma.userSession.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('rechaza revocar una sesión ajena o inexistente', async () => {
    const { prisma } = createPrismaMock();
    const service = new SessionService(prisma);
    prisma.userSession.findFirst.mockResolvedValue(null);

    await expect(service.revoke('u1', 's9')).rejects.toThrow(NotFoundException);
  });

  it('revoca las demás sesiones conservando la actual', async () => {
    const { prisma } = createPrismaMock();
    const service = new SessionService(prisma);

    await expect(service.revokeOthers('u1', 's1')).resolves.toEqual({
      success: true,
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1', id: { not: 's1' }, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('revoca todas las sesiones si no se indica una actual', async () => {
    const { prisma } = createPrismaMock();
    const service = new SessionService(prisma);

    await service.revokeOthers('u1');

    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
