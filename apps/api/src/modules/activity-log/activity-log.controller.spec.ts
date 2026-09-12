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

  it('findMany pasa filtros y paginación de la empresa autenticada', () => {
    controller.findMany(
      { user: { empresaId: 'e1' } },
      'products',
      'CREATE',
      'u1',
      '2026',
      '2',
      '10',
    );

    expect(service.findMany).toHaveBeenCalledWith({
      empresaId: 'e1',
      modulo: 'products',
      accion: 'CREATE',
      usuarioId: 'u1',
      year: 2026,
      page: 2,
      limit: 10,
    });
  });

  it('findMany usa defaults sin query params', () => {
    controller.findMany({ user: { empresaId: 'e1' } });

    expect(service.findMany).toHaveBeenCalledWith({
      empresaId: 'e1',
      modulo: undefined,
      accion: undefined,
      usuarioId: undefined,
      year: undefined,
      page: 1,
      limit: 30,
    });
  });

  it('getYears consulta el historial de la empresa autenticada', () => {
    controller.getYears({ user: { empresaId: 'e1' } });
    expect(service.getYears).toHaveBeenCalledWith('e1');
  });
});
