import {
  Injectable,
  Optional,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePermissions } from '../../common/permissions.util';
import * as bcrypt from 'bcrypt';
import { createHash, randomInt, randomUUID } from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { TenantMailerService } from '../../common/tenant-mailer.service';

@Injectable()
export class AuthService {
  private readonly googleStates = new Map<string, number>();
  private readonly googlePending = new Map<
    string,
    { userId: string; needsCompany: boolean; expiresAt: number }
  >();

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private prisma: PrismaService,
    @Optional() private tenantMailer?: TenantMailerService,
    @Optional() private readonly notifications?: NotificationsService,
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
        membresias: { include: { role: true } },
        empresasPropiedad: true,
      },
    });

    if (!user) {
      return null;
    }

    const passwordMatches = await bcrypt.compare(pass, user.passwordHash);
    if (!passwordMatches) {
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

  async login(user: any, request?: any) {
    const activeMembership = user.membresias?.find(
      (m: any) => m.estado === 'ACTIVO',
    );
    const isOwner = user.empresasPropiedad && user.empresasPropiedad.length > 0;
    const empresaId =
      user.empresasPropiedad?.[0]?.id || activeMembership?.empresaId || null;
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
      empresaId,
      roleId,
      name: user.nombre,
      mustChangePassword: user.debeCambiarPassword,
      permissions,
      plan,
    };
    const responseUser = { ...payload, avatar: user.avatar };

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

    const subject = 'Verifica tu cuenta - Dolphin ERP';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff; color: #1e293b;">
        <div style="text-align:center;margin-bottom:24px;font-size:20px;font-weight:800;color:#2563eb;letter-spacing:0.1em;">DOLPHIN <span style="color:#0f172a;">ERP</span></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:28px;text-align:center;">
          <p style="font-size:15px;color:#334155;margin-bottom:20px;">Tu código de verificación es:</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:0.2em;color:#2563eb;margin:16px 0;">${otp}</div>
          <p style="font-size:13px;color:#64748b;">Este código expira en <strong>15 minutos</strong>.<br>Si no solicitaste este código, ignora este correo.</p>
        </div>
      </div>`;
    const text = `Tu código de verificación de Dolphin ERP es: ${otp}. Expira en 15 minutos.`;

    await this.mailerService.sendMail({ to: user.email, subject, html, text });

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
      (user.otpCode !== this.hashOtp(normalizedOtp) &&
        user.otpCode !== normalizedOtp) ||
      (user.otpExpiresAt && user.otpExpiresAt < new Date())
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

    const subject = 'Verifica tu cuenta - Dolphin ERP';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff; color: #1e293b;">
        <div style="text-align:center;margin-bottom:24px;font-size:20px;font-weight:800;color:#2563eb;letter-spacing:0.1em;">DOLPHIN <span style="color:#0f172a;">ERP</span></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:28px;text-align:center;">
          <p style="font-size:15px;color:#334155;margin-bottom:20px;">Tu nuevo código de verificación es:</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:0.2em;color:#2563eb;margin:16px 0;">${otp}</div>
          <p style="font-size:13px;color:#64748b;">Este código expira en <strong>15 minutos</strong>.<br>Si no solicitaste este código, ignora este correo.</p>
        </div>
      </div>`;
    const text = `Tu nuevo código de verificación de Dolphin ERP es: ${otp}. Expira en 15 minutos.`;

    await this.mailerService.sendMail({ to: user.email, subject, html, text });

    return { success: true };
  }

  async switchTenant(userId: string, targetEmpresaId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        membresias: { include: { role: true } },
        empresasPropiedad: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const isOwner = user.empresasPropiedad.some(
      (e) => e.id === targetEmpresaId,
    );
    const membership = user.membresias.find(
      (m) => m.empresaId === targetEmpresaId && m.estado === 'ACTIVO',
    );
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
    const plan = empresa?.suscripcion?.plan?.nombre || 'Free';

    const payload = {
      email: user.email,
      sub: user.id,
      empresaId: targetEmpresaId,
      sessionId: randomUUID(),
      name: user.nombre,
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
      user: { ...payload, avatar: user.avatar },
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

    const subject = 'Código de Verificación - Dolphin ERP';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #fff; color: #1e293b;">
        <div style="text-align:center;margin-bottom:24px;font-size:20px;font-weight:800;color:#2563eb;letter-spacing:0.1em;">DOLPHIN <span style="color:#0f172a;">ERP</span></div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:28px;text-align:center;">
          <p style="font-size:15px;color:#334155;margin-bottom:20px;">Tu código de verificación es:</p>
          <div style="font-size:40px;font-weight:900;letter-spacing:0.2em;color:#2563eb;margin:16px 0;">${otp}</div>
          <p style="font-size:13px;color:#64748b;">Este código expira en <strong>15 minutos</strong>.<br>Si no solicitaste este código, ignora este correo.</p>
        </div>
      </div>`;
    const text = `Tu código de verificación de Dolphin ERP es: ${otp}. Expira en 15 minutos.`;

    const isOwner = user.empresasPropiedad && user.empresasPropiedad.length > 0;

    if (isOwner) {
      // Propietario → SMTP del sistema
      await this.mailerService.sendMail({
        to: user.email,
        subject,
        html,
        text,
      });
    } else {
      // Colaborador → SMTP del tenant (owner de su membresia)
      const tenantEmpresa = user.membresias?.[0]?.empresa;
      if (!tenantEmpresa || !tenantEmpresa.propietarioId) {
        return { success: true };
      }
      const owner = (await this.prisma.usuario.findUnique({
        where: { id: tenantEmpresa.propietarioId },
      })) as any;
      if (!owner) return { success: true };
      await this.tenantMailer?.sendMail(owner, {
        to: user.email,
        subject,
        html,
        text,
      });
    }

    return { success: true };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findOne(email);
    if (
      !user ||
      (user.otpCode !== this.hashOtp(otp) && user.otpCode !== otp) ||
      (user.otpExpiresAt && user.otpExpiresAt < new Date())
    ) {
      throw new BadRequestException('Código OTP inválido o expirado');
    }
    return { success: true };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.usersService.findOne(email);
    if (
      !user ||
      (user.otpCode !== this.hashOtp(otp) && user.otpCode !== otp) ||
      (user.otpExpiresAt && user.otpExpiresAt < new Date())
    ) {
      throw new BadRequestException('Código OTP inválido o expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null },
    });

    return { success: true };
  }

  async updateProfile(userId: string, data: any) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.nombre = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

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
        smtpEnabled: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpFrom: true,
        smtpSecure: true,
      },
    });
    return updated;
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
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException(
        'La nueva contraseña debe tener al menos 6 caracteres',
      );
    }

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
      where: { usuarioId: userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { success: true };
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
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'La contraseña debe tener al menos 8 caracteres',
      );
    }
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
    return { success: true };
  }

  startGoogleOAuth(): string {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
    if (!clientId || !redirectUri) {
      throw new BadRequestException('Google OAuth no está configurado');
    }

    const state = randomUUID();
    this.googleStates.set(state, Date.now() + 10 * 60 * 1000);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleGoogleCallback(code: string, state: string): Promise<string> {
    const stateExpiry = this.googleStates.get(state);
    this.googleStates.delete(state);
    if (!stateExpiry || stateExpiry < Date.now()) {
      throw new UnauthorizedException('La sesión OAuth expiró');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
    const frontendUrl =
      process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
    if (!clientId || !clientSecret || !redirectUri) {
      throw new BadRequestException('Google OAuth no está configurado');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok)
      throw new UnauthorizedException('No se pudo validar la cuenta de Google');

    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token)
      throw new UnauthorizedException('Google no devolvió un token válido');
    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      },
    );
    if (!profileResponse.ok)
      throw new UnauthorizedException('No se pudo obtener el perfil de Google');

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    };
    if (!profile.sub || !profile.email || profile.email_verified === false) {
      throw new UnauthorizedException('La cuenta de Google no está verificada');
    }

    let user = await this.prisma.usuario.findUnique({
      where: { googleSub: profile.sub },
      include: {
        membresias: { include: { role: true } },
        empresasPropiedad: true,
      },
    });
    if (!user) {
      user = await this.prisma.usuario.findUnique({
        where: { email: profile.email },
        include: {
          membresias: { include: { role: true } },
          empresasPropiedad: true,
        },
      });
    }

    if (user && user.empresasPropiedad.length === 0 && !user.googleSub) {
      throw new UnauthorizedException(
        'Google OAuth está disponible únicamente para propietarios',
      );
    }

    if (!user) {
      user = await this.prisma.usuario.create({
        data: {
          email: profile.email,
          nombre: profile.name || profile.email.split('@')[0],
          googleSub: profile.sub,
          isVerified: true,
          passwordHash: await bcrypt.hash(randomUUID(), 10),
        },
        include: {
          membresias: { include: { role: true } },
          empresasPropiedad: true,
        },
      });
    } else if (!user.googleSub) {
      user = await this.prisma.usuario.update({
        where: { id: user.id },
        data: { googleSub: profile.sub, isVerified: true },
        include: {
          membresias: { include: { role: true } },
          empresasPropiedad: true,
        },
      });
    }

    const pendingCode = randomUUID();
    const needsCompany = user.empresasPropiedad.length === 0;
    this.googlePending.set(pendingCode, {
      userId: user.id,
      needsCompany,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return `${frontendUrl}/auth/google/setup?code=${encodeURIComponent(pendingCode)}&needsCompany=${needsCompany}`;
  }

  async completeGoogleSetup(
    code: string,
    acceptedPolicies: boolean,
    companyName?: string,
    rnc?: string,
    request?: any,
  ) {
    const pending = this.googlePending.get(code);
    this.googlePending.delete(code);
    if (!pending || pending.expiresAt < Date.now()) {
      throw new UnauthorizedException('El enlace de Google expiró');
    }
    if (!acceptedPolicies)
      throw new BadRequestException(
        'Debes aceptar las políticas para continuar',
      );
    if (pending.needsCompany && !companyName?.trim()) {
      throw new BadRequestException(
        'Debes configurar el nombre de tu primera empresa',
      );
    }

    if (pending.needsCompany) {
      const trialExpiry = new Date();
      trialExpiry.setDate(trialExpiry.getDate() + 15);
      await this.prisma.empresa.create({
        data: {
          razonSocial: companyName!.trim(),
          rnc: rnc?.trim() || null,
          propietarioId: pending.userId,
          membresias: {
            create: { usuarioId: pending.userId, estado: 'ACTIVO' },
          },
          suscripcion: {
            create: {
              planId: 'trial',
              estado: 'TRIAL',
              periodicidad: 'MONTHLY',
              fechaRenovacion: trialExpiry,
            },
          },
        },
      });
    }

    await this.prisma.usuario.update({
      where: { id: pending.userId },
      data: { politicasAceptadasEn: new Date() },
    });
    const user = await this.prisma.usuario.findUnique({
      where: { id: pending.userId },
      include: {
        membresias: { include: { role: true } },
        empresasPropiedad: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario de Google no encontrado');
    return this.login(user, request);
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
