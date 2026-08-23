import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    const createData: any = {
      nombre: data.nombre,
      estado: data.estado || 'ACTIVO',
      empresaId,
    };
    if (data.descripcion !== undefined) {
      createData.descripcion = data.descripcion;
    }
    return this.prisma.marca.create({
      data: createData,
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.marca.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
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
    const updateData: any = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.estado !== undefined) updateData.estado = data.estado;

    return this.prisma.marca.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, _empresaId: string) {
    return this.prisma.marca.delete({
      where: { id },
    });
  }
}
