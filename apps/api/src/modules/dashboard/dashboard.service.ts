import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(empresaId: string) {
    const [totalUsers, totalClients, totalProducts, totalSuppliers] =
      await Promise.all([
        this.prisma.membresia.count({ where: { empresaId } }),
        this.prisma.cliente.count({ where: { empresaId } }),
        this.prisma.producto.count({ where: { empresaId } }),
        this.prisma.proveedor.count({ where: { empresaId } }),
      ]);

    return {
      totalUsers,
      totalClients,
      totalProducts,
      totalSuppliers,
    };
  }
}
