import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [SuppliersService, mocks.provider],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  it('crea un proveedor ligado a la empresa', async () => {
    prisma.proveedor.create.mockResolvedValue({ id: 'sp1' });

    await service.create('e1', { nombreRazonSocial: 'Distribuidora' });

    expect(prisma.proveedor.create).toHaveBeenCalledWith({
      data: { nombreRazonSocial: 'Distribuidora', empresaId: 'e1' },
    });
  });

  it('lista proveedores por empresa', async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);
    await service.findAll('e1');
    expect(prisma.proveedor.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
  });

  it('lanza NotFoundException si el proveedor no existe', async () => {
    prisma.proveedor.findFirst.mockResolvedValue(null);
    await expect(service.findOne('sp9', 'e1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('devuelve el proveedor encontrado', async () => {
    prisma.proveedor.findFirst.mockResolvedValue({
      id: 'sp1',
      nombreRazonSocial: 'Dist',
    });

    await expect(service.findOne('sp1', 'e1')).resolves.toEqual({
      id: 'sp1',
      nombreRazonSocial: 'Dist',
    });
  });

  it('actualiza con fallback al where por id', async () => {
    prisma.proveedor.update.mockRejectedValueOnce(new Error('constraint'));
    prisma.proveedor.update.mockResolvedValueOnce({ id: 'sp1' });

    await service.update('sp1', 'e1', { email: 'x@y.com' });

    expect(prisma.proveedor.update).toHaveBeenCalledTimes(2);
  });

  it('elimina un proveedor', async () => {
    prisma.proveedor.delete.mockResolvedValue({});
    await service.remove('sp1', 'e1');
    expect(prisma.proveedor.delete).toHaveBeenCalledWith({
      where: { id: 'sp1' },
    });
  });
});
