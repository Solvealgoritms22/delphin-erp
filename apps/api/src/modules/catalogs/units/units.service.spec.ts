import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UnitsService } from './units.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';

describe('UnitsService', () => {
  let service: UnitsService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [UnitsService, mocks.provider],
    }).compile();

    service = module.get<UnitsService>(UnitsService);
  });

  it('crea una unidad de medida ligada a la empresa', async () => {
    prisma.unidadMedida.create.mockResolvedValue({ id: 'u1' });

    await service.create('e1', { nombre: 'Kilogramo', abreviatura: 'kg' });

    expect(prisma.unidadMedida.create).toHaveBeenCalledWith({
      data: {
        nombre: 'Kilogramo',
        abreviatura: 'kg',
        tipo: 'PRODUCTO',
        empresaId: 'e1',
      },
    });
  });

  it('lista unidades por empresa', async () => {
    prisma.unidadMedida.findMany.mockResolvedValue([]);
    await service.findAll('e1');
    expect(prisma.unidadMedida.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
      orderBy: { nombre: 'asc' },
    });
  });

  it('lanza NotFoundException si la unidad no existe', async () => {
    prisma.unidadMedida.findFirst.mockResolvedValue(null);
    await expect(service.findOne('u9', 'e1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('devuelve la unidad encontrada', async () => {
    prisma.unidadMedida.findFirst.mockResolvedValue({ id: 'u1', nombre: 'kg' });

    await expect(service.findOne('u1', 'e1')).resolves.toEqual({
      id: 'u1',
      nombre: 'kg',
    });
  });

  it('actualiza con fallback al where por id', async () => {
    prisma.unidadMedida.update.mockRejectedValueOnce(new Error('constraint'));
    prisma.unidadMedida.update.mockResolvedValueOnce({ id: 'u1' });

    await service.update('u1', 'e1', { nombre: 'Libra' });

    expect(prisma.unidadMedida.update).toHaveBeenCalledTimes(2);
  });

  it('elimina una unidad', async () => {
    prisma.unidadMedida.delete.mockResolvedValue({});
    await service.remove('u1', 'e1');
    expect(prisma.unidadMedida.delete).toHaveBeenCalledWith({
      where: { id: 'u1' },
    });
  });
});
