import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { normalizePermissions } from '../../../common/permissions.util';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      throw new ForbiddenException('No tienes permisos asignados');
    }

    if (!this.prisma)
      return (
        user.permissions.includes('*') ||
        requiredPermissions.every((permission) =>
          user.permissions.includes(permission),
        )
      );

    const company = user.empresaId
      ? await this.prisma.empresa.findUnique({
          where: { id: user.empresaId },
          select: { propietarioId: true },
        })
      : null;
    if (!company) throw new ForbiddenException('Empresa activa inválida');
    if (company.propietarioId === user.id && user.permissions.includes('*'))
      return true;

    const membership = await this.prisma.membresia.findUnique({
      where: {
        usuarioId_empresaId: { usuarioId: user.id, empresaId: user.empresaId },
      },
      include: { role: true },
    });
    if (!membership || membership.estado !== 'ACTIVO')
      throw new ForbiddenException('Membresía inactiva');
    const permissions = normalizePermissions(membership.role?.permissions);

    const hasPermission = requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'No tienes permisos suficientes para realizar esta acción',
      );
    }

    return true;
  }
}
