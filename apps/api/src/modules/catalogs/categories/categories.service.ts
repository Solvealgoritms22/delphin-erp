import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.categoria.create({
      data: {
        ...data,
        tipo: data.tipo || 'AMBOS',
        empresaId,
      },
    });
  }

  async findAll(empresaId: string, tipo?: string) {
    const where: any = { empresaId };
    if (tipo) {
      if (tipo === 'PRODUCTO') {
        where.tipo = { in: ['PRODUCTO', 'AMBOS'] };
      } else if (tipo === 'SERVICIO') {
        where.tipo = { in: ['SERVICIO', 'AMBOS'] };
      } else {
        where.tipo = tipo;
      }
    }
    return this.prisma.categoria.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { id, empresaId },
    });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');
    return categoria;
  }

  async update(empresaId: string, id: string, data: any) {
    await this.findOne(empresaId, id); // check existence
    return this.prisma.categoria.update({
      where: { id },
      data,
    });
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    return this.prisma.categoria.delete({
      where: { id },
    });
  }
}
