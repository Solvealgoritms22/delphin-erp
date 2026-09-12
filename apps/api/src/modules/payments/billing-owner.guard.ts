import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingOwnerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user?.empresaId)
      throw new ForbiddenException('Empresa activa requerida');
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: user.empresaId },
      select: { propietarioId: true },
    });
    if (empresa?.propietarioId !== user.id)
      throw new ForbiddenException(
        'Solo el propietario puede administrar la facturación',
      );
    if (
      !['GET', 'HEAD'].includes(req.method) &&
      (!user.authTime || Date.now() / 1000 - user.authTime > 900)
    ) {
      throw new ForbiddenException(
        'Vuelve a iniciar sesión antes de modificar la facturación',
      );
    }
    return true;
  }
}
