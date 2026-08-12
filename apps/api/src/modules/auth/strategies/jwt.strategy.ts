import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';

const configuredSecret = process.env.JWT_SECRET?.trim();
if (!configuredSecret && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be configured in production');
}

export const jwtConstants = {
  secret: configuredSecret || randomBytes(32).toString('hex'),
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => request?.query?.access_token,
      ]),
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
        },
      });
      if (!session) throw new UnauthorizedException('Sesión revocada o expirada');
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
