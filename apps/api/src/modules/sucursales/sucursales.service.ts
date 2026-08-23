import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SucursalesService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.sucursal.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.sucursal.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    return sucursal;
  }

  async update(id: string, empresaId: string, data: any) {
    return this.prisma.sucursal.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, _empresaId: string) {
    return this.prisma.sucursal.delete({
      where: { id },
    });
  }
}
