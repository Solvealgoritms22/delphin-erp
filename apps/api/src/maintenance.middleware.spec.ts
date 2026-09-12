import { MaintenanceMiddleware } from './maintenance.middleware';
describe('MaintenanceMiddleware', () => {
  const savedMode = process.env.MAINTENANCE_MODE,
    savedTenant = process.env.MAINTENANCE_TENANT_ID;
  afterEach(() => {
    if (savedMode === undefined) delete process.env.MAINTENANCE_MODE;
    else process.env.MAINTENANCE_MODE = savedMode;
    if (savedTenant === undefined) delete process.env.MAINTENANCE_TENANT_ID;
    else process.env.MAINTENANCE_TENANT_ID = savedTenant;
  });
  it('blocks global maintenance while keeping probes available', () => {
    process.env.MAINTENANCE_MODE = 'true';
    delete process.env.MAINTENANCE_TENANT_ID;
    const middleware = new MaintenanceMiddleware(),
      next = jest.fn();
    expect(() =>
      middleware.use({ path: '/v1/products' } as any, {} as any, next),
    ).toThrow('mantenimiento');
    middleware.use({ path: '/healthz' } as any, {} as any, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
  it('does not trust an unverified token to resolve tenant maintenance', () => {
    process.env.MAINTENANCE_MODE = 'true';
    process.env.MAINTENANCE_TENANT_ID = 'e1';
    const next = jest.fn();
    new MaintenanceMiddleware().use(
      {
        path: '/v1/products',
        headers: { authorization: 'Bearer forged' },
      } as any,
      {} as any,
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
