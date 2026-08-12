import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, mocks.provider],
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

    it('reutiliza usuario existente y crea la membresía', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hash');
      prisma.membresia.count.mockResolvedValue(0);
      prisma.usuario.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.membresia.create.mockResolvedValue({});

      await service.create('e1', { email: 'old@x.com' });

      expect(prisma.usuario.create).not.toHaveBeenCalled();
      expect(prisma.membresia.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('impide desactivar al propietario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });

      await expect(
        service.update('e1', 'u1', { estado: 'INACTIVO' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('actualiza contraseña cuando se envía', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'x',
      });
      prisma.usuario.update.mockResolvedValue({});
      prisma.membresia.update.mockResolvedValue({});

      await service.update('e1', 'u2', { password: 'nueva' });

      expect(prisma.usuario.update).toHaveBeenCalled();
      expect(prisma.membresia.update).toHaveBeenCalled();
    });

    it('actualiza rol y estado', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'x',
      });
      prisma.membresia.update.mockResolvedValue({});

      await service.update('e1', 'u2', { roleId: 'r2', estado: 'ACTIVO' });

      expect(prisma.membresia.update).toHaveBeenCalledWith({
        where: { usuarioId_empresaId: { usuarioId: 'u2', empresaId: 'e1' } },
        data: { roleId: 'r2', estado: 'ACTIVO' },
      });
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
