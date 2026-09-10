import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';
import { ActivityLogService } from '../../activity-log/activity-log.service';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        mocks.provider,
        { provide: ActivityLogService, useValue: { log: jest.fn() } },
      ],
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

  it('never retries a failed update without the tenant boundary', async () => {
    prisma.proveedor.update.mockRejectedValueOnce(new Error('constraint'));
    await expect(service.update('sp1', 'e1', { email: 'x@y.com' })).rejects.toThrow('constraint');
    expect(prisma.proveedor.update).toHaveBeenCalledTimes(1);
    expect(prisma.proveedor.update).toHaveBeenCalledWith({ where: { id: 'sp1', empresaId: 'e1' }, data: { email: 'x@y.com' } });
  });

  it('elimina un proveedor', async () => {
    prisma.proveedor.delete.mockResolvedValue({});
    prisma.proveedor.findFirst.mockResolvedValue({ id: 'sp1', empresaId: 'e1' });
    await service.remove('sp1', 'e1');
    expect(prisma.proveedor.delete).toHaveBeenCalledWith({
      where: { id: 'sp1', empresaId: 'e1' },
    });
  });
});
