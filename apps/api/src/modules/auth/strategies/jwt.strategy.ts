import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

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
    });
  }

  async validate(payload: any) {
    if (payload.sessionId) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          usuarioId: payload.sub,
          revokedAt: null,
          OR: [{ expiraEn: null }, { expiraEn: { gt: new Date() } }],
        },
      });
      if (!session)
        throw new UnauthorizedException('Sesión revocada o expirada');
      await this.prisma.userSession.update({
        where: { id: payload.sessionId },
        data: { ultimoAcceso: new Date() },
      });
    }

    // This payload matches what we signed in auth.service
    return {
      id: payload.sub,
      email: payload.email,
      empresaId: payload.empresaId,
      roleId: payload.roleId,
      name: payload.name,
      mustChangePassword: payload.mustChangePassword,
      avatar: payload.avatar,
      permissions: payload.permissions,
      sessionId: payload.sessionId,
      plan: payload.plan,
    };
  }
}
