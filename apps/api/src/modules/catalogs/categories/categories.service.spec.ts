import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, mocks.provider],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('crea una categoría ligada a la empresa', async () => {
    prisma.categoria.create.mockResolvedValue({ id: 'c1' });

    await service.create('e1', { nombre: 'Alimentos' });

    expect(prisma.categoria.create).toHaveBeenCalledWith({
      data: { nombre: 'Alimentos', empresaId: 'e1' },
    });
  });

  it('lista categorías por empresa', async () => {
    prisma.categoria.findMany.mockResolvedValue([]);
    await service.findAll('e1');
    expect(prisma.categoria.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
  });

  it('lanza NotFoundException si la categoría no existe', async () => {
    prisma.categoria.findFirst.mockResolvedValue(null);
    await expect(service.findOne('e1', 'c9')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualiza y elimina tras verificar existencia', async () => {
    prisma.categoria.findFirst.mockResolvedValue({ id: 'c1' });
    prisma.categoria.update.mockResolvedValue({});
    prisma.categoria.delete.mockResolvedValue({});

    await service.update('e1', 'c1', { nombre: 'X' });
    await service.remove('e1', 'c1');

    expect(prisma.categoria.update).toHaveBeenCalled();
    expect(prisma.categoria.delete).toHaveBeenCalledWith({
      where: { id: 'c1' },
    });
  });
});
