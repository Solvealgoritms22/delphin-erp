import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SucursalesService } from './sucursales.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('SucursalesService', () => {
  let service: SucursalesService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SucursalesService, mocks.provider],
    }).compile();

    service = module.get<SucursalesService>(SucursalesService);
  });

  it('crea una sucursal ligada a la empresa', async () => {
    prisma.sucursal.create.mockResolvedValue({ id: 's1' });

    await service.create('e1', { nombre: 'Sede Norte' });

    expect(prisma.sucursal.create).toHaveBeenCalledWith({
      data: { nombre: 'Sede Norte', empresaId: 'e1' },
    });
  });

  it('lista sucursales ordenadas por nombre', async () => {
    prisma.sucursal.findMany.mockResolvedValue([{ id: 's1' }]);

    const result = await service.findAll('e1');

    expect(result).toHaveLength(1);
    expect(prisma.sucursal.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
      orderBy: { nombre: 'asc' },
    });
  });

  it('obtiene una sucursal por id dentro de la empresa', async () => {
    prisma.sucursal.findFirst.mockResolvedValue({ id: 's1' });

    expect(await service.findOne('s1', 'e1')).toEqual({ id: 's1' });
    expect(prisma.sucursal.findFirst).toHaveBeenCalledWith({
      where: { id: 's1', empresaId: 'e1' },
    });
  });

  it('lanza NotFoundException si la sucursal no existe', async () => {
    prisma.sucursal.findFirst.mockResolvedValue(null);
    await expect(service.findOne('s9', 'e1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualiza una sucursal', async () => {
    prisma.sucursal.update.mockResolvedValue({ id: 's1' });

    await service.update('s1', 'e1', { nombre: 'Nuevo' });

    expect(prisma.sucursal.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { nombre: 'Nuevo' },
    });
  });

  it('elimina una sucursal', async () => {
    prisma.sucursal.delete.mockResolvedValue({});

    await service.remove('s1', 'e1');

    expect(prisma.sucursal.delete).toHaveBeenCalledWith({
      where: { id: 's1' },
    });
  });
});
