import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogController } from './activity-log.controller';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ActivityLogController', () => {
  let controller: ActivityLogController;
  let service: { findMany: jest.Mock; getYears: jest.Mock };

  beforeEach(async () => {
    service = { findMany: jest.fn(), getYears: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogController],
      providers: [{ provide: ActivityLogService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ActivityLogController>(ActivityLogController);
  });

  it('findMany pasa filtros y paginación globales', () => {
    controller.findMany('products', 'CREATE', 'u1', '2026', '2', '10');

    expect(service.findMany).toHaveBeenCalledWith({
      modulo: 'products',
      accion: 'CREATE',
      usuarioId: 'u1',
      year: 2026,
      page: 2,
      limit: 10,
    });
  });

  it('findMany usa defaults sin query params', () => {
    controller.findMany();

    expect(service.findMany).toHaveBeenCalledWith({
      modulo: undefined,
      accion: undefined,
      usuarioId: undefined,
      year: undefined,
      page: 1,
      limit: 30,
    });
  });

  it('getYears consulta el historial global', () => {
    controller.getYears();
    expect(service.getYears).toHaveBeenCalledWith();
  });
});
