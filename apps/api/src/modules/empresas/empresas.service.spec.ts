import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('EmpresasService', () => {
  let service: EmpresasService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmpresasService, mocks.provider],
    }).compile();

    service = module.get<EmpresasService>(EmpresasService);
  });

  describe('getPlans', () => {
    it('devuelve el catálogo de planes', () => {
      const plans = service.getPlans();
      expect(plans.map((p) => p.id)).toEqual([
        'trial',
        'starter',
        'pro',
        'enterprise',
      ]);
    });
  });

  describe('findCurrent', () => {
    it('retorna la empresa con su propietario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietario: { id: 'u1' },
      });

      const result = await service.findCurrent('e1');

      expect(result.id).toBe('e1');
      expect(prisma.empresa.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'e1' } }),
      );
    });

    it('lanza NotFoundException si no existe', async () => {
      prisma.empresa.findUnique.mockResolvedValue(null);
      await expect(service.findCurrent('e9')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCurrent', () => {
    it('actualiza los datos de la empresa', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.empresa.update.mockResolvedValue({
        id: 'e1',
        razonSocial: 'Nuevo',
      });
      await service.updateCurrent('u1', 'e1', { razonSocial: 'Nuevo' });
      expect(prisma.empresa.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { razonSocial: 'Nuevo' },
        select: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    it('crea empresa con trial de 15 días y membresía del propietario', async () => {
      prisma.empresa.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 'e-new', ...data }),
      );

      const result = await service.create('u1', { razonSocial: 'Mi Empresa' });

      expect(result.razonSocial).toBe('Mi Empresa');
      const createData = prisma.empresa.create.mock.calls[0][0].data;
      expect(createData.propietarioId).toBe('u1');
      expect(createData.membresias.create.usuarioId).toBe('u1');
      expect(createData.suscripcion.create.planId).toBe('trial');
      expect(createData.suscripcion.create.estado).toBe('TRIAL');
    });
  });

  describe('update', () => {
    it('lanza error si el usuario no es propietario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'owner',
      });

      await expect(
        service.update('u1', 'e1', { razonSocial: 'X' }),
      ).rejects.toThrow('No tienes permisos');
    });

    it('actualiza solo campos presentes', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.empresa.update.mockResolvedValue({});

      await service.update('u1', 'e1', { razonSocial: 'X', telefono: '555' });

      expect(prisma.empresa.update).toHaveBeenCalledWith({
        where: { id: 'e1' },
        data: { razonSocial: 'X', telefono: '555' },
      });
    });
  });

  describe('remove', () => {
    it('lanza error si no es propietario', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'owner',
      });
      await expect(service.remove('u1', 'e1')).rejects.toThrow(
        'No tienes permisos',
      );
    });

    it('elimina la empresa', async () => {
      prisma.empresa.findUnique.mockResolvedValue({
        id: 'e1',
        propietarioId: 'u1',
      });
      prisma.empresa.delete.mockResolvedValue({});

      await service.remove('u1', 'e1');

      expect(prisma.empresa.delete).toHaveBeenCalledWith({
        where: { id: 'e1' },
      });
    });
  });

  describe('findAllForUser', () => {
    it('combina empresas propias y membresías activas sin duplicar', async () => {
      prisma.empresa.findMany.mockResolvedValue([
        { id: 'e1', razonSocial: 'A' },
      ]);
      prisma.membresia.findMany.mockResolvedValue([
        { estado: 'ACTIVO', empresa: { id: 'e1', razonSocial: 'A' } },
        { estado: 'ACTIVO', empresa: { id: 'e2', razonSocial: 'B' } },
      ]);

      const result = await service.findAllForUser('u1');

      expect(result.map((e) => e.id)).toEqual(['e1', 'e2']);
    });
  });
});
