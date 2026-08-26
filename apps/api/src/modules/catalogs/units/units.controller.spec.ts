import { Test, TestingModule } from '@nestjs/testing';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('UnitsController', () => {
  let controller: UnitsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { id: 'u1', empresaId: 'e1' };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UnitsController],
      providers: [{ provide: UnitsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UnitsController>(UnitsController);
  });

  it('delega todos los CRUD con la empresa del usuario', () => {
    controller.create(user, { nombre: 'Kilogramo' });
    controller.findAll(user);
    controller.findOne('u1', user);
    controller.update('u1', user, { nombre: 'X' });
    controller.remove('u1', user);

    expect(service.create).toHaveBeenCalledWith('e1', { nombre: 'Kilogramo' });
    expect(service.findAll).toHaveBeenCalledWith('e1', undefined);
    expect(service.findOne).toHaveBeenCalledWith('u1', 'e1');
    expect(service.update).toHaveBeenCalledWith('u1', 'e1', { nombre: 'X' });
    expect(service.remove).toHaveBeenCalledWith('u1', 'e1');
  });
});
