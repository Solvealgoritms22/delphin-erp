import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService, mocks.provider],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('crea un producto ligado a la empresa', async () => {
    prisma.producto.create.mockResolvedValue({ id: 'p1' });

    await service.create('e1', { nombre: 'Arroz' });

    expect(prisma.producto.create).toHaveBeenCalledWith({
      data: { nombre: 'Arroz', empresaId: 'e1' },
    });
  });

  it('lista productos con relaciones', async () => {
    prisma.producto.findMany.mockResolvedValue([{ id: 'p1' }]);

    await service.findAll('e1');

    expect(prisma.producto.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
      include: {
        categoria: true,
        marca: true,
        unidadMedida: true,
        impuesto: true,
      },
    });
  });

  it('lanza NotFoundException si el producto no existe', async () => {
    prisma.producto.findFirst.mockResolvedValue(null);
    await expect(service.findOne('e1', 'p9')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('actualiza tras verificar existencia', async () => {
    prisma.producto.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.producto.update.mockResolvedValue({ id: 'p1' });

    await service.update('e1', 'p1', { nombre: 'Arroz 2' });

    expect(prisma.producto.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { nombre: 'Arroz 2' },
    });
  });

  it('elimina tras verificar existencia', async () => {
    prisma.producto.findFirst.mockResolvedValue({ id: 'p1' });
    prisma.producto.delete.mockResolvedValue({});

    await service.remove('e1', 'p1');

    expect(prisma.producto.delete).toHaveBeenCalledWith({
      where: { id: 'p1' },
    });
  });
});
