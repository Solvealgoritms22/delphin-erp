import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any) {
    return this.prisma.cliente.create({
      data: {
        ...data,
        empresaId,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.cliente.findMany({
      where: { empresaId },
    });
  }

  async findOne(id: string, empresaId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, empresaId },
    });
    if (!cliente) throw new NotFoundException('Client not found');
    return cliente;
  }

  async update(id: string, empresaId: string, data: any) {
    return this.prisma.cliente
      .update({
        where: { id_empresaId: { id, empresaId } } as any,
        data,
      })
      .catch(() => {
        return this.prisma.cliente.update({
          where: { id },
          data,
        });
      });
  }

  async remove(id: string, _empresaId: string) {
    return this.prisma.cliente.delete({
      where: { id },
    });
  }
}
