import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { createHash, randomBytes } from 'crypto';
import { google } from 'googleapis';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';

type GoogleIdentity = { sub: string; email: string; name?: string; picture?: string; authoritative: boolean };

@Injectable()
export class GoogleOAuthService {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  private config() {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
    if (!clientId || !clientSecret || !redirectUri) throw new BadRequestException('Google OAuth no está configurado');
    const url = new URL(redirectUri);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.hostname === 'localhost' && url.protocol === 'http:')) {
      throw new BadRequestException('La URL de retorno de Google debe usar HTTPS');
    }
    return { clientId, clientSecret, redirectUri };
  }

  async start(challenge: string) {
    const { clientId, redirectUri } = this.config();
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const flow = await this.prisma.authFlow.create({
      data: { stateHash: this.hash(state), challenge, nonce, expiresAt: new Date(Date.now() + 10 * 60_000) },
    });
    const query = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri, response_type: 'code',
      scope: 'openid email profile', state, nonce, prompt: 'select_account',
    });
    return { flowId: flow.id, url: 'https://accounts.google.com/o/oauth2/v2/auth?' + query.toString() };
  }

  async callback(code: string, state: string, denied?: string): Promise<void> {
    if (!state) throw new UnauthorizedException('Sesión OAuth inválida');
    const stateHash = this.hash(state);
    const flow = await this.prisma.authFlow.findUnique({ where: { stateHash } });
    if (!flow || flow.expiresAt < new Date()) throw new UnauthorizedException('La sesión OAuth expiró');
    const claim = await this.prisma.authFlow.updateMany({
      where: { id: flow.id, status: 'PENDING', expiresAt: { gt: new Date() } },
      data: { status: 'PROCESSING' },
    });
    if (claim.count !== 1) throw new UnauthorizedException('La sesión OAuth ya fue utilizada');
    try {
      if (denied || !code) throw new UnauthorizedException('Autorización cancelada');
      const { clientId, clientSecret, redirectUri } = this.config();
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
      });
      if (!response.ok) throw new UnauthorizedException('Google rechazó la autorización');
      const tokens = await response.json() as { id_token?: string };
      if (!tokens.id_token) throw new UnauthorizedException('Google no devolvió una identidad');
      const client = new google.auth.OAuth2(clientId);
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
      const profile = ticket.getPayload();
      if (!profile?.sub || !profile.email || profile.email_verified !== true ||
          (profile as typeof profile & { nonce?: string }).nonce !== flow.nonce) {
        throw new UnauthorizedException('La identidad de Google no está verificada');
      }
      const identity: GoogleIdentity = {
        sub: profile.sub, email: profile.email.toLowerCase(), name: profile.name,
        picture: profile.picture, authoritative: profile.email.toLowerCase().endsWith('@gmail.com') || Boolean(profile.hd),
      };
      await this.prisma.authFlow.update({ where: { id: flow.id }, data: { status: 'READY', identity } });
    } catch {
      await this.prisma.authFlow.update({ where: { id: flow.id }, data: { status: 'FAILED' } });
      throw new UnauthorizedException('No se pudo completar la autorización de Google. Vuelve a intentarlo.');
    }
  }

  private hash(value: string) { return createHash('sha256').update(value).digest('base64url'); }

  private async resolveFlow(flowId: string, verifier: string) {
    const flow = await this.prisma.authFlow.findFirst({
      where: { id: flowId, challenge: this.hash(verifier), expiresAt: { gt: new Date() } },
    });
    if (!flow || flow.status === 'CONSUMED') throw new UnauthorizedException('La sesión de Google expiró');
    if (flow.status === 'FAILED') throw new UnauthorizedException('La autorización de Google fue cancelada o falló');
    return flow;
  }

  private async findIdentity(db: Pick<PrismaService, 'usuario'>, identity: GoogleIdentity) {
    const user = await db.usuario.findFirst({
      where: { OR: [{ googleSub: identity.sub }, { email: { equals: identity.email, mode: 'insensitive' } }] },
      include: { membresias: { include: { role: true, empresa: true } }, empresasPropiedad: true },
    });
    if (user && user.googleSub !== identity.sub && (user.googleSub || !user.isVerified || !identity.authoritative)) {
      throw new UnauthorizedException('Esta cuenta requiere iniciar sesión con contraseña antes de vincular Google');
    }
    if (user && !user.empresasPropiedad.some(e => e.estado === 'ACTIVA') &&
        !user.membresias.some(m => m.estado === 'ACTIVO' && m.empresa.estado === 'ACTIVA')) {
      throw new UnauthorizedException('La cuenta no tiene acceso a una empresa activa');
    }
    return user;
  }

  async status(flowId: string, verifier: string) {
    const flow = await this.resolveFlow(flowId, verifier);
    if (flow.status !== 'READY') return { status: 'pending' as const };
    const user = await this.findIdentity(this.prisma, flow.identity as unknown as GoogleIdentity);
    return { status: 'ready' as const, needsCompany: !user, needsPolicies: !user?.politicasAceptadasEn };
  }

  async complete(flowId: string, verifier: string, acceptedPolicies: boolean, companyName: string | undefined, rnc: string | undefined, request: unknown) {
    const flow = await this.resolveFlow(flowId, verifier);
    if (flow.status !== 'READY') throw new BadRequestException('Google aún no ha completado la autorización');
    const identity = flow.identity as unknown as GoogleIdentity;
    const user = await this.prisma.$transaction(async tx => {
      let account = await this.findIdentity(tx as Pick<PrismaService, 'usuario'>, identity);
      if (!account?.politicasAceptadasEn && acceptedPolicies !== true) throw new BadRequestException('Debes aceptar las políticas para continuar');
      if (!account && !companyName?.trim()) throw new BadRequestException('Debes indicar el nombre de tu empresa');
      const claim = await tx.authFlow.updateMany({
        where: { id: flow.id, status: 'READY', expiresAt: { gt: new Date() } }, data: { status: 'CONSUMED', identity: {} },
      });
      if (claim.count !== 1) throw new UnauthorizedException('La sesión de Google ya fue utilizada');
      if (!account) {
        const plan = await tx.plan.findUnique({ where: { id: 'trial' } });
        if (!plan) throw new BadRequestException('El plan de prueba no está configurado');
        account = await tx.usuario.create({
          data: {
            email: identity.email, googleSub: identity.sub, nombre: identity.name || identity.email.split('@')[0],
            avatar: identity.picture, isVerified: true, passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 12),
            politicasAceptadasEn: new Date(),
            empresasPropiedad: { create: {
              razonSocial: companyName!.trim(), rnc: rnc?.trim() || null,
              suscripcion: { create: { planId: 'trial', estado: 'TRIAL', periodicidad: 'MONTHLY', fechaRenovacion: new Date(Date.now() + 15 * 86400_000) } },
            } },
          },
          include: { membresias: { include: { role: true, empresa: true } }, empresasPropiedad: true },
        });
        await tx.membresia.create({ data: { usuarioId: account.id, empresaId: account.empresasPropiedad[0].id, estado: 'ACTIVO' } });
      } else {
        await tx.usuario.update({ where: { id: account.id }, data: {
          googleSub: identity.sub, politicasAceptadasEn: account.politicasAceptadasEn || new Date(),
        } });
      }
      return account;
    }, { timeout: 20_000 });
    return this.auth.login(user, request);
  }

  @Interval(3600_000)
  async cleanup() { await this.prisma.authFlow.deleteMany({ where: { expiresAt: { lt: new Date() } } }); }
}
