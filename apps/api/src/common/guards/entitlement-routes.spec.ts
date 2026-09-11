import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ProductsController } from '../../modules/catalogs/products/products.controller';
import { SucursalesController } from '../../modules/sucursales/sucursales.controller';
import { UsersController } from '../../modules/users/users.controller';
import { ENTITLEMENT_KEY } from '../decorators/require-entitlement.decorator';
import { EntitlementGuard } from './entitlement.guard';
describe('creation route quotas', () => {
  it.each([
    [ProductsController, 'maxProductos'],
    [SucursalesController, 'maxSucursales'],
    [UsersController, 'maxUsuarios'],
  ] as const)('protects %s with its own quota', (controller, quota) => {
    const handler = controller.prototype.create;
    expect(Reflect.getMetadata(ENTITLEMENT_KEY, handler)).toBe(quota);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(EntitlementGuard);
  });
});
