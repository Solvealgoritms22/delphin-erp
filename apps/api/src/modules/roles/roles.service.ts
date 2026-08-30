import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePermissions } from '../../common/permissions.util';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async findAllByEmpresa(empresaId: string) {
    return this.prisma.role.findMany({
      where: { empresaId },
      orderBy: { nombre: 'asc' },
    });
  }

  async create(empresaId: string, data: any) {
    const roleName = data.nombre || data.name;
    const roleDesc =
      data.descripcion !== undefined ? data.descripcion : data.description;
    const rolePerms = normalizePermissions(data.permissions);

    // Verificar que el rol no exista
    const existing = await this.prisma.role.findFirst({
      where: { empresaId, nombre: roleName },
    });
    if (existing) {
      throw new ConflictException(`El rol '${roleName}' ya existe.`);
    }

    const created = await this.prisma.role.create({
      data: {
        empresaId,
        nombre: roleName,
        descripcion: roleDesc || null,
        permissions: JSON.stringify(rolePerms),
      },
    });

    await this.activityLog.log({
      empresaId,
      modulo: 'roles',
      accion: 'CREATE',
      resourceId: created.id,
      resourceName: created.nombre,
      resourceType: 'Rol de Usuario',
      metadata: { descripcion: created.descripcion },
    });

    return created;
  }

  async update(empresaId: string, id: string, data: any) {
    const role = await this.prisma.role.findFirst({ where: { id, empresaId } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const roleName = data.nombre || data.name;
    const roleDesc =
      data.descripcion !== undefined ? data.descripcion : data.description;
    const rolePerms = normalizePermissions(
      data.permissions !== undefined ? data.permissions : role.permissions,
    );

    // Si cambian el nombre, verificar unicidad
    if (roleName && roleName !== role.nombre) {
      const existing = await this.prisma.role.findFirst({
        where: { empresaId, nombre: roleName },
      });
      if (existing) {
        throw new ConflictException(`El rol '${roleName}' ya existe.`);
      }
    }

    const updated = await this.prisma.role.update({
      where: { id },
      data: {
        nombre: roleName || role.nombre,
        descripcion: roleDesc !== undefined ? roleDesc : role.descripcion,
        permissions: JSON.stringify(rolePerms),
      },
    });

    await this.activityLog.log({
      empresaId,
      modulo: 'roles',
      accion: 'UPDATE',
      resourceId: updated.id,
      resourceName: updated.nombre,
      resourceType: 'Rol de Usuario',
    });

    return updated;
  }

  async remove(empresaId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, empresaId } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }

    const deleted = await this.prisma.role.delete({
      where: { id },
    });

    await this.activityLog.log({
      empresaId,
      modulo: 'roles',
      accion: 'DELETE',
      resourceId: id,
      resourceName: role.nombre,
      resourceType: 'Rol de Usuario',
    });

    return deleted;
  }
}
