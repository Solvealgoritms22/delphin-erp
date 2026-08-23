import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: any;

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, mocks.provider],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('devuelve métricas agregadas por empresa', async () => {
    prisma.membresia.count.mockResolvedValue(3);
    prisma.cliente.count.mockResolvedValue(10);
    prisma.producto.count.mockResolvedValue(25);
    prisma.proveedor.count.mockResolvedValue(5);

    const result = await service.getSummary('e1');

    expect(result).toEqual({
      totalUsers: 3,
      totalClients: 10,
      totalProducts: 25,
      totalSuppliers: 5,
    });
    expect(prisma.producto.count).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
    });
  });
});
