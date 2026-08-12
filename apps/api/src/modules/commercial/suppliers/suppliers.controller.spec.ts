import { Test, TestingModule } from '@nestjs/testing';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('SuppliersController', () => {
  let controller: SuppliersController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const req = { user: { id: 'u1', empresaId: 'e1' } };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuppliersController],
      providers: [{ provide: SuppliersService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuppliersController>(SuppliersController);
  });

  it('delega todos los CRUD usando req.user.empresaId', () => {
    controller.create(req, { nombreRazonSocial: 'Distribuidora' });
    controller.findAll(req);
    controller.findOne(req, 'sp1');
    controller.update(req, 'sp1', { email: 'x@y.com' });
    controller.remove(req, 'sp1');

    expect(service.create).toHaveBeenCalledWith('e1', {
      nombreRazonSocial: 'Distribuidora',
    });
    expect(service.findAll).toHaveBeenCalledWith('e1');
    expect(service.findOne).toHaveBeenCalledWith('sp1', 'e1');
    expect(service.update).toHaveBeenCalledWith('sp1', 'e1', {
      email: 'x@y.com',
    });
    expect(service.remove).toHaveBeenCalledWith('sp1', 'e1');
  });
});
