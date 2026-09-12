import {
  Injectable,
  Optional,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { MfaService } from './mfa.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePermissions } from '../../common/permissions.util';
import * as bcrypt from 'bcrypt';
import { assertPassword } from '../../common/security/password-policy';
import { createHash, randomInt, randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantMailerService } from '../../common/tenant-mailer.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { renderEmail } from '../email-templates/email-renderer';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private prisma: PrismaService,
    private readonly mfa: MfaService,
    @Optional() private tenantMailer?: TenantMailerService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly emailTemplates?: EmailTemplatesService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
    accessMode?: 'owner' | 'member',
  ): Promise<any> {
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await this.prisma.usuario.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      include: {
        membresias: { include: { role: true, empresa: true } },
        empresasPropiedad: true,
      },
    });

    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(pass, user.passwordHash);
    if (!passwordMatches) {
      if (this.notifications) {
        await this.prisma.activityLog.create({
          data: {
            usuarioId: user.id,
            modulo: 'SECURITY',
            accion: 'LOGIN_FAILED',
          },
        });
        const failures = await this.prisma.activityLog.count({
          where: {
            usuarioId: user.id,
            modulo: 'SECURITY',
            accion: 'LOGIN_FAILED',
            creadoEn: { gte: new Date(Date.now() - 15 * 60000) },
          },
        });
        if (failures >= 5)
          await this.accountNotice(
            user.id,
            'SECURITY_LOGIN_FAILED',
            'Detectamos varios intentos fallidos de acceso. Revisa la seguridad de tu cuenta.',
            new Date().toISOString().slice(0, 13),
          );
      }
      return null;
    }

    // Prioritize checking if the account is verified before any role or tenant checks
    if (user.isVerified === false) {
      throw new UnauthorizedException({
        message:
          'Cuenta no verificada. Por favor, verifica tu correo electrónico.',
        needsVerification: true,
        email: user.email,
      });
    }

    // Check if user is company owner or has an ACTIVE membership
    const isOwner = user.empresasPropiedad && user.empresasPropiedad.length > 0;
    const activeMembership = user.membresias?.find(
      (m) => m.estado === 'ACTIVO',
    );

    if (!isOwner && !activeMembership) {
      return null;
    }

    if (accessMode === 'owner' && !isOwner) {
      return null;
    }

    if (accessMode === 'member' && isOwner) {
      return null;
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async loginAfterMfa(id: string, request?: any) {
    const user = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        membresias: { include: { role: true, empresa: true } },
        empresasPropiedad: true,
      },
    });
    if (!user?.isVerified)
      throw new UnauthorizedException('Cuenta no disponible');
    return this.login(user, request, true);
  }

  async login(user: any, request?: any, mfaVerified = false) {
    if (!mfaVerified) {
      const challenge = await this.mfa.challenge(user);
      if (challenge) return challenge;
    }
    user = {
      ...user,
      empresasPropiedad: user.empresasPropiedad?.filter(
        (e: any) => e.estado === 'ACTIVA',
      ),
      membresias: user.membresias?.filter(
        (m: any) => m.estado === 'ACTIVO' && m.empresa?.estado === 'ACTIVA',
      ),
    };
    if (!user.empresasPropiedad?.length && !user.membresias?.length)
      throw new UnauthorizedException('No hay empresas activas');
    const activeMembership = user.membresias?.find(
      (m: any) => m.estado === 'ACTIVO',
    );
    const empresaId =
      user.empresasPropiedad?.[0]?.id || activeMembership?.empresaId || null;
    const isOwner = Boolean(
      user.empresasPropiedad?.some((e: any) => e.id === empresaId),
    );
    const roleId = activeMembership?.roleId || null;

    let permissions: string[] = [];
    if (isOwner) {
      permissions = ['*'];
    } else if (activeMembership?.role?.permissions) {
      permissions = normalizePermissions(activeMembership.role.permissions);
    }

    // Fetch the active plan for this target Empresa (if any)
    let plan = 'Free';
    if (empresaId) {
      const empresa = await this.prisma.empresa.findUnique({
        where: { id: empresaId },
        include: { suscripcion: { include: { plan: true } } },
      });
      if (empresa?.suscripcion?.plan) {
        plan = empresa.suscripcion.plan.nombre;
      }
    }

    const userAgent = request?.headers?.['user-agent'] as string | undefined;
    const browserName = this.detectBrowser(userAgent);
    const osName = this.detectOperatingSystem(userAgent);
    const ipAddress = request?.ip as string | undefined;
    const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);

    const deviceKey = [browserName, osName, ipAddress]
      .filter(Boolean)
      .join('|');
    let matchingSessions: any[] = [];
    if (deviceKey) {
      const activeSessions =
        (await this.prisma.userSession.findMany({
          where: {
            usuarioId: user.id,
            revokedAt: null,
            OR: [{ expiraEn: null }, { expiraEn: { gt: new Date() } }],
          },
          select: {
            id: true,
            browserName: true,
            osName: true,
            ipAddress: true,
            ultimoAcceso: true,
          },
        })) || [];
      matchingSessions = activeSessions
        .filter(
          (s) =>
            [s.browserName, s.osName, s.ipAddress].filter(Boolean).join('|') ===
            deviceKey,
        )
        .sort(
          (a, b) =>
            (b.ultimoAcceso?.getTime() || 0) - (a.ultimoAcceso?.getTime() || 0),
        );
    }
    const reusedSession = matchingSessions[0] || null;
    const sessionId = reusedSession?.id ?? randomUUID();

    const payload = {
      email: user.email,
      sub: user.id,
      sessionId,
      jti: randomUUID(),
      authTime: Math.floor(Date.now() / 1000),
      mfaVerified,
      empresaId,
      roleId,
      name: user.nombre,
      avatar: user.avatar,
      mustChangePassword: user.debeCambiarPassword,
      permissions,
      plan,
    };
    const responseUser = {
      ...payload,
      avatar: user.avatar,
      oficio: user.oficio,
      telefono: user.telefono,
      documentoIdentidad: user.documentoIdentidad,
    };

    // Update last login time
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimoAcceso: new Date() },
    });

    const accessToken = this.jwtService.sign(payload);
    const tokenHash = createHash('sha256').update(accessToken).digest('hex');

    if (reusedSession) {
      await this.prisma.userSession.update({
        where: { id: reusedSession.id },
        data: { tokenHash, ultimoAcceso: new Date(), expiraEn: expiresAt },
      });
      if (matchingSessions.length > 1) {
        await this.prisma.userSession.updateMany({
          where: { id: { in: matchingSessions.slice(1).map((s) => s.id) } },
          data: { revokedAt: new Date() },
        });
      }
    } else {
      await this.prisma.userSession.create({
        data: {
          id: sessionId,
          usuarioId: user.id,
          tokenHash,
          userAgent,
          browserName,
          osName,
          ipAddress,
          expiraEn: expiresAt,
        },
      });
    }

    if (empresaId) {
      await this.prisma.activityLog.create({
        data: {
          empresaId,
          usuarioId: user.id,
          usuarioEmail: user.email,
          usuarioNombre: user.nombre,
          modulo: 'SECURITY',
          accion: 'LOGIN_SUCCESS',
          ipAddress,
          userAgent,
          metadata: JSON.stringify({
            eventType: 'Inicio de sesión',
            actionTaken: 'Acceso autorizado',
            severity: 'Low',
          }),
        },
      });
      await this.notifications?.create({
        usuarioId: user.id,
        empresaId,
        tipo: 'SECURITY_LOGIN',
        titulo: 'Nuevo inicio de sesión',
        mensaje: 'Tu cuenta inició sesión correctamente.',
        icono: 'shield-check',
        canales: ['IN_APP'],
      });
    }

    return {
      access_token: accessToken,
      user: responseUser,
    };
  }

  private detectBrowser(userAgent?: string): string {
    const ua = userAgent || '';
    if (!ua) return 'Navegador desconocido';
    const hay = ua.toLowerCase();

    if (hay.includes('edg/')) return 'Edge';
    if (hay.includes('edge/')) return 'Edge';
    if (hay.includes('opr/') || hay.includes('opera')) return 'Opera';
    if (hay.includes('brave')) return 'Brave';
    if (hay.includes('electron')) return 'Electron';
    if (hay.includes('firefox/')) return 'Firefox';
    if (hay.includes('chrome/')) return 'Chrome';
    if (hay.includes('safari/')) return 'Safari';

    if (hay.includes('powershell')) return 'PowerShell';
    if (hay.includes('postman')) return 'Postman';
    if (hay.includes('curl')) return 'curl';
    if (hay.includes('wget')) return 'wget';
    if (
      hay.includes('axios') ||
      hay.includes('node-fetch') ||
      hay.includes('node.js')
    )
      return 'Node.js';
    if (hay.includes('python')) return 'Python';

    return 'Navegador desconocido';
  }

  private detectOperatingSystem(userAgent?: string): string {
    const ua = userAgent || '';
    if (!ua) return 'Sistema desconocido';
    const hay = ua.toLowerCase();
    if (hay.includes('windows')) return 'Windows';
    if (hay.includes('mac os') || hay.includes('macintosh')) return 'macOS';
    if (hay.includes('android')) return 'Android';
    if (hay.includes('iphone') || hay.includes('ipad')) return 'iOS';
    if (hay.includes('cros')) return 'ChromeOS';
    if (hay.includes('linux')) return 'Linux';
    return 'Sistema desconocido';
  }

  async register(data: any) {
    assertPassword(data.password);
    if (
      data.confirmPassword !== undefined &&
      data.password !== data.confirmPassword
    ) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const email = data.email?.trim().toLowerCase();
    const existingUser = await this.prisma.usuario.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive',
        },
      },
    });

    if (existingUser) {
      throw new BadRequestException('El correo electrónico ya está registrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.usuario.create({
      data: {
        email: email,
        passwordHash,
        nombre: data.name || data.nombre || null,
        politicasAceptadasEn: new Date(),
      },
    });

    // The main account owns the company and registers its membership
    await this.prisma.empresa.create({
      data: {
        razonSocial: data.company || data.empresa || 'Nueva Empresa',
        rnc: data.documentNumber || data.rnc || null,
        pais: data.country || 'DO',
        telefono: data.phone || null,
        email: data.companyEmail || data.email || null,
        propietarioId: user.id,
        membresias: {
          create: {
            usuarioId: user.id,
            estado: 'ACTIVO',
          },
        },
      },
    });

    // Send verification email
    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { otpCode: this.hashOtp(otp), otpExpiresAt: expiresAt },
    });

    const emailContent = renderEmail(
      'verification',
      { name: user.nombre || user.email },
      undefined,
      { code: otp },
    );
    await this.mailerService.sendMail({ to: user.email, ...emailContent });

    return {
      success: true,
      needsVerification: true,
      email: user.email,
    };
  }

  async verifyAccount(email: string, otp: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedOtp = otp?.trim();
    const user = await this.prisma.usuario.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });
    if (
      !user ||
      user.otpCode !== this.hashOtp(normalizedOtp) ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código OTP inválido o expirado');
    }

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return { success: true };
  }

  async resendVerification(email: string) {
    const normalizedEmail = email?.trim().toLowerCase();
    const user = await this.prisma.usuario.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
    });
    if (!user) {
      return { success: true }; // Prevent user enumeration
    }

    if (user.isVerified) {
      throw new BadRequestException('La cuenta ya está verificada');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { otpCode: this.hashOtp(otp), otpExpiresAt: expiresAt },
    });

    const emailContent = renderEmail(
      'verification',
      { name: user.nombre || user.email },
      undefined,
      { code: otp },
    );
    await this.mailerService.sendMail({ to: user.email, ...emailContent });

    return { success: true };
  }

  async switchTenant(
    userId: string,
    targetEmpresaId: string,
    authTime?: number,
  ) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        membresias: { include: { role: true, empresa: true } },
        empresasPropiedad: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const hasOwnedCompanies = user.empresasPropiedad.length > 0;
    const isOwner = user.empresasPropiedad.some(
      (e) => e.id === targetEmpresaId,
    );
    const membership = user.membresias.find(
      (m) => m.empresaId === targetEmpresaId && m.estado === 'ACTIVO',
    );
    if (hasOwnedCompanies && !isOwner) {
      throw new UnauthorizedException(
        'No tienes acceso a empresas de otro tenant',
      );
    }
    if (!isOwner && !membership)
      throw new BadRequestException('User does not belong to this tenant');

    let permissions: string[] = [];
    if (isOwner) {
      permissions = ['*'];
    } else if (membership?.role?.permissions) {
      permissions = normalizePermissions(membership.role.permissions);
    }

    // Fetch the active plan for this target Empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: targetEmpresaId },
      include: { suscripcion: { include: { plan: true } } },
    });
    if (!empresa || empresa.estado !== 'ACTIVA')
      throw new UnauthorizedException('Empresa inactiva');
    const plan = empresa?.suscripcion?.plan?.nombre || 'Free';

    const payload = {
      email: user.email,
      sub: user.id,
      empresaId: targetEmpresaId,
      authTime: authTime || Math.floor(Date.now() / 1000),
      sessionId: randomUUID(),
      name: user.nombre,
      avatar: user.avatar,
      mustChangePassword: user.debeCambiarPassword,
      permissions,
      plan,
    };
    const accessToken = this.jwtService.sign(payload);
    await this.prisma.userSession.create({
      data: {
        id: payload.sessionId,
        usuarioId: user.id,
        tokenHash: createHash('sha256').update(accessToken).digest('hex'),
        expiraEn: new Date(Date.now() + 12 * 60 * 60 * 1000),
      },
    });
    return {
      access_token: accessToken,
      user: {
        ...payload,
        avatar: user.avatar,
        oficio: (user as any).oficio ?? null,
        telefono: (user as any).telefono ?? null,
        documentoIdentidad: (user as any).documentoIdentidad ?? null,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = (await this.prisma.usuario.findFirst({
      where: { email },
      include: {
        empresasPropiedad: { select: { id: true } },
        membresias: {
          where: { estado: 'ACTIVO' },
          include: { empresa: true },
          take: 1,
        },
      },
    })) as any;

    if (!user) {
      // No revelar si el usuario existe
      return { success: true };
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { otpCode: this.hashOtp(otp), otpExpiresAt: expiresAt },
    });

    const isOwner = user.empresasPropiedad && user.empresasPropiedad.length > 0;
    const tenantEmpresa = user.membresias?.[0]?.empresa;
    const emailContent =
      !isOwner && tenantEmpresa && this.emailTemplates
        ? await this.emailTemplates.render(
            tenantEmpresa.id,
            'collaborator_code',
            {
              name: user.nombre || user.email,
              company: tenantEmpresa.razonSocial,
            },
            { code: otp },
          )
        : renderEmail(
            'recovery',
            { name: user.nombre || user.email },
            undefined,
            { code: otp },
          );

    if (isOwner) {
      // Propietario → SMTP del sistema
      await this.mailerService.sendMail({
        to: user.email,
        ...emailContent,
      });
    } else {
      // Colaborador → SMTP del tenant (owner de su membresia)
      if (!tenantEmpresa || !tenantEmpresa.propietarioId) {
        return { success: true };
      }
      const owner = (await this.prisma.usuario.findUnique({
        where: { id: tenantEmpresa.propietarioId },
      })) as any;
      if (!owner) return { success: true };
      await this.tenantMailer?.sendMail(owner, {
        to: user.email,
        ...emailContent,
      });
    }

    return { success: true };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findOne(email);
    if (
      !user ||
      user.otpCode !== this.hashOtp(otp) ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código OTP inválido o expirado');
    }
    return { success: true };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    assertPassword(newPassword);
    const user = await this.usersService.findOne(email);
    if (
      !user ||
      user.otpCode !== this.hashOtp(otp) ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      throw new BadRequestException('Código OTP inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.usuario.updateMany({
        where: {
          id: user.id,
          otpCode: user.otpCode,
          otpExpiresAt: { gt: new Date() },
        },
        data: { passwordHash, otpCode: null, otpExpiresAt: null },
      });
      if (consumed.count !== 1)
        throw new BadRequestException('Código OTP ya utilizado');
      await tx.userSession.updateMany({
        where: { usuarioId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    await this.accountNotice(
      user.id,
      'SECURITY_PASSWORD_CHANGED',
      'La contraseña de tu cuenta fue restablecida. Si no reconoces este cambio, contacta al administrador.',
    );

    return { success: true };
  }

  private async accountNotice(
    usuarioId: string,
    tipo: string,
    mensaje: string,
    deduplicationKey?: string,
  ) {
    if (!this.notifications) return;
    const companies = await this.prisma.empresa.findMany({
      where: {
        estado: 'ACTIVA',
        OR: [
          { propietarioId: usuarioId },
          { membresias: { some: { usuarioId, estado: 'ACTIVO' } } },
        ],
      },
      select: { id: true },
    });
    for (const company of companies)
      await this.notifications.create({
        empresaId: company.id,
        usuarioId,
        tipo,
        titulo:
          tipo === 'SECURITY_LOGIN_FAILED'
            ? 'Intentos fallidos de acceso'
            : 'Contraseña modificada',
        mensaje,
        deduplicationKey,
      });
  }

  async updateProfile(userId: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.nombre = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.oficio !== undefined) updateData.oficio = data.oficio || null;
    if (data.telefono !== undefined)
      updateData.telefono = data.telefono || null;
    if (data.documentoIdentidad !== undefined)
      updateData.documentoIdentidad = data.documentoIdentidad || null;

    // SMTP settings
    if (data.smtpEnabled !== undefined)
      updateData.smtpEnabled = data.smtpEnabled;
    if (data.smtpHost !== undefined)
      updateData.smtpHost = data.smtpHost || null;
    if (data.smtpPort !== undefined)
      updateData.smtpPort = data.smtpPort ? Number(data.smtpPort) : null;
    if (data.smtpUser !== undefined)
      updateData.smtpUser = data.smtpUser || null;
    if (data.smtpPass !== undefined)
      updateData.smtpPass = data.smtpPass || null;
    if (data.smtpFrom !== undefined)
      updateData.smtpFrom = data.smtpFrom || null;
    if (data.smtpSecure !== undefined)
      updateData.smtpSecure = Boolean(data.smtpSecure);

    const updated = await this.prisma.usuario.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        avatar: true,
        oficio: true,
        telefono: true,
        documentoIdentidad: true,
        smtpEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpFrom: true,
        smtpSecure: true,
      } as any,
    });
    return updated;
  }

  async getProfile(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        avatar: true,
        oficio: true,
        telefono: true,
        documentoIdentidad: true,
        smtpEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpFrom: true,
        smtpSecure: true,
      } as any,
    });
  }

  async testSmtpConnection(userId: string) {
    if (!this.tenantMailer)
      throw new BadRequestException('Servicio SMTP no disponible');
    const user = (await this.prisma.usuario.findUnique({
      where: { id: userId },
    })) as any;
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.smtpHost)
      throw new BadRequestException(
        'Configura el host SMTP antes de probar la conexión.',
      );
    return this.tenantMailer.testTcpConnection(
      user.smtpHost,
      user.smtpPort ?? 587,
    );
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId?: string,
  ) {
    assertPassword(newPassword);

    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('La contraseña actual no es válida');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { passwordHash, debeCambiarPassword: false },
    });
    await this.prisma.userSession.updateMany({
      where: {
        usuarioId: userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    await this.accountNotice(
      userId,
      'SECURITY_PASSWORD_CHANGED',
      'La contraseña de tu cuenta fue modificada. Si no reconoces este cambio, contacta al administrador.',
    );
    return { success: true };
  }

  async verifyDestructiveActionAuth(
    userId: string,
    credentials: { email?: string; password?: string; mfaCode?: string },
  ): Promise<void> {
    const mfaStatus = await this.mfa.status(userId);
    if (mfaStatus.enabled) {
      if (!credentials.mfaCode || !credentials.mfaCode.trim()) {
        throw new BadRequestException(
          'Se requiere el código de verificación 2FA para autorizar esta acción',
        );
      }
      const valid = await this.mfa.verifyUserCode(
        userId,
        credentials.mfaCode.trim(),
      );
      if (!valid) {
        throw new UnauthorizedException(
          'El código 2FA ingresado es inválido o ha expirado',
        );
      }
    } else {
      if (!credentials.email || !credentials.password) {
        throw new BadRequestException(
          'Debes proporcionar tu correo electrónico y contraseña para confirmar esta acción',
        );
      }
      const user = await this.prisma.usuario.findUnique({
        where: { id: userId },
      });
      if (
        !user ||
        user.email.toLowerCase() !== credentials.email.trim().toLowerCase()
      ) {
        throw new UnauthorizedException(
          'El correo electrónico no coincide con tu cuenta',
        );
      }
      const passwordMatches = await bcrypt.compare(
        credentials.password,
        user.passwordHash,
      );
      if (!passwordMatches) {
        throw new UnauthorizedException(
          'La contraseña ingresada es incorrecta',
        );
      }
    }
  }

  async wipeTenantData(
    userId: string,
    credentials: { email?: string; password?: string; mfaCode?: string },
  ) {
    await this.verifyDestructiveActionAuth(userId, credentials);

    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { empresasPropiedad: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (!user.empresasPropiedad?.length) {
      throw new BadRequestException(
        'Solo las cuentas propietarias pueden restablecer los datos de sus empresas',
      );
    }

    const empresaIds = user.empresasPropiedad.map((e) => e.id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Invoices & Payments (sales & purchases)
      await tx.pagoCliente.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.pagoProveedor.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.facturaVenta.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.facturaCompra.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.cotizacion.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });

      // 2. Inventory & Products
      await tx.movimientoInventario.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.inventarioStock.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.promocionProducto.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.promocion.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.productoInsumo.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.producto.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });

      // 3. Catalogs
      await tx.categoria.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.marca.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await tx.unidadMedida.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });

      // 4. Commercial Entities
      await tx.cliente.deleteMany({ where: { empresaId: { in: empresaIds } } });
      await tx.proveedor.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });

      // 5. Fiscal & Notifications
      await tx.secuenciaNCF.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.impuesto.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.terminoPago.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.notification.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });
      await tx.aiConversation.deleteMany({
        where: { empresaId: { in: empresaIds } },
      });

      // Audit Log
      await tx.activityLog.create({
        data: {
          empresaId: empresaIds[0],
          usuarioId: userId,
          usuarioNombre: user.nombre || user.email,
          usuarioEmail: user.email,
          modulo: 'SECURITY',
          accion: 'DATA_WIPED',
          resourceId: userId,
          resourceType: 'TenantData',
          resourceName: 'Datos comerciales restablecidos',
          metadata: JSON.stringify({
            severity: 'High',
            actionTaken:
              'Se restablecieron todos los catálogos y transacciones de las empresas del tenant',
            empresaIds,
          }),
        },
      });

      return {
        success: true,
        message: 'Todos los datos comerciales fueron eliminados exitosamente',
      };
    });
  }

  async deleteUserAccount(
    userId: string,
    credentials: { email?: string; password?: string; mfaCode?: string },
  ) {
    await this.verifyDestructiveActionAuth(userId, credentials);

    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: { empresasPropiedad: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const empresaIds = (user.empresasPropiedad || []).map((e) => e.id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete owned companies (cascades operational data)
      if (empresaIds.length > 0) {
        await tx.pagoCliente.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.pagoProveedor.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.facturaVenta.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.facturaCompra.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.cotizacion.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.movimientoInventario.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.inventarioStock.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.promocionProducto.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.promocion.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.productoInsumo.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.producto.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.categoria.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.marca.deleteMany({ where: { empresaId: { in: empresaIds } } });
        await tx.unidadMedida.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.cliente.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.proveedor.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.secuenciaNCF.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.impuesto.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.terminoPago.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.notification.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.aiConversation.deleteMany({
          where: { empresaId: { in: empresaIds } },
        });
        await tx.empresa.deleteMany({ where: { id: { in: empresaIds } } });
      }

      // 2. Delete user-specific records
      await tx.membresia.deleteMany({ where: { usuarioId: userId } });
      await tx.mfaCredential.deleteMany({ where: { usuarioId: userId } });
      await tx.userSession.deleteMany({ where: { usuarioId: userId } });
      await tx.notificationPreference.deleteMany({
        where: { usuarioId: userId },
      });
      await tx.pushSubscription.deleteMany({ where: { usuarioId: userId } });
      await tx.googleDriveConnection.deleteMany({
        where: { propietarioId: userId },
      });

      // 3. Delete user
      await tx.usuario.delete({ where: { id: userId } });

      return {
        success: true,
        message: 'Cuenta y datos eliminados definitivamente',
      };
    });
  }

  private generateOtp() {
    return randomInt(100000, 1000000).toString();
  }

  private hashOtp(otp: string) {
    return createHash('sha256')
      .update(otp || '')
      .digest('hex');
  }

  async acceptInvitation(
    token: string,
    newPassword: string,
    confirmPassword: string,
    acceptedPolicies: boolean,
  ) {
    if (!acceptedPolicies)
      throw new BadRequestException(
        'Debes aceptar las políticas para activar la cuenta',
      );
    assertPassword(newPassword);
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Las contraseñas no coinciden');
    }

    const tokenHash = createHash('sha256')
      .update(token || '')
      .digest('hex');
    const user = await this.prisma.usuario.findUnique({
      where: { invitacionTokenHash: tokenHash },
      include: { membresias: true },
    });
    if (
      !user ||
      !user.invitacionExpiraEn ||
      user.invitacionExpiraEn < new Date()
    ) {
      throw new BadRequestException('La invitación no existe o expiró');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: user.id },
        data: {
          passwordHash,
          isVerified: true,
          debeCambiarPassword: false,
          politicasAceptadasEn: new Date(),
          invitacionTokenHash: null,
          invitacionExpiraEn: null,
        },
      }),
      this.prisma.membresia.updateMany({
        where: { usuarioId: user.id, estado: 'PENDIENTE' },
        data: { estado: 'ACTIVO' },
      }),
    ]);
    if (this.notifications)
      for (const membership of user.membresias) {
        if (['PENDIENTE', 'ACTIVO'].includes(membership.estado))
          await this.notifications.create({
            empresaId: membership.empresaId,
            tipo: 'USER_JOINED',
            titulo: 'Nuevo colaborador',
            mensaje:
              'Un colaborador activó su invitación y ya puede acceder a la empresa.',
            deduplicationKey: user.id,
          });
      }
    return { success: true };
  }

  async logout(user: any, request?: any) {
    if (user?.sessionId) {
      await this.prisma.userSession.updateMany({
        where: {
          id: user.sessionId,
          usuarioId: user.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    const userAgent = request?.headers?.['user-agent'] as string | undefined;
    const ipAddress = request?.ip as string | undefined;
    if (user?.empresaId && user?.id) {
      await this.prisma.activityLog.create({
        data: {
          empresaId: user.empresaId,
          usuarioId: user.id,
          usuarioEmail: user.email,
          usuarioNombre: user.name,
          modulo: 'SECURITY',
          accion: 'LOGOUT',
          ipAddress,
          userAgent,
          metadata: JSON.stringify({
            eventType: 'Cierre de sesión',
            actionTaken: 'Sesión cerrada por el usuario',
            severity: 'Low',
          }),
        },
      });
    }

    return { success: true };
  }
}
