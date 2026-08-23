import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.unidadMedida.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.unidadMedida.findMany({
      where: { empresaId },
    });
  }

  async findOne(id: string, empresaId: string) {
    const unit = await this.prisma.unidadMedida.findFirst({
      where: { id, empresaId },
    });
    if (!unit) throw new NotFoundException('Unit not found');
    return unit;
  }

  async update(id: string, empresaId: string, data: any) {
    return this.prisma.unidadMedida
      .update({
        where: { id_empresaId: { id, empresaId } } as any,
        data,
      })
      .catch(() => {
        // fallback if unique constraint is not on id_empresaId
        return this.prisma.unidadMedida.update({
          where: { id },
          data,
        });
      });
  }

  async remove(id: string, _empresaId: string) {
    return this.prisma.unidadMedida.delete({
      where: { id },
    });
  }
}
