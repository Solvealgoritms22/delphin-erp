import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.proveedor.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.proveedor.findMany({
      where: { empresaId },
    });
  }

  async findOne(id: string, empresaId: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id, empresaId },
    });
    if (!proveedor) throw new NotFoundException('Supplier not found');
    return proveedor;
  }

  async update(id: string, empresaId: string, data: any) {
    return this.prisma.proveedor
      .update({
        where: { id_empresaId: { id, empresaId } } as any,
        data,
      })
      .catch(() => {
        return this.prisma.proveedor.update({
          where: { id },
          data,
        });
      });
  }

  async remove(id: string, _empresaId: string) {
    return this.prisma.proveedor.delete({
      where: { id },
    });
  }
}
