import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';

@Injectable()
export class ClientsService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(empresaId: string, data: any) {
    const created = await this.prisma.cliente.create({
      data: {
        ...data,
        empresaId,
      },
    });

    await this.activityLog.log({
      empresaId,
      modulo: 'clients',
      accion: 'CREATE',
      resourceId: created.id,
      resourceName: created.nombreRazonSocial,
      resourceType: 'Cliente',
      metadata: {
        documento: created.numeroDocumento,
        email: created.email,
        telefono: created.telefono,
      },
    });

    return created;
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
    const updated = await this.prisma.cliente
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

    await this.activityLog.log({
      empresaId,
      modulo: 'clients',
      accion: 'UPDATE',
      resourceId: updated.id,
      resourceName: updated.nombreRazonSocial,
      resourceType: 'Cliente',
    });

    return updated;
  }

  async remove(id: string, empresaId?: string) {
    const client = await this.prisma.cliente.findUnique({ where: { id } });
    const deleted = await this.prisma.cliente.delete({
      where: { id },
    });

    await this.activityLog.log({
      empresaId: empresaId || client?.empresaId || undefined,
      modulo: 'clients',
      accion: 'DELETE',
      resourceId: id,
      resourceName: client?.nombreRazonSocial || 'Cliente',
      resourceType: 'Cliente',
    });

    return deleted;
  }
}
