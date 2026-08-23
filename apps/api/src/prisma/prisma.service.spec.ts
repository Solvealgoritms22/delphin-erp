import { PrismaService } from './prisma.service';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(function (this: any) {
    this.$connect = jest.fn();
    this.$disconnect = jest.fn();
  }),
}));

describe('PrismaService', () => {
  it('se conecta en onModuleInit', async () => {
    const service = new PrismaService();

    await service.onModuleInit();

    expect(service.$connect).toHaveBeenCalled();
  });
});
