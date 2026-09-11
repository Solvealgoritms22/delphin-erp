import { BadRequestException } from '@nestjs/common';
import { createPrismaMock } from '../../test/mocks/prisma.mock';
import { NotificationsService } from './notifications.service';
import { NotificationsWorker } from './notifications.worker';

describe('Notification channel integration', () => {
  function setup() {
    const { prisma } = createPrismaMock();
    prisma.empresa.findFirst.mockResolvedValue({ propietarioId: 'owner' });
    prisma.membresia.findMany.mockResolvedValue([]);
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.notification.create.mockResolvedValue({
      id: 'notification',
      payload: null,
    });
    const email = { send: jest.fn().mockResolvedValue('message') },
      push = { isEnabled: () => true, send: jest.fn() },
      realtime = { publish: jest.fn() };
    const service = new NotificationsService(
      prisma,
      realtime as any,
      email as any,
      push as any,
    );
    return { prisma, email, push, realtime, service };
  }
  const input = {
    empresaId: 'tenant',
    usuarioId: 'owner',
    tipo: 'INVOICE_EMITTED',
    titulo: 'Factura',
    mensaje: 'Emitida',
    canales: ['IN_APP'],
  };

  it('honors EMAIL enabled even when the producer only requested IN_APP', async () => {
    const { prisma, service } = setup();
    prisma.notificationPreference.findMany.mockResolvedValue([
      { tipo: input.tipo, canal: 'EMAIL', habilitado: true },
    ]);
    await service.create(input);
    expect(
      prisma.notification.create.mock.calls[0][0].data.deliveries.create,
    ).toEqual([{ canal: 'IN_APP' }, { canal: 'EMAIL' }]);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('does not publish an email-only event into the application stream', async () => {
    const { prisma, realtime, service } = setup();
    prisma.notificationPreference.findMany.mockResolvedValue([
      { tipo: 'ALL', canal: 'IN_APP', habilitado: false },
      { tipo: input.tipo, canal: 'EMAIL', habilitado: true },
    ]);
    await service.create(input);
    expect(realtime.publish).not.toHaveBeenCalled();
  });
  it('requires an explicit recipient or company; never broadcasts globally', async () => {
    const { service, prisma } = setup();
    await expect(
      service.create({ tipo: 'SYSTEM', titulo: 'x', mensaje: 'x' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
  it('only includes the owner and members with the corresponding permission', async () => {
    const { service, prisma } = setup();
    prisma.membresia.findMany.mockResolvedValue([
      { usuarioId: 'authorized', role: { permissions: '["invoices:read"]' } },
      { usuarioId: 'unauthorized', role: { permissions: '["catalogs:read"]' } },
    ]);
    await service.create({ ...input, usuarioId: undefined });
    expect(
      prisma.notification.create.mock.calls.map(
        (call) => call[0].data.usuarioId,
      ),
    ).toEqual(['owner', 'authorized']);
  });
  it('does not create another notification for the same persistent deduplication key', async () => {
    const { service, prisma } = setup();
    prisma.notification.findUnique.mockResolvedValue({ id: 'existing' });
    await service.create({ ...input, deduplicationKey: 'invoice:day' });
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });
  it('rechecks opt-out before sending queued email', async () => {
    const { service, prisma, email } = setup();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notification',
      empresaId: 'tenant',
      usuarioId: 'owner',
      tipo: input.tipo,
      usuario: { email: 'owner@example.invalid' },
      deliveries: [{ id: 'd1', canal: 'EMAIL', estado: 'PENDING' }],
    });
    prisma.notificationPreference.findMany.mockResolvedValue([
      { tipo: input.tipo, canal: 'EMAIL', habilitado: false },
    ]);
    await service.deliver('notification');
    expect(email.send).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { estado: 'SKIPPED' },
    });
  });
  it('does not deliver queued company data after membership is revoked', async () => {
    const { service, prisma, email } = setup();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n',
      empresaId: 'tenant',
      usuarioId: 'former-member',
      tipo: input.tipo,
      deliveries: [{ id: 'd', canal: 'EMAIL' }],
    });
    await service.deliver('n');
    expect(email.send).not.toHaveBeenCalled();
    expect(prisma.notificationDelivery.updateMany).toHaveBeenCalled();
  });
  it('continues other channels when email fails and lets the outbox retry', async () => {
    const { service, prisma, email } = setup();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n',
      empresaId: 'tenant',
      usuarioId: 'owner',
      tipo: input.tipo,
      usuario: { email: 'owner@example.invalid' },
      deliveries: [
        { id: 'email', canal: 'EMAIL', estado: 'PENDING' },
        { id: 'app', canal: 'IN_APP', estado: 'PENDING' },
      ],
    });
    email.send.mockRejectedValue(new Error('SMTP unavailable'));
    await expect(service.deliver('n')).rejects.toThrow('channels failed');
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'email' },
        data: expect.objectContaining({ estado: 'RETRYING' }),
      }),
    );
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app' },
        data: expect.objectContaining({ estado: 'SENT' }),
      }),
    );
  });
  it('rejects unsupported channels and non-boolean preferences', () => {
    const { service } = setup();
    expect(() =>
      service.savePreference('owner', 'INVOICE_EMITTED', 'SMS', true),
    ).toThrow(BadRequestException);
    expect(() =>
      service.savePreference(
        'owner',
        'INVOICE_EMITTED',
        'EMAIL',
        'true' as any,
      ),
    ).toThrow(BadRequestException);
  });
  it('rejects push subscriptions targeting internal hosts', () => {
    const { service } = setup();
    expect(() =>
      service.savePushSubscription('owner', {
        endpoint: 'https://127.0.0.1/internal',
        keys: { p256dh: 'a', auth: 'b' },
      }),
    ).toThrow(BadRequestException);
  });
  it('a failed outbox claim never dispatches the notification', async () => {
    const { service, prisma } = setup();
    prisma.outboxEvent.findMany.mockResolvedValue([
      {
        id: 'event',
        estado: 'PENDING',
        intentos: 0,
        proximoIntentoEn: null,
        payload: '{"notificationId":"n"}',
      },
    ]);
    prisma.outboxEvent.updateMany.mockResolvedValue({ count: 0 });
    const deliver = jest.spyOn(service, 'deliver');
    await new NotificationsWorker(prisma, service).processOutbox();
    expect(deliver).not.toHaveBeenCalled();
  });
});
