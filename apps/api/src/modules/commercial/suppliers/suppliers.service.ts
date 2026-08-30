import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityLogService } from '../../activity-log/activity-log.service';

@Injectable()
export class SuppliersService {
  constructor(
    private prisma: PrismaService,
    private activityLog: ActivityLogService,
  ) {}

  async create(empresaId: string, data: any) {
    const created = await this.prisma.proveedor.create({
      data: {
        ...data,
        empresaId,
      },
    });

    await this.activityLog.log({
      empresaId,
      modulo: 'suppliers',
      accion: 'CREATE',
      resourceId: created.id,
      resourceName: created.nombreRazonSocial,
      resourceType: 'Proveedor',
      metadata: {
        documento: created.numeroDocumento,
        email: created.email,
        telefono: created.telefono,
      },
    });

    return created;
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
    const updated = await this.prisma.proveedor
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

    await this.activityLog.log({
      empresaId,
      modulo: 'suppliers',
      accion: 'UPDATE',
      resourceId: updated.id,
      resourceName: updated.nombreRazonSocial,
      resourceType: 'Proveedor',
    });

    return updated;
  }

  async remove(id: string, empresaId?: string) {
    const sup = await this.prisma.proveedor.findUnique({ where: { id } });
    const deleted = await this.prisma.proveedor.delete({
      where: { id },
    });

    await this.activityLog.log({
      empresaId: empresaId || sup?.empresaId || undefined,
      modulo: 'suppliers',
      accion: 'DELETE',
      resourceId: id,
      resourceName: sup?.nombreRazonSocial || 'Proveedor',
      resourceType: 'Proveedor',
    });

    return deleted;
  }
}
