import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { createHash, randomBytes } from 'crypto';
import { google } from 'googleapis';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

type GoogleIdentity = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  authoritative: boolean;
};

@Injectable()
export class GoogleOAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private config() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
    if (!clientId || !clientSecret || !redirectUri)
      throw new BadRequestException('Google OAuth no está configurado');
    const url = new URL(redirectUri);
    if (
      url.protocol !== 'https:' &&
      !(
        process.env.NODE_ENV !== 'production' &&
        url.hostname === 'localhost' &&
        url.protocol === 'http:'
      )
    ) {
      throw new BadRequestException(
        'La URL de retorno de Google debe usar HTTPS',
      );
    }
    return { clientId, clientSecret, redirectUri };
  }

  async start(challenge: string, clientOrigin?: string) {
    const { clientId, redirectUri } = this.config();
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const fallbackOrigin = process.env.FRONTEND_URL || 'http://localhost:4200';
    const origin = clientOrigin || fallbackOrigin;
    const flow = await this.prisma.authFlow.create({
      data: {
        stateHash: this.hash(state),
        challenge,
        nonce,
        expiresAt: new Date(Date.now() + 10 * 60_000),
        identity: { origin },
      },
    });
    const query = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      prompt: 'select_account',
    });
    return {
      flowId: flow.id,
      url: 'https://accounts.google.com/o/oauth2/v2/auth?' + query.toString(),
    };
  }

  async callback(
    code: string,
    state: string,
    denied?: string,
  ): Promise<{ origin: string; rejected?: string }> {
    if (!state) throw new UnauthorizedException('Sesión OAuth inválida');
    const stateHash = this.hash(state);
    const flow = await this.prisma.authFlow.findUnique({
      where: { stateHash },
    });
    if (!flow || flow.expiresAt < new Date())
      throw new UnauthorizedException('La sesión OAuth expiró');
    const targetOrigin =
      ((flow.identity as any)?.origin as string) ||
      process.env.FRONTEND_URL ||
      'http://localhost:4200';
    const claim = await this.prisma.authFlow.updateMany({
      where: { id: flow.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      data: { status: 'PROCESSING' },
    });
    if (claim.count !== 1)
      throw new UnauthorizedException('La sesión OAuth ya fue utilizada');
    try {
      if (denied || !code)
        throw new UnauthorizedException('Autorización cancelada');
      const { clientId, clientSecret, redirectUri } = this.config();
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      if (!response.ok)
        throw new UnauthorizedException('Google rechazó la autorización');
      const tokens = (await response.json()) as { id_token?: string };
      if (!tokens.id_token)
        throw new UnauthorizedException('Google no devolvió una identidad');
      const client = new google.auth.OAuth2(clientId);
      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token,
        audience: clientId,
      });
      const profile = ticket.getPayload();
      if (
        !profile?.sub ||
        !profile.email ||
        profile.email_verified !== true ||
        (profile as typeof profile & { nonce?: string }).nonce !== flow.nonce
      ) {
        throw new UnauthorizedException(
          'La identidad de Google no está verificada',
        );
      }
      const identity: GoogleIdentity = {
        sub: profile.sub,
        email: profile.email.toLowerCase(),
        name: profile.name,
        picture: profile.picture,
        authoritative:
          profile.email.toLowerCase().endsWith('@gmail.com') ||
          Boolean(profile.hd),
      };

      // ─── Verificación de elegibilidad temprana ──────────────────────────────
      const rejection = await this.checkOwnerEligibility(identity);
      if (rejection) {
        await this.prisma.authFlow.update({
          where: { id: flow.id },
          data: {
            status: 'FAILED',
            identity: { ...identity, _err: rejection, origin: targetOrigin },
          },
        });
        return { origin: targetOrigin, rejected: rejection };
      }

      await this.prisma.authFlow.update({
        where: { id: flow.id },
        data: {
          status: 'READY',
          identity: { ...identity, origin: targetOrigin },
        },
      });
      return { origin: targetOrigin };
    } catch (err) {
      await this.prisma.authFlow.update({
        where: { id: flow.id },
        data: { status: 'FAILED' },
      });
      throw err instanceof UnauthorizedException
        ? err
        : new UnauthorizedException(
            'No se pudo completar la autorización de Google. Vuelve a intentarlo.',
          );
    }
  }

  /**
   * Verifica si la identidad de Google puede continuar el flujo de propietario.
   * Retorna null si es elegible, o el mensaje de rechazo si no lo es.
   *
   * IMPORTANTE: Un colaborador (sin empresasPropiedad) SÍ es elegible —
   * el flujo le pedirá crear su propia empresa (needsCompany: true).
   * La restricción es solo para casos que representan un riesgo de seguridad.
   */
  private async checkOwnerEligibility(
    identity: GoogleIdentity,
  ): Promise<string | null> {
    const existing = await this.prisma.usuario.findFirst({
      where: {
        OR: [
          { googleSub: identity.sub },
          { email: { equals: identity.email, mode: 'insensitive' } },
        ],
      },
      select: {
        googleSub: true,
        isVerified: true,
        empresasPropiedad: { select: { id: true, estado: true } },
      },
    });

    // Caso 1: usuario nuevo → elegible, se creará como propietario
    if (!existing) return null;

    // Caso 2: el correo ya está vinculado a OTRO Google account → bloquear
    if (existing.googleSub && existing.googleSub !== identity.sub) {
      return 'Esta dirección de correo ya está vinculada a otra cuenta de Google.';
    }

    // Caso 3: cuenta no verificada que intenta vincular Google sin ser fuente autoritativa
    if (!existing.isVerified && !identity.authoritative) {
      return 'Esta cuenta requiere iniciar sesión con contraseña antes de vincular Google.';
    }

    // Caso 4: tiene empresas propias pero ninguna está activa → rechazar
    // (no se le permite crear otra empresa en el mismo trial)
    if (
      existing.empresasPropiedad.length > 0 &&
      !existing.empresasPropiedad.some((e) => e.estado === 'ACTIVA')
    ) {
      return 'Tu empresa no está activa. Contacta al soporte de Dolphin ERP.';
    }

    // Casos válidos:
    // - Tiene empresa propia activa → login directo (needsCompany: false)
    // - Es solo colaborador (sin empresasPropiedad) → creará su empresa (needsCompany: true)
    return null;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('base64url');
  }

  private async resolveFlow(flowId: string, verifier: string) {
    const flow = await this.prisma.authFlow.findFirst({
      where: {
        id: flowId,
        challenge: this.hash(verifier),
        expiresAt: { gt: new Date() },
      },
    });
    if (!flow || flow.status === 'CONSUMED')
      throw new UnauthorizedException('La sesión de Google expiró');
    if (flow.status === 'FAILED') {
      // Si el fallo fue por elegibilidad, incluir el mensaje específico guardado en identity._err
      const storedErr = (flow.identity as Record<string, unknown> | null)
        ?._err as string | undefined;
      throw new UnauthorizedException(
        storedErr || 'La autorización de Google fue cancelada o falló',
      );
    }
    return flow;
  }

  private async findIdentity(
    db: Pick<PrismaService, 'usuario'>,
    identity: GoogleIdentity,
  ) {
    // La verificación de elegibilidad (propietario vs colaborador) ya ocurrió en callback().
    // Aquí solo se busca al usuario para obtener el objeto completo con relaciones.
    const user = await db.usuario.findFirst({
      where: {
        OR: [
          { googleSub: identity.sub },
          { email: { equals: identity.email, mode: 'insensitive' } },
        ],
      },
      include: {
        membresias: { include: { role: true, empresa: true } },
        empresasPropiedad: true,
      },
    });
    return user; // null = usuario nuevo, complete() lo creará como propietario
  }

  async status(flowId: string, verifier: string) {
    const flow = await this.resolveFlow(flowId, verifier);
    if (flow.status !== 'READY') return { status: 'pending' as const };
    const user = await this.findIdentity(
      this.prisma,
      flow.identity as unknown as GoogleIdentity,
    );
    const hasOwnedCompany = Boolean(
      user?.empresasPropiedad &&
      user.empresasPropiedad.some((e) => e.estado === 'ACTIVA'),
    );
    return {
      status: 'ready' as const,
      needsCompany: !hasOwnedCompany,
      needsPolicies: !user?.politicasAceptadasEn,
    };
  }

  async complete(
    flowId: string,
    verifier: string,
    acceptedPolicies: boolean,
    companyName: string | undefined,
    rnc: string | undefined,
    request: unknown,
  ) {
    const flow = await this.resolveFlow(flowId, verifier);
    if (flow.status !== 'READY')
      throw new BadRequestException(
        'Google aún no ha completado la autorización',
      );
    const identity = flow.identity as unknown as GoogleIdentity;
    const user = await this.prisma.$transaction(
      async (tx) => {
        let account = await this.findIdentity(tx, identity);
        if (!account?.politicasAceptadasEn && acceptedPolicies !== true)
          throw new BadRequestException(
            'Debes aceptar las políticas para continuar',
          );

        const hasOwnedCompany = Boolean(
          account?.empresasPropiedad &&
          account.empresasPropiedad.some((e) => e.estado === 'ACTIVA'),
        );
        if (!hasOwnedCompany && !companyName?.trim())
          throw new BadRequestException(
            'Debes indicar el nombre de tu empresa',
          );

        const claim = await tx.authFlow.updateMany({
          where: {
            id: flow.id,
            status: 'READY',
            expiresAt: { gt: new Date() },
          },
          data: { status: 'CONSUMED', identity: {} },
        });
        if (claim.count !== 1)
          throw new UnauthorizedException(
            'La sesión de Google ya fue utilizada',
          );

        if (!account) {
          await this.ensureTrialPlan(tx);
          const created = await tx.usuario.create({
            data: {
              email: identity.email,
              googleSub: identity.sub,
              nombre: identity.name || identity.email.split('@')[0],
              avatar: identity.picture || null,
              isVerified: true,
              passwordHash: await bcrypt.hash(
                randomBytes(32).toString('hex'),
                12,
              ),
              politicasAceptadasEn: new Date(),
              empresasPropiedad: {
                create: {
                  razonSocial: companyName!.trim(),
                  rnc: rnc?.trim() || null,
                  suscripcion: {
                    create: {
                      planId: 'trial',
                      estado: 'TRIAL',
                      periodicidad: 'MONTHLY',
                      fechaRenovacion: new Date(Date.now() + 15 * 86400_000),
                    },
                  },
                },
              },
            },
            include: { empresasPropiedad: true },
          });
          await tx.membresia.create({
            data: {
              usuarioId: created.id,
              empresaId: created.empresasPropiedad[0].id,
              estado: 'ACTIVO',
            },
          });
          // Re-fetch para incluir la membresía recién creada con su role antes de llamar a auth.login()
          account = await tx.usuario.findUniqueOrThrow({
            where: { id: created.id },
            include: {
              membresias: { include: { role: true, empresa: true } },
              empresasPropiedad: true,
            },
          });
        } else {
          const updateData: any = {
            googleSub: identity.sub,
            isVerified: true,
            politicasAceptadasEn: account.politicasAceptadasEn || new Date(),
          };
          if (identity.picture) {
            updateData.avatar = identity.picture;
          }
          if (
            identity.name &&
            (!account.nombre || account.nombre === account.email.split('@')[0])
          ) {
            updateData.nombre = identity.name;
          }

          if (!hasOwnedCompany && companyName?.trim()) {
            await this.ensureTrialPlan(tx);
            const createdEmpresa = await tx.empresa.create({
              data: {
                razonSocial: companyName.trim(),
                rnc: rnc?.trim() || null,
                propietarioId: account.id,
                suscripcion: {
                  create: {
                    planId: 'trial',
                    estado: 'TRIAL',
                    periodicidad: 'MONTHLY',
                    fechaRenovacion: new Date(Date.now() + 15 * 86400_000),
                  },
                },
              },
            });
            await tx.membresia.create({
              data: {
                usuarioId: account.id,
                empresaId: createdEmpresa.id,
                estado: 'ACTIVO',
              },
            });
          }

          await tx.usuario.update({
            where: { id: account.id },
            data: updateData,
          });

          account = await tx.usuario.findUniqueOrThrow({
            where: { id: account.id },
            include: {
              membresias: { include: { role: true, empresa: true } },
              empresasPropiedad: true,
            },
          });
        }
        return account;
      },
      { timeout: 20_000 },
    );
    return this.auth.login(user, request);
  }

  private async ensureTrialPlan(tx: any) {
    let plan = await tx.plan.findUnique({ where: { id: 'trial' } });
    if (!plan) {
      plan = await tx.plan.create({
        data: {
          id: 'trial',
          nombre: 'Trial Gratuito',
          descripcion: 'Prueba gratuita de 15 días con acceso completo.',
          precioMensual: 0,
          precioAnual: 0,
          maxUsuarios: 9999,
          maxSucursales: 9999,
          maxProductos: 999999,
        },
      });
    }
    return plan;
  }

  @Interval(3600_000)
  async cleanup() {
    await this.prisma.authFlow.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}
