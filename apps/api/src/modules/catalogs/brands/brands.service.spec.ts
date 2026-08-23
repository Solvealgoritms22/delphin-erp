import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';

describe('BrandsService', () => {
  let service: BrandsService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [BrandsService, mocks.provider],
    }).compile();

    service = module.get<BrandsService>(BrandsService);
  });

  it('crea una marca ligada a la empresa', async () => {
    prisma.marca.create.mockResolvedValue({ id: 'b1' });

    await service.create('e1', { nombre: 'Nestlé' });

    expect(prisma.marca.create).toHaveBeenCalledWith({
      data: { nombre: 'Nestlé', empresaId: 'e1' },
    });
  });

  it('lista marcas por empresa', async () => {
    prisma.marca.findMany.mockResolvedValue([]);
    await service.findAll('e1');
    expect(prisma.marca.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
  });

  it('lanza NotFoundException si la marca no existe', async () => {
    prisma.marca.findFirst.mockResolvedValue(null);
    await expect(service.findOne('b9', 'e1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('devuelve la marca encontrada', async () => {
    prisma.marca.findFirst.mockResolvedValue({ id: 'b1', nombre: 'Nestlé' });

    await expect(service.findOne('b1', 'e1')).resolves.toEqual({
      id: 'b1',
      nombre: 'Nestlé',
    });
  });

  it('actualiza con fallback al where por id', async () => {
    prisma.marca.update.mockRejectedValueOnce(new Error('constraint'));
    prisma.marca.update.mockResolvedValueOnce({ id: 'b1' });

    await service.update('b1', 'e1', { nombre: 'X' });

    expect(prisma.marca.update).toHaveBeenCalledTimes(2);
  });

  it('elimina una marca', async () => {
    prisma.marca.delete.mockResolvedValue({});
    await service.remove('b1', 'e1');
    expect(prisma.marca.delete).toHaveBeenCalledWith({ where: { id: 'b1' } });
  });
});
