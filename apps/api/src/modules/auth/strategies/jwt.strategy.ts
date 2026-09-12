import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { createHash } from 'crypto';
import { normalizePermissions } from '../../../common/permissions.util';
import type { Request } from 'express';

const configuredSecret = process.env.JWT_SECRET?.trim();
if (!configuredSecret && process.env.NODE_ENV !== 'test') {
  throw new Error('JWT_SECRET must be configured in production');
}

export const jwtConstants = {
  secret: configuredSecret || 'test-only-secret',
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);
    if (!token || !payload.sessionId)
      throw new UnauthorizedException('Sesión inválida');
    if (payload.sessionId) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          usuarioId: payload.sub,
          tokenHash: createHash('sha256').update(token).digest('hex'),
          revokedAt: null,
          OR: [{ expiraEn: null }, { expiraEn: { gt: new Date() } }],
        },
      });
      if (!session)
        throw new UnauthorizedException('Sesión revocada o expirada');
      if (session.ultimoAcceso.getTime() < Date.now() - 5 * 60 * 1000) {
        await this.prisma.userSession.updateMany({
          where: {
            id: payload.sessionId,
            ultimoAcceso: { lt: new Date(Date.now() - 5 * 60 * 1000) },
          },
          data: { ultimoAcceso: new Date() },
        });
      }
    }

    if (!payload.empresaId)
      throw new UnauthorizedException('Empresa requerida');
    if (
      process.env.MAINTENANCE_MODE === 'true' &&
      process.env.MAINTENANCE_TENANT_ID?.split(',')
        .map((id) => id.trim())
        .includes(payload.empresaId)
    ) {
      throw new ServiceUnavailableException(
        'La empresa se encuentra en mantenimiento',
      );
    }
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: payload.empresaId },
      select: { propietarioId: true, estado: true },
    });
    if (!empresa || empresa.estado !== 'ACTIVA')
      throw new UnauthorizedException('Empresa inactiva');
    const member = await this.prisma.membresia.findUnique({
      where: {
        usuarioId_empresaId: {
          usuarioId: payload.sub,
          empresaId: payload.empresaId,
        },
      },
      include: { role: true },
    });
    const owner = empresa.propietarioId === payload.sub;
    if (!owner && member?.estado !== 'ACTIVO')
      throw new UnauthorizedException('Membresía inactiva');
    const permissions = owner
      ? ['*']
      : normalizePermissions(member?.role?.permissions);

    // This payload matches what we signed in auth.service
    return {
      id: payload.sub,
      authTime: payload.authTime ?? payload.iat,
      email: payload.email,
      empresaId: payload.empresaId,
      roleId: payload.roleId,
      name: payload.name,
      mustChangePassword: payload.mustChangePassword,
      avatar: payload.avatar,
      permissions,
      sessionId: payload.sessionId,
      plan: payload.plan,
    };
  }
}
