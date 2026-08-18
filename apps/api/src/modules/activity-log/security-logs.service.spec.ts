import { ActivityLogService } from './activity-log.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('ActivityLogService security logs', () => {
  it('mapea metadata y filtra por severidad/búsqueda', async () => {
    const { prisma } = createPrismaMock();
    const service = new ActivityLogService(prisma);
    prisma.activityLog.count.mockResolvedValue(2);
    prisma.activityLog.findMany.mockResolvedValue([
      {
        id: 'l1',
        creadoEn: new Date(),
        accion: 'LOGIN_SUCCESS',
        ipAddress: '10.0.0.1',
        metadata: JSON.stringify({
          eventType: 'Inicio de sesión',
          actionTaken: 'Acceso autorizado',
          severity: 'Low',
        }),
      },
      {
        id: 'l2',
        creadoEn: new Date(),
        accion: 'ACCESS_BLOCKED',
        ipAddress: '10.0.0.2',
        metadata: null,
      },
    ]);

    const result = await service.findSecurityLogs({
      empresaId: 'e1',
      search: '10.0.0.1',
      severity: 'Low',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      eventType: 'Inicio de sesión',
      sourceIp: '10.0.0.1',
      severity: 'Low',
    });
  });

  it('calcula severidad para eventos sin metadata', async () => {
    const { prisma } = createPrismaMock();
    const service = new ActivityLogService(prisma);
    prisma.activityLog.count.mockResolvedValue(1);
    prisma.activityLog.findMany.mockResolvedValue([
      {
        id: 'l1',
        creadoEn: new Date(),
        accion: 'ACCESS_BLOCKED',
        metadata: null,
      },
    ]);

    const result = await service.findSecurityLogs({ empresaId: 'e1' });

    expect(result.items[0].severity).toBe('High');
    expect(result.items[0].destinationIp).toBe('No disponible');
  });

  it('clasifica eventos de seguridad por acción', () => {
    const { prisma } = createPrismaMock();
    const service = new ActivityLogService(prisma) as any;

    expect(service.securitySeverity('ACCESS_REVOKED')).toBe('Medium');
    expect(service.securitySeverity('PROFILE_UPDATED')).toBe('Low');
  });
});
