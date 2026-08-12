import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('RolesService', () => {
  let service: RolesService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService, mocks.provider],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('lista roles de la empresa ordenados', async () => {
    prisma.role.findMany.mockResolvedValue([{ id: 'r1' }]);

    const result = await service.findAllByEmpresa('e1');

    expect(result).toHaveLength(1);
    expect(prisma.role.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
      orderBy: { nombre: 'asc' },
    });
  });

  it('crea un rol nuevo', async () => {
    prisma.role.findFirst.mockResolvedValue(null);
    prisma.role.create.mockResolvedValue({ id: 'r1' });

    await service.create('e1', { nombre: 'Vendedor', permissions: '["x"]' });

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: {
        empresaId: 'e1',
        nombre: 'Vendedor',
        descripcion: null,
        permissions: '["x"]',
      },
    });
  });

  it('lanza ConflictException si el rol ya existe', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'r1' });

    await expect(service.create('e1', { nombre: 'Vendedor' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('lanza NotFoundException al actualizar un rol inexistente', async () => {
    prisma.role.findFirst.mockResolvedValue(null);

    await expect(service.update('e1', 'r9', { nombre: 'X' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualiza rol manteniendo permisos previos si no se envían', async () => {
    prisma.role.findFirst
      .mockResolvedValueOnce({
        id: 'r1',
        empresaId: 'e1',
        nombre: 'Vendedor',
        descripcion: null,
        permissions: '["a"]',
      })
      .mockResolvedValueOnce(null);
    prisma.role.update.mockResolvedValue({});

    await service.update('e1', 'r1', { nombre: 'Vendedor Sr.' });

    expect(prisma.role.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { nombre: 'Vendedor Sr.', descripcion: null, permissions: '["a"]' },
    });
  });

  it('lanza ConflictException en update si el nuevo nombre ya existe', async () => {
    prisma.role.findFirst
      .mockResolvedValueOnce({ id: 'r1', empresaId: 'e1', nombre: 'Vendedor' })
      .mockResolvedValueOnce({ id: 'r2' });

    await expect(
      service.update('e1', 'r1', { nombre: 'Admin' }),
    ).rejects.toThrow(ConflictException);
  });

  it('elimina un rol', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'r1', empresaId: 'e1' });
    prisma.role.delete.mockResolvedValue({});

    await service.remove('e1', 'r1');

    expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('lanza NotFoundException al eliminar un rol inexistente', async () => {
    prisma.role.findFirst.mockResolvedValue(null);

    await expect(service.remove('e1', 'r9')).rejects.toThrow(NotFoundException);
  });
});
