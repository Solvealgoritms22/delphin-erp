import { Test, TestingModule } from '@nestjs/testing';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ClientsController', () => {
  let controller: ClientsController;
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
      controllers: [ClientsController],
      providers: [{ provide: ClientsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ClientsController>(ClientsController);
  });

  it('delega todos los CRUD usando req.user.empresaId', () => {
    controller.create(req, { nombreRazonSocial: 'Juan' });
    controller.findAll(req);
    controller.findOne(req, 'cl1');
    controller.update(req, 'cl1', { email: 'x@y.com' });
    controller.remove(req, 'cl1');

    expect(service.create).toHaveBeenCalledWith('e1', {
      nombreRazonSocial: 'Juan',
    });
    expect(service.findAll).toHaveBeenCalledWith('e1');
    expect(service.findOne).toHaveBeenCalledWith('cl1', 'e1');
    expect(service.update).toHaveBeenCalledWith('cl1', 'e1', {
      email: 'x@y.com',
    });
    expect(service.remove).toHaveBeenCalledWith('cl1', 'e1');
  });
});
