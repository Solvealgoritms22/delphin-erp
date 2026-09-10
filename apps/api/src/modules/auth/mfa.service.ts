import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { TOTP, Secret } from 'otpauth';
import * as QRCode from 'qrcode';
import { encryptSecret, decryptSecret } from '../../common/security/secrets';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const recoveryCodes = () => Array.from({ length: 10 }, () => randomBytes(16).toString('hex'));
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

@Injectable()
export class MfaService {
  constructor(private readonly prisma: PrismaService) {}

  private totp(secret: string, label = 'Dolphin ERP') {
    return new TOTP({ issuer: 'Dolphin ERP', label, algorithm: 'SHA1', digits: 6, period: 30,
      secret: Secret.fromBase32(secret) });
  }

  private async audit(tx: any, userId: string, event: string, context?: any) {
    await tx.activityLog.create({ data: {
      usuarioId: userId, empresaId: context?.empresaId || null, modulo: 'SECURITY',
      accion: event, resourceId: userId, resourceType: 'Usuario',
      ipAddress: context?.ip, metadata: JSON.stringify({ event }),
    } });
  }

  async status(userId: string) {
    const row = await this.prisma.mfaCredential.findUnique({ where: { usuarioId: userId } });
    return { enabled: !!row?.enabledAt, recoveryCodesRemaining: row?.enabledAt ? row.recoveryHashes.length : 0 };
  }

  async challenge(user: any) {
    const row = await this.prisma.mfaCredential.findUnique({ where: { usuarioId: user.id } });
    if (!row?.enabledAt) {
      if (user.mfaHabilitado) throw new UnauthorizedException('La cuenta requiere recuperación del segundo factor');
      return null;
    }
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60_000);
    await this.prisma.authFlow.create({ data: {
      stateHash: hash(token), challenge: '', nonce: user.id, status: 'MFA_LOGIN', expiresAt,
    } });
    return { mfaRequired: true as const, challengeToken: token, expiresAt };
  }

  async setup(user: any) {
    if (!user.authTime || Date.now() / 1000 - user.authTime > 300)
      throw new UnauthorizedException('Vuelve a iniciar sesión antes de configurar 2FA');
    const secret = new Secret({ size: 20 }).base32;
    const encrypted = encryptSecret(secret);
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${user.id} FOR UPDATE`;
      const row = await tx.mfaCredential.findUnique({ where: { usuarioId: user.id } });
      if (row?.enabledAt) throw new BadRequestException('2FA ya está habilitado');
      await tx.mfaCredential.upsert({
        where: { usuarioId: user.id },
        create: { usuarioId: user.id, secret: encrypted, setupExpiresAt: new Date(Date.now() + 600_000) },
        update: { secret: encrypted, setupExpiresAt: new Date(Date.now() + 600_000), lastCounter: -1 },
      });
    });
    const uri = this.totp(secret, user.email).toString();
    return { secret, qrDataUrl: await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M' }) };
  }

  // Row locking makes the attempt budget, TOTP replay protection and recovery code
  // consumption atomic across API instances. Invalid attempts must commit.
  private async check(tx: any, row: any, code: string): Promise<boolean> {
    const now = Date.now();
    if (row.lockedUntil && row.lockedUntil.getTime() > now) return false;
    const normalized = code.trim().replace(/[ -]/g, '').toLowerCase();
    const recovered = row.enabledAt && /^[a-f0-9]{32}$/.test(normalized)
      ? row.recoveryHashes.find((saved: string) => equal(saved, hash(normalized))) : undefined;
    const delta = /^\d{6}$/.test(normalized)
      ? this.totp(decryptSecret(row.secret)).validate({ token: normalized, window: 1, timestamp: now }) : null;
    const counter = Math.floor(now / 30_000) + (delta ?? 0);
    if (!recovered && (delta === null || counter <= row.lastCounter)) {
      const attempts = row.lockedUntil && row.lockedUntil.getTime() <= now ? 1 : row.failedAttempts + 1;
      await tx.mfaCredential.update({ where: { usuarioId: row.usuarioId },
        data: { failedAttempts: attempts, lockedUntil: attempts >= 5 ? new Date(now + 900_000) : null } });
      return false;
    }
    await tx.mfaCredential.update({ where: { usuarioId: row.usuarioId }, data: {
      failedAttempts: 0, lockedUntil: null,
      ...(recovered ? { recoveryHashes: row.recoveryHashes.filter((x: string) => x !== recovered) } : { lastCounter: counter }),
    } });
    return true;
  }

  async complete(token: string, code: string, request?: any) {
    const userId = await this.prisma.$transaction(async tx => {
      const flow = await tx.authFlow.findUnique({ where: { stateHash: hash(token) } });
      if (!flow || flow.status !== 'MFA_LOGIN' || flow.expiresAt.getTime() <= Date.now()) return null;
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${flow.nonce} FOR UPDATE`;
      const row = await tx.mfaCredential.findUnique({ where: { usuarioId: flow.nonce } });
      if (!row?.enabledAt || !await this.check(tx, row, code)) {
        await this.audit(tx, flow.nonce, 'MFA_LOGIN_FAILED', request);
        return null;
      }
      const claimed = await tx.authFlow.updateMany({ where: { id: flow.id, status: 'MFA_LOGIN', expiresAt: { gt: new Date() } },
        data: { status: 'CONSUMED' } });
      if (claimed.count !== 1) return null;
      await this.audit(tx, flow.nonce, 'MFA_LOGIN_VERIFIED', request);
      return flow.nonce;
    });
    if (!userId) throw new UnauthorizedException('Código inválido, reutilizado o desafío expirado');
    return userId;
  }

  async manage(user: any, code: string, action: 'enable' | 'disable' | 'recovery') {
    const codes = action === 'disable' ? [] : recoveryCodes();
    const success = await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${user.id} FOR UPDATE`;
      const row = await tx.mfaCredential.findUnique({ where: { usuarioId: user.id } });
      if (!row || (action === 'enable' ? !!row.enabledAt || !row.setupExpiresAt || row.setupExpiresAt.getTime() <= Date.now() : !row.enabledAt))
        return false;
      if (!await this.check(tx, row, code)) {
        await this.audit(tx, user.id, 'MFA_MANAGEMENT_FAILED', user);
        return false;
      }
      if (action === 'disable') await tx.mfaCredential.delete({ where: { usuarioId: user.id } });
      else await tx.mfaCredential.update({ where: { usuarioId: user.id },
        data: { enabledAt: row.enabledAt || new Date(), setupExpiresAt: null, recoveryHashes: codes.map(hash) } });
      await tx.usuario.update({ where: { id: user.id }, data: { mfaHabilitado: action !== 'disable' } });
      await tx.authFlow.updateMany({ where: { nonce: user.id, status: 'MFA_LOGIN' }, data: { status: 'CONSUMED' } });
      await tx.userSession.updateMany({ where: { usuarioId: user.id, id: { not: user.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() } });
      await this.audit(tx, user.id, 'MFA_' + action.toUpperCase(), user);
      return true;
    });
    if (!success) throw new BadRequestException('Código inválido, reutilizado o configuración expirada');
    return { success: true, recoveryCodes: codes };
  }
}
