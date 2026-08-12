import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { createPrismaMock } from '../../../test/mocks/prisma.mock';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, mocks.provider],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('crea un cliente ligado a la empresa', async () => {
    prisma.cliente.create.mockResolvedValue({ id: 'cl1' });

    await service.create('e1', { nombreRazonSocial: 'Juan' });

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: { nombreRazonSocial: 'Juan', empresaId: 'e1' },
    });
  });

  it('lista clientes por empresa', async () => {
    prisma.cliente.findMany.mockResolvedValue([]);
    await service.findAll('e1');
    expect(prisma.cliente.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
  });

  it('lanza NotFoundException si el cliente no existe', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);
    await expect(service.findOne('cl9', 'e1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('devuelve el cliente encontrado', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cl1',
      nombreRazonSocial: 'Juan',
    });

    await expect(service.findOne('cl1', 'e1')).resolves.toEqual({
      id: 'cl1',
      nombreRazonSocial: 'Juan',
    });
  });

  it('actualiza con fallback al where por id', async () => {
    prisma.cliente.update.mockRejectedValueOnce(new Error('constraint'));
    prisma.cliente.update.mockResolvedValueOnce({ id: 'cl1' });

    await service.update('cl1', 'e1', { email: 'x@y.com' });

    expect(prisma.cliente.update).toHaveBeenCalledTimes(2);
  });

  it('elimina un cliente', async () => {
    prisma.cliente.delete.mockResolvedValue({});
    await service.remove('cl1', 'e1');
    expect(prisma.cliente.delete).toHaveBeenCalledWith({
      where: { id: 'cl1' },
    });
  });
});
