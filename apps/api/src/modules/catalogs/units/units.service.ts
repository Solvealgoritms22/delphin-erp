import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class UnitsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.unidadMedida.create({
      data: {
        ...data,
        tipo: data.tipo || 'PRODUCTO',
        empresaId,
      },
    });
  }

  async findAll(empresaId: string, tipo?: string) {
    const where: any = { empresaId };
    if (tipo) {
      where.tipo = tipo;
    }
    return this.prisma.unidadMedida.findMany({
      where,
      orderBy: { nombre: 'asc' },
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
    return this.prisma.unidadMedida.update({ where: { id, empresaId }, data });
  }

  async remove(id: string, empresaId: string) {
    return this.prisma.unidadMedida.delete({ where: { id, empresaId } });
  }
}
