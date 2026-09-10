import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';
import * as bcrypt from 'bcrypt';

import { ActivityLogService } from '../activity-log/activity-log.service';
import { TenantMailerService } from '../../common/tenant-mailer.service';
import { MailerService } from '@nestjs-modules/mailer';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        mocks.provider,
        { provide: ActivityLogService, useValue: { log: jest.fn() } },
        { provide: TenantMailerService, useValue: { sendMail: jest.fn() } },
        { provide: MailerService, useValue: { sendMail: jest.fn() } },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findOne', () => {
    it('busca usuario por email', async () => {
      prisma.usuario.findFirst.mockResolvedValue({ id: 'u1' });
      expect(await service.findOne('a@b.com')).toEqual({ id: 'u1' });
      expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
    });
  });

  describe('findAllByEmpresa', () => {
    it('formatea lastOnline y marca al propietario', async () => {
      const lastAccess = new Date('2026-08-07T16:30:00Z');
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.membresia.findMany.mockResolvedValue([
        {
          estado: 'ACTIVO',
          roleId: 'r1',
          usuario: {
            id: 'u1',
            email: 'a@b.com',
            nombre: 'Ana',
            avatar: null,
            mfaHabilitado: false,
            ultimoAcceso: lastAccess,
          },
        },
      ]);

      const result = await service.findAllByEmpresa('e1');

      expect(result).toHaveLength(1);
      expect(result[0].isOwner).toBe(true);
      expect(result[0].lastOnlineDate).not.toBe('N/A');
      expect(prisma.membresia.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId: 'e1' } }),
      );
    });

    it('usa N/A si no hay ultimoAcceso', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'x',
      });
      prisma.membresia.findMany.mockResolvedValue([
        { estado: 'ACTIVO', usuario: { id: 'u2', ultimoAcceso: null } },
      ]);

      const result = await service.findAllByEmpresa('e1');
      expect(result[0].lastOnlineDate).toBe('N/A');
    });
  });

  describe('create', () => {
    it('crea usuario nuevo y lo vincula con membresía', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      prisma.membresia.count.mockResolvedValue(0);
      prisma.usuario.findUnique.mockResolvedValue(null);
      prisma.usuario.create.mockResolvedValue({ id: 'u1' });
      prisma.membresia.create.mockResolvedValue({ id: 'm1' });

      await service.create('e1', { email: 'n@x.com', roleId: 'r1' });

      expect(prisma.usuario.create).toHaveBeenCalled();
      expect(prisma.membresia.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          usuarioId: 'u1',
          empresaId: 'e1',
          estado: 'ACTIVO',
        }),
      });
    });

    it('rechaza vincular una identidad existente sin autorización', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      prisma.membresia.count.mockResolvedValue(0);
      prisma.usuario.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.membresia.create.mockResolvedValue({});

      await expect(service.create('e1', { email: 'old@x.com' })).rejects.toThrow('autorizar');

      expect(prisma.usuario.create).not.toHaveBeenCalled();
      expect(prisma.membresia.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('impide desactivar al propietario', async () => {
      prisma.membresia.findUnique.mockResolvedValue({ usuario: {}, empresa: { propietarioId: 'u1' } });
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });

      await expect(
        service.update('e1', 'u1', { estado: 'INACTIVO' }, 'actor'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects administrative password replacement', async () => {
      await expect(service.update('e1', 'u2', { password: 'new-password-test' }, 'actor')).rejects.toThrow('recuperación');
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('does not change a global identity before validating membership', async () => {
      prisma.membresia.findUnique.mockResolvedValue(null);
      await expect(service.update('e1', 'u2', { name: 'Changed' }, 'actor')).rejects.toThrow('no encontrado');
      expect(prisma.usuario.update).not.toHaveBeenCalled();
    });

    it('actualiza rol y estado', async () => {
      prisma.membresia.findUnique.mockResolvedValue({ usuario: {}, empresa: { propietarioId: 'owner' } });
      prisma.role.findFirst.mockResolvedValue({ id: 'r2', empresaId: 'e1' });
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'x',
      });
      prisma.membresia.update.mockResolvedValue({});

      await service.update('e1', 'u2', { roleId: 'r2', estado: 'ACTIVO' }, 'actor');

      expect(prisma.membresia.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: { usuarioId_empresaId: { usuarioId: 'u2', empresaId: 'e1' } },
        update: { roleId: 'r2', estado: 'ACTIVO' },
      }));
      expect(prisma.userSession.updateMany).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('impide eliminar al propietario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });

      await expect(service.remove('e1', 'u1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('elimina la membresía del usuario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'x',
      });
      prisma.membresia.delete.mockResolvedValue({});

      await service.remove('e1', 'u2');

      expect(prisma.membresia.delete).toHaveBeenCalledWith({
        where: { usuarioId_empresaId: { usuarioId: 'u2', empresaId: 'e1' } },
      });
    });
  });
});
