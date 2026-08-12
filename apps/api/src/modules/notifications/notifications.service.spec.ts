import { NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../../test/mocks/prisma.mock';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const dependencies = () => {
    const { prisma } = createPrismaMock();
    const realtime = { publish: jest.fn(), stream: jest.fn() };
    const email = { send: jest.fn() };
    const push = { send: jest.fn() };
    return {
      prisma,
      realtime,
      email,
      push,
      service: new NotificationsService(prisma, realtime as any, email as any, push as any),
    };
  };

  it('crea una notificación dirigida a un usuario y publica el evento', async () => {
    const { prisma, realtime, service } = dependencies();
    prisma.notification.create.mockResolvedValue({
      id: 'n1',
      payload: JSON.stringify({ route: '/notifications' }),
    });

    const result = await service.create({
      usuarioId: 'u1',
      empresaId: 'e1',
      tipo: 'SECURITY_LOGIN',
      titulo: 'Nuevo acceso',
      mensaje: 'Se detectó un nuevo acceso.',
      canales: ['IN_APP', 'EMAIL'],
      payload: { route: '/notifications' },
    });

    expect(result).toHaveLength(1);
    expect(prisma.outboxEvent.create).toHaveBeenCalled();
    expect(realtime.publish).toHaveBeenCalledWith('u1', expect.any(Object));
  });

  it('expande una notificación de empresa a sus miembros activos', async () => {
    const { prisma, service } = dependencies();
    prisma.usuario.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.notification.create.mockResolvedValue({ id: 'n1', payload: null });

    await service.create({
      empresaId: 'e1',
      tipo: 'SYSTEM',
      titulo: 'Mantenimiento',
      mensaje: 'La empresa tendrá mantenimiento.',
    });

    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
  });

  it('lista, cuenta y marca notificaciones como leídas', async () => {
    const { prisma, service } = dependencies();
    prisma.notification.findMany.mockResolvedValue([{ id: 'n1', payload: null }]);
    prisma.notification.count.mockResolvedValue(1);

    await expect(service.list('u1', { unread: true })).resolves.toMatchObject({ total: 1 });
    await expect(service.unreadCount('u1')).resolves.toEqual({ count: 1 });

    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.markRead('u1', 'n1')).resolves.toEqual({ success: true });
    await expect(service.markAllRead('u1')).resolves.toEqual({ success: true });
  });

  it('rechaza marcar una notificación que no pertenece al usuario', async () => {
    const { prisma, service } = dependencies();
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.markRead('u1', 'n9')).rejects.toThrow(NotFoundException);
  });

  it('administra preferencias y suscripciones push', async () => {
    const { prisma, service } = dependencies();
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notificationPreference.upsert.mockResolvedValue({ habilitado: true });
    prisma.pushSubscription.upsert.mockResolvedValue({ id: 'p1' });

    await expect(service.preferences('u1')).resolves.toEqual([]);
    await expect(service.savePreference('u1', 'SECURITY', 'WEB_PUSH', true)).resolves.toEqual({ habilitado: true });
    await expect(service.savePushSubscription('u1', {
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'key', auth: 'auth' },
    })).resolves.toEqual({ id: 'p1' });
  });
});
