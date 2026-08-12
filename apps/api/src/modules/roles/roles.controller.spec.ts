import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

describe('RolesController', () => {
  let controller: RolesController;
  let service: {
    findAllByEmpresa: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { id: 'u1', empresaId: 'e1' };

  beforeEach(async () => {
    service = {
      findAllByEmpresa: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('findAll usa la empresa del usuario', () => {
    controller.findAll(user);
    expect(service.findAllByEmpresa).toHaveBeenCalledWith('e1');
  });

  it('create delega empresa y body', () => {
    controller.create(user, { nombre: 'Vendedor' });
    expect(service.create).toHaveBeenCalledWith('e1', { nombre: 'Vendedor' });
  });

  it('update delega empresa, id y body', () => {
    controller.update(user, 'r1', { nombre: 'X' });
    expect(service.update).toHaveBeenCalledWith('e1', 'r1', { nombre: 'X' });
  });

  it('remove delega empresa e id', () => {
    controller.remove(user, 'r1');
    expect(service.remove).toHaveBeenCalledWith('e1', 'r1');
  });
});
