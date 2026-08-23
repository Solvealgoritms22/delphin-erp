import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogService } from './activity-log.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('ActivityLogService', () => {
  let service: ActivityLogService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityLogService, mocks.provider],
    }).compile();

    service = module.get<ActivityLogService>(ActivityLogService);
  });

  describe('log', () => {
    it('crea un registro con metadata serializada', async () => {
      prisma.activityLog.create.mockResolvedValue({});

      await service.log({
        empresaId: 'e1',
        usuarioId: 'u1',
        modulo: 'products',
        accion: 'CREATE',
        metadata: { before: null },
      });

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId: 'e1',
          modulo: 'products',
          accion: 'CREATE',
          metadata: '{"before":null}',
        }),
      });
    });

    it('crea un registro sin metadata', async () => {
      prisma.activityLog.create.mockResolvedValue({});

      await service.log({ empresaId: 'e1', modulo: 'x', accion: 'DELETE' });

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ metadata: null }),
      });
    });

    it('falla silenciosamente si la BD falla', async () => {
      prisma.activityLog.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.log({ empresaId: 'e1', modulo: 'x', accion: 'CREATE' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('findMany', () => {
    it('aplica filtros y parsea metadata', async () => {
      prisma.activityLog.count.mockResolvedValue(1);
      prisma.activityLog.findMany.mockResolvedValue([
        { id: 'a1', metadata: '{"k":1}', creadoEn: new Date() },
      ]);

      const result = await service.findMany({
        empresaId: 'e1',
        modulo: 'products',
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.items[0].metadata).toEqual({ k: 1 });
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId: 'e1', modulo: 'products' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('filtra por año usando rango de fechas', async () => {
      prisma.activityLog.count.mockResolvedValue(0);
      prisma.activityLog.findMany.mockResolvedValue([]);

      await service.findMany({ empresaId: 'e1', year: 2026 });

      const where = prisma.activityLog.findMany.mock.calls[0][0].where;
      expect(where.creadoEn.gte).toEqual(new Date('2026-01-01T00:00:00Z'));
      expect(where.creadoEn.lt).toEqual(new Date('2027-01-01T00:00:00Z'));
    });

    it('aplica filtros de accion y usuario, y deja metadata null', async () => {
      prisma.activityLog.count.mockResolvedValue(0);
      prisma.activityLog.findMany.mockResolvedValue([
        { id: 'a2', metadata: null },
      ]);

      await service.findMany({
        empresaId: 'e1',
        accion: 'CREATE',
        usuarioId: 'u1',
      });

      const where = prisma.activityLog.findMany.mock.calls[0][0].where;
      expect(where).toEqual(
        expect.objectContaining({ accion: 'CREATE', usuarioId: 'u1' }),
      );
      expect(where.modulo).toBeUndefined();
    });
  });

  describe('getYears', () => {
    it('devuelve años únicos ordenados descendente', async () => {
      prisma.activityLog.findMany.mockResolvedValue([
        { creadoEn: new Date('2026-03-01') },
        { creadoEn: new Date('2025-06-01') },
        { creadoEn: new Date('2026-01-15') },
      ]);

      const result = await service.getYears('e1');

      expect(result).toEqual([2026, 2025]);
    });
  });
});
