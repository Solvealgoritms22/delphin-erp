import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('CategoriesController', () => {
  let controller: CategoriesController;
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
      controllers: [CategoriesController],
      providers: [{ provide: CategoriesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  it('delega todos los CRUD con la empresa del usuario', () => {
    controller.create(user, { nombre: 'C' });
    controller.findAll(user);
    controller.findOne(user, 'c1');
    controller.update(user, 'c1', { nombre: 'X' });
    controller.remove(user, 'c1');

    expect(service.create).toHaveBeenCalledWith('e1', { nombre: 'C' });
    expect(service.findAll).toHaveBeenCalledWith('e1');
    expect(service.findOne).toHaveBeenCalledWith('e1', 'c1');
    expect(service.update).toHaveBeenCalledWith('e1', 'c1', { nombre: 'X' });
    expect(service.remove).toHaveBeenCalledWith('e1', 'c1');
  });
});
