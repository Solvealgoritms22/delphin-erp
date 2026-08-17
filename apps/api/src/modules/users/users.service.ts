import { ForbiddenException, Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { createHash, randomBytes } from 'crypto';
import { TenantMailerService } from '../../common/tenant-mailer.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly tenantMailer: TenantMailerService,
    @Optional() private readonly mailer?: MailerService,
  ) {}

  async findOne(email: string) {
    return this.prisma.usuario.findFirst({
      where: { email },
    });
  }

  async findAllByEmpresa(empresaId: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    const membresias = await this.prisma.membresia.findMany({
      where: { empresaId },
      include: {
        usuario: { include: { membresias: { select: { empresaId: true, estado: true } } } },
        role: true,
      },
    });

    return membresias.map((m) => {
      let lastOnlineDate = 'N/A';
      let lastOnlineTime = '';
      if (m.usuario.ultimoAcceso) {
        const date = new Date(m.usuario.ultimoAcceso);
        lastOnlineDate = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }); // e.g. "Aug 7, 2026"
        lastOnlineTime = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }); // e.g. "4:30 PM"
      }

      return {
        id: m.usuario.id,
        email: m.usuario.email,
        name: m.usuario.nombre,
        avatar: m.usuario.avatar,
        estado: m.estado,
        mfaHabilitado: m.usuario.mfaHabilitado,
        roleId: m.roleId,
        empresaIds: (m.usuario.membresias || [])
          .filter((membership) => membership.empresaId && membership.estado === 'ACTIVO')
          .map((membership) => membership.empresaId),
        isOwner: empresa?.propietarioId === m.usuario.id,
        lastOnlineDate,
        lastOnlineTime,
      };
    });
  }

  async findAssignableCompanies(userId: string) {
    return this.prisma.empresa.findMany({
      where: { propietarioId: userId },
      select: { id: true, razonSocial: true, rnc: true, logo: true },
      orderBy: { razonSocial: 'asc' },
    });
  }

  async create(empresaId: string, data: any, actorUserId?: string) {
    const usingInvitation = Boolean(actorUserId || data.empresaIds !== undefined);
    const passwordHash = await bcrypt.hash(data.password || randomBytes(32).toString('hex'), 10);
    let invitationToken: string | undefined;

    // Check if user already exists
    let user = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      invitationToken = usingInvitation ? randomBytes(32).toString('hex') : undefined;
      user = await this.prisma.usuario.create({
        data: {
          email: data.email,
          passwordHash,
          nombre: data.name || data.nombre || null,
          avatar: data.avatar || null,
          ...(usingInvitation
            ? {
                isVerified: false,
                invitacionTokenHash: createHash('sha256').update(invitationToken!).digest('hex'),
                invitacionExpiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
              }
            : { debeCambiarPassword: true }),
        },
      });
    } else {
      // Update avatar or name if provided
      const updatePayload: any = {};
      if (data.avatar !== undefined) updatePayload.avatar = data.avatar;
      if (data.name || data.nombre) updatePayload.nombre = data.name || data.nombre;
      if (Object.keys(updatePayload).length > 0) {
        user = await this.prisma.usuario.update({
          where: { id: user.id },
          data: updatePayload,
        });
      }
      // If the user has not verified yet and invitation was requested, generate a new token
      if (!user.isVerified && usingInvitation) {
        invitationToken = randomBytes(32).toString('hex');
        user = await this.prisma.usuario.update({
          where: { id: user.id },
          data: {
            invitacionTokenHash: createHash('sha256').update(invitationToken).digest('hex'),
            invitacionExpiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
      }
    }

    const initialStatus = invitationToken ? 'PENDIENTE' : data.estado || 'ACTIVO';
    if (!actorUserId && data.empresaIds === undefined) {
      return this.prisma.membresia.create({
        data: {
          usuarioId: user.id,
          empresaId,
          roleId: data.roleId || null,
          estado: initialStatus,
        },
      });
    }
    const requestedCompanyIds = this.normalizeCompanyIds(data.empresaIds, empresaId);
    const companyIds = await this.validateAssignableCompanies(
      actorUserId,
      requestedCompanyIds,
      empresaId,
    );

    const memberships = await this.prisma.$transaction(async (tx) =>
      Promise.all(
        companyIds.map((assignedEmpresaId) =>
          tx.membresia.upsert({
            where: {
              usuarioId_empresaId: {
                usuarioId: user.id,
                empresaId: assignedEmpresaId,
              },
            },
            create: {
              usuarioId: user.id,
              empresaId: assignedEmpresaId,
              roleId: data.roleId || null,
              estado: initialStatus,
            },
            update: {
              roleId: data.roleId || null,
              estado: initialStatus,
            },
          }),
        ),
      ),
    );

    if (invitationToken) {
      // Fetch owner for SMTP config
      const owner = await this.prisma.usuario.findUnique({ where: { id: actorUserId! } }) as any;
      if (!owner) throw new NotFoundException('Propietario no encontrado');
      this.tenantMailer.assertSmtpConfigured(owner);

      const companies = await this.findAssignableCompanies(actorUserId!);
      const assignedCompanies = companies
        .filter((company) => companyIds.includes(company.id))
        .map((company) => company.razonSocial)
        .join(', ');
      await this.sendInvitation(owner, user.email, user.nombre || user.email, invitationToken, assignedCompanies);
    }

    return memberships[0];
  }

  async resendInvitation(empresaId: string, userId: string, actorUserId: string) {
    const owner = await this.prisma.usuario.findUnique({ where: { id: actorUserId } }) as any;
    if (!owner) {
      throw new ForbiddenException('Solo el propietario puede reenviar invitaciones');
    }
    // Validar SMTP antes de reenviar
    this.tenantMailer.assertSmtpConfigured(owner);

    const membership = await this.prisma.membresia.findUnique({
      where: { usuarioId_empresaId: { usuarioId: userId, empresaId } },
      include: { usuario: true },
    });
    if (!membership) throw new NotFoundException('Membresía no encontrada');
    if (membership.estado !== 'PENDIENTE') {
      throw new BadRequestException('Esta cuenta ya fue activada');
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.usuario.update({
      where: { id: userId },
      data: {
        invitacionTokenHash: createHash('sha256').update(token).digest('hex'),
        invitacionExpiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });
    const empresaForContext = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    await this.sendInvitation(owner, membership.usuario.email, membership.usuario.nombre || membership.usuario.email, token, empresaForContext?.razonSocial || 'Empresa');
    return { success: true };
  }

  private async sendInvitation(config: any, to: string, name: string, token: string, companies: string) {
    const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
    const invitationUrl = `${frontendUrl}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
    const subject = 'Invitación para acceder a Dolphin ERP';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: 0.1em; text-transform: uppercase;">
            DOLPHIN <span style="color: #0f172a;">ERP</span>
          </div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px;">
          <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">¡Hola, ${name || 'bienvenido'}!</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-bottom: 16px;">
            Has sido invitado a formar parte del equipo en <strong>Dolphin ERP</strong>.
          </p>
          <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
            <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px;">Empresas asignadas:</span>
            <span style="font-size: 14px; font-weight: 600; color: #0f172a;">${companies || 'Tu empresa'}</span>
          </div>
          <p style="font-size: 14px; line-height: 1.5; color: #475569; margin-bottom: 24px;">
            Para activar tu cuenta y configurar tu contraseña de acceso seguro, haz clic en el siguiente botón:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Activar Mi Cuenta
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 20px;">
            Este enlace de invitación expirará en 48 horas.<br>
            Si no esperabas esta invitación, puedes ignorar este correo de forma segura.
          </p>
        </div>
        <div style="text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} Dolphin ERP. Todos los derechos reservados.
        </div>
      </div>
    `;

    const text = [
      `Hola ${name || ''},`,
      '',
      'Has sido invitado a Dolphin ERP.',
      `Empresas asignadas: ${companies || 'Empresa asignada'}.`,
      '',
      'Activa tu cuenta y crea tu contraseña desde este enlace:',
      invitationUrl,
      '',
      'El enlace expira en 48 horas.',
    ];

    await this.tenantMailer.sendMail(config, {
      to,
      subject,
      html,
      text: text.join('\n'),
    });
  }

  async update(empresaId: string, id: string, data: any, actorUserId?: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    const isOwner = empresa?.propietarioId === id;

    if (isOwner && data.estado === 'INACTIVO') {
      throw new BadRequestException(
        'La cuenta principal del propietario del Tenant no puede ser desactivada.',
      );
    }

    if (data.password) {
      const passwordHash = await bcrypt.hash(data.password, 10);
      await this.prisma.usuario.update({
        where: { id },
        data: { passwordHash },
      });
    }

    if (data.name !== undefined || data.nombre !== undefined) {
      await this.prisma.usuario.update({
        where: { id },
        data: { nombre: data.name ?? data.nombre },
      });
    }

    if (data.avatar !== undefined) {
      await this.prisma.usuario.update({
        where: { id },
        data: { avatar: data.avatar },
      });
    }

    if (data.empresaIds !== undefined) {
      const requestedCompanyIds = this.normalizeCompanyIds(data.empresaIds, empresaId);
      const companyIds = await this.validateAssignableCompanies(
        actorUserId,
        requestedCompanyIds,
        empresaId,
      );
      const managedCompanyIds = actorUserId
        ? (await this.findAssignableCompanies(actorUserId)).map((company) => company.id)
        : [empresaId];

      await this.prisma.$transaction(async (tx) => {
        await tx.membresia.deleteMany({
          where: {
            usuarioId: id,
            empresaId: { in: managedCompanyIds, notIn: companyIds },
          },
        });
        await Promise.all(
          companyIds.map((assignedEmpresaId) =>
            tx.membresia.upsert({
              where: {
                usuarioId_empresaId: {
                  usuarioId: id,
                  empresaId: assignedEmpresaId,
                },
              },
              create: {
                usuarioId: id,
                empresaId: assignedEmpresaId,
                roleId: data.roleId || null,
                estado: data.estado || 'ACTIVO',
              },
              update: {
                roleId: data.roleId !== undefined ? data.roleId : undefined,
                estado: data.estado !== undefined ? data.estado : undefined,
              },
            }),
          ),
        );
      });

      return { usuarioId: id, empresaIds: companyIds };
    }

    return this.prisma.membresia.update({
      where: {
        usuarioId_empresaId: { usuarioId: id, empresaId },
      },
      data: {
        roleId: data.roleId !== undefined ? data.roleId : undefined,
        estado: data.estado !== undefined ? data.estado : undefined,
      },
    });
  }

  private normalizeCompanyIds(value: unknown, fallbackEmpresaId: string): string[] {
    const ids = Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && id.length > 0) : [];
    return [...new Set(ids.length ? ids : [fallbackEmpresaId])];
  }

  private async validateAssignableCompanies(
    actorUserId: string | undefined,
    companyIds: string[],
    fallbackEmpresaId: string,
  ): Promise<string[]> {
    if (!actorUserId) return companyIds;
    const ownedCompanies = await this.findAssignableCompanies(actorUserId);
    const ownedIds = new Set(ownedCompanies.map((company) => company.id));
    if (!ownedIds.has(fallbackEmpresaId) || companyIds.some((id) => !ownedIds.has(id))) {
      throw new BadRequestException('Solo puedes asignar empresas de las que eres propietario.');
    }
    return companyIds;
  }

  async remove(empresaId: string, id: string) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (empresa?.propietarioId === id) {
      throw new BadRequestException(
        'La cuenta principal del propietario del Tenant no puede ser eliminada.',
      );
    }

    return this.prisma.membresia.delete({
      where: {
        usuarioId_empresaId: { usuarioId: id, empresaId },
      },
    });
  }
}
