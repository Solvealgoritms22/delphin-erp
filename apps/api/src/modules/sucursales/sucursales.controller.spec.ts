import { Test, TestingModule } from '@nestjs/testing';
import { SucursalesController } from './sucursales.controller';
import { SucursalesService } from './sucursales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('SucursalesController', () => {
  let controller: SucursalesController;
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
      controllers: [SucursalesController],
      providers: [{ provide: SucursalesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SucursalesController>(SucursalesController);
  });

  it('create, findAll y findOne delegan con la empresa del usuario', () => {
    controller.create(user, { nombre: 'Sede' });
    controller.findAll(user);
    controller.findOne('s1', user);

    expect(service.create).toHaveBeenCalledWith('e1', { nombre: 'Sede' });
    expect(service.findAll).toHaveBeenCalledWith('e1');
    expect(service.findOne).toHaveBeenCalledWith('s1', 'e1');
  });

  it('update y remove delegan id + empresa', () => {
    controller.update('s1', user, { nombre: 'X' });
    controller.remove('s1', user);

    expect(service.update).toHaveBeenCalledWith('s1', 'e1', { nombre: 'X' });
    expect(service.remove).toHaveBeenCalledWith('s1', 'e1');
  });
});
