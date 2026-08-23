import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EntitlementGuard } from '../../common/guards/entitlement.guard';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: {
    findAllByEmpresa: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { id: 'u1', empresaId: 'e1' };

  beforeEach(async () => {
    usersService = {
      findAllByEmpresa: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(EntitlementGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('findAll usa la empresa del usuario', () => {
    controller.findAll(user);
    expect(usersService.findAllByEmpresa).toHaveBeenCalledWith('e1');
  });

  it('create delega empresa y body', () => {
    const data = { email: 'x@y.com' };
    controller.create(user, data);
    expect(usersService.create).toHaveBeenCalledWith('e1', data);
  });

  it('update delega empresa, id y body', () => {
    controller.update(user, 'u2', { roleId: 'r1' });
    expect(usersService.update).toHaveBeenCalledWith('e1', 'u2', {
      roleId: 'r1',
    });
  });

  it('remove delega empresa e id', () => {
    controller.remove(user, 'u2');
    expect(usersService.remove).toHaveBeenCalledWith('e1', 'u2');
  });
});
