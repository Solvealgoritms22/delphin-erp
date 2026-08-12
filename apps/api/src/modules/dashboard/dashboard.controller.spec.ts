import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: { getSummary: jest.Mock };

  beforeEach(async () => {
    service = { getSummary: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it('getSummary usa la empresa del usuario', () => {
    controller.getSummary({ empresaId: 'e1' });
    expect(service.getSummary).toHaveBeenCalledWith('e1');
  });
});
