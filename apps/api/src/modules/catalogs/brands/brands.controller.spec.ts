import { Test, TestingModule } from '@nestjs/testing';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('BrandsController', () => {
  let controller: BrandsController;
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
      controllers: [BrandsController],
      providers: [{ provide: BrandsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BrandsController>(BrandsController);
  });

  it('delega todos los CRUD con la empresa del usuario', () => {
    controller.create(user, { nombre: 'Marca' });
    controller.findAll(user);
    controller.findOne('b1', user);
    controller.update('b1', user, { nombre: 'X' });
    controller.remove('b1', user);

    expect(service.create).toHaveBeenCalledWith('e1', { nombre: 'Marca' });
    expect(service.findAll).toHaveBeenCalledWith('e1');
    expect(service.findOne).toHaveBeenCalledWith('b1', 'e1');
    expect(service.update).toHaveBeenCalledWith('b1', 'e1', { nombre: 'X' });
    expect(service.remove).toHaveBeenCalledWith('b1', 'e1');
  });
});
