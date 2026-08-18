import { Test, TestingModule } from '@nestjs/testing';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createPrismaMock } from '../../test/mocks/prisma.mock';

describe('EmpresasController', () => {
  let controller: EmpresasController;
  let prisma: any;
  let empresasService: {
    create: jest.Mock;
    getPlans: jest.Mock;
    findCurrent: jest.Mock;
    findAllForUser: jest.Mock;
    updateCurrent: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const user = { id: 'u1', empresaId: 'e1' };

  beforeEach(async () => {
    const mocks = createPrismaMock();
    prisma = mocks.prisma;
    empresasService = {
      create: jest.fn(),
      getPlans: jest.fn(),
      findCurrent: jest.fn(),
      findAllForUser: jest.fn(),
      updateCurrent: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresasController],
      providers: [
        { provide: EmpresasService, useValue: empresasService },
        mocks.provider,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmpresasController>(EmpresasController);
  });

  it('create usa user.id', () => {
    controller.create(user, { razonSocial: 'X' });
    expect(empresasService.create).toHaveBeenCalledWith('u1', {
      razonSocial: 'X',
    });
  });

  it('getPlans delega al service', () => {
    controller.getPlans();
    expect(empresasService.getPlans).toHaveBeenCalled();
  });

  it('getSubscription devuelve null sin empresa activa', async () => {
    expect(await controller.getSubscription({})).toBeNull();
  });

  it('getSubscription consulta prisma con la empresa activa', async () => {
    prisma.suscripcion.findUnique.mockResolvedValue({ plan: {} });
    await controller.getSubscription(user);
    expect(prisma.suscripcion.findUnique).toHaveBeenCalledWith({
      where: { empresaId: 'e1' },
      include: { plan: true },
    });
  });

  it('getCurrent y getMyEmpresas delegan', () => {
    controller.getCurrent(user);
    controller.getMyEmpresas(user);
    expect(empresasService.findCurrent).toHaveBeenCalledWith('e1');
    expect(empresasService.findAllForUser).toHaveBeenCalledWith('u1');
  });

  it('updateCurrent usa la empresa activa', () => {
    controller.updateCurrent(user, { telefono: '555' });
    expect(empresasService.updateCurrent).toHaveBeenCalledWith('u1', 'e1', {
      telefono: '555',
    });
  });

  it('update y remove usan user.id + param', () => {
    controller.update(user, 'e2', { razonSocial: 'Y' });
    controller.remove(user, 'e2');
    expect(empresasService.update).toHaveBeenCalledWith('u1', 'e2', {
      razonSocial: 'Y',
    });
    expect(empresasService.remove).toHaveBeenCalledWith('u1', 'e2');
  });
});
