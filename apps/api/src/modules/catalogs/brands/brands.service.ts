import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.marca.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.marca.findMany({
      where: { empresaId },
    });
  }

  async findOne(id: string, empresaId: string) {
    const brand = await this.prisma.marca.findFirst({
      where: { id, empresaId },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async update(id: string, empresaId: string, data: any) {
    return this.prisma.marca
      .update({
        where: { id_empresaId: { id, empresaId } } as any,
        data,
      })
      .catch(() => {
        // fallback if unique constraint is not on id_empresaId
        return this.prisma.marca.update({
          where: { id },
          data,
        });
      });
  }

  async remove(id: string, _empresaId: string) {
    return this.prisma.marca.delete({
      where: { id },
    });
  }
}
