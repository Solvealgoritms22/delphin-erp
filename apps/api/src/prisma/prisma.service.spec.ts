import { PrismaService } from './prisma.service';
describe('PrismaService', () => {
  it('connects on module initialization', async () => {
    const service = new PrismaService();
    const connect = jest.spyOn(service, '$connect').mockResolvedValue();
    await service.onModuleInit();
    expect(connect).toHaveBeenCalledTimes(1);
  });
});
