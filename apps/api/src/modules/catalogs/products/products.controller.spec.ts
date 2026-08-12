import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let activityLog: { log: jest.Mock };

  const user = { id: 'u1', empresaId: 'e1', email: 'a@b.com' };

  beforeEach(async () => {
    productsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    activityLog = { log: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: ActivityLogService, useValue: activityLog },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('create crea el producto y registra actividad CREATE', async () => {
    productsService.create.mockResolvedValue({ id: 'p1', nombre: 'Arroz' });

    await controller.create(user, { nombre: 'Arroz' });

    expect(productsService.create).toHaveBeenCalledWith('e1', {
      nombre: 'Arroz',
    });
    expect(activityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({
        modulo: 'products',
        accion: 'CREATE',
        resourceId: 'p1',
      }),
    );
  });

  it('findAll y findOne delegan', () => {
    controller.findAll(user);
    controller.findOne(user, 'p1');
    expect(productsService.findAll).toHaveBeenCalledWith('e1');
    expect(productsService.findOne).toHaveBeenCalledWith('e1', 'p1');
  });

  it('update actualiza y registra actividad UPDATE', async () => {
    productsService.update.mockResolvedValue({ id: 'p1', nombre: 'X' });

    await controller.update(user, 'p1', { nombre: 'X' });

    expect(productsService.update).toHaveBeenCalledWith('e1', 'p1', {
      nombre: 'X',
    });
    expect(activityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'UPDATE' }),
    );
  });

  it('remove consulta, elimina y registra actividad DELETE', async () => {
    productsService.findOne.mockResolvedValue({ id: 'p1', nombre: 'Arroz' });
    productsService.remove.mockResolvedValue({});

    await controller.remove(user, 'p1');

    expect(productsService.remove).toHaveBeenCalledWith('e1', 'p1');
    expect(activityLog.log).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'DELETE', resourceName: 'Arroz' }),
    );
  });
});
