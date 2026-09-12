import {
  ForbiddenException,
  Injectable,
  BadRequestException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { createHash, randomBytes } from 'crypto';
import { TenantMailerService } from '../../common/tenant-mailer.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { renderEmail } from '../email-templates/email-renderer';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    @Optional() private readonly tenantMailer?: TenantMailerService,
    @Optional() private readonly mailer?: MailerService,
    @Optional() private readonly emailTemplates?: EmailTemplatesService,
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
        usuario: {
          include: {
            membresias: {
              where: { empresaId },
              select: { empresaId: true, estado: true },
            },
          },
        },
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
          .filter(
            (membership) =>
              membership.empresaId && membership.estado === 'ACTIVO',
          )
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
    const usingInvitation = Boolean(
      actorUserId || data.empresaIds !== undefined,
    );
    const passwordHash = await bcrypt.hash(
      data.password || randomBytes(32).toString('hex'),
      10,
    );
    let invitationToken: string | undefined;

    // Check if user already exists
    let user = await this.prisma.usuario.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      invitationToken = usingInvitation
        ? randomBytes(32).toString('hex')
        : undefined;
      user = await this.prisma.usuario.create({
        data: {
          email: data.email,
          passwordHash,
          nombre: data.name || data.nombre || null,
          avatar: data.avatar || null,
          ...(usingInvitation
            ? {
                isVerified: false,
                invitacionTokenHash: createHash('sha256')
                  .update(invitationToken!)
                  .digest('hex'),
                invitacionExpiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
              }
            : { debeCambiarPassword: true }),
        },
      });
    } else {
      const existingMembership = await this.prisma.membresia.findUnique({
        where: { usuarioId_empresaId: { usuarioId: user.id, empresaId } },
      });
      if (!existingMembership)
        throw new ForbiddenException(
          'La cuenta existente debe autorizar su vinculación a esta empresa',
        );
      // If the user has not verified yet and invitation was requested, generate a new token
      if (!user.isVerified && usingInvitation) {
        invitationToken = randomBytes(32).toString('hex');
        user = await this.prisma.usuario.update({
          where: { id: user.id },
          data: {
            invitacionTokenHash: createHash('sha256')
              .update(invitationToken)
              .digest('hex'),
            invitacionExpiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
          },
        });
      }
    }

    const initialStatus = invitationToken
      ? 'PENDIENTE'
      : data.estado || 'ACTIVO';
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
    const requestedCompanyIds = this.normalizeCompanyIds(
      data.empresaIds,
      empresaId,
    );
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
      const owner = (await this.prisma.usuario.findUnique({
        where: { id: actorUserId! },
      })) as any;
      if (!owner) throw new NotFoundException('Propietario no encontrado');
      this.tenantMailer?.assertSmtpConfigured(owner);

      const companies = await this.findAssignableCompanies(actorUserId!);
      const assignedCompanies = companies
        .filter((company) => companyIds.includes(company.id))
        .map((company) => company.razonSocial)
        .join(', ');
      await this.sendInvitation(
        empresaId,
        owner,
        user.email,
        user.nombre || user.email,
        invitationToken,
        assignedCompanies,
      );
    }

    await this.activityLog.log({
      empresaId: companyIds[0] || empresaId,
      usuarioId: actorUserId,
      modulo: 'users',
      accion: invitationToken ? 'INVITE' : 'CREATE',
      resourceId: user.id,
      resourceName: user.nombre || user.email,
      resourceType: 'Usuario',
      metadata: {
        email: user.email,
        nombre: user.nombre,
      },
    });

    return memberships[0];
  }

  async resendInvitation(
    empresaId: string,
    userId: string,
    actorUserId: string,
  ) {
    const owner = (await this.prisma.usuario.findUnique({
      where: { id: actorUserId },
    })) as any;
    if (!owner) {
      throw new ForbiddenException(
        'Solo el propietario puede reenviar invitaciones',
      );
    }
    // Validar SMTP antes de reenviar
    this.tenantMailer?.assertSmtpConfigured(owner);

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
    const empresaForContext = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    await this.sendInvitation(
      empresaId,
      owner,
      membership.usuario.email,
      membership.usuario.nombre || membership.usuario.email,
      token,
      empresaForContext?.razonSocial || 'Empresa',
    );
    return { success: true };
  }

  private async sendInvitation(
    empresaId: string,
    config: any,
    to: string,
    name: string,
    token: string,
    companies: string,
  ) {
    const frontendUrl =
      process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
    const invitationUrl = `${frontendUrl}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
    const email = this.emailTemplates
      ? await this.emailTemplates.render(
          empresaId,
          'invitation',
          {
            name: name || 'bienvenido',
            company: companies || 'Tu empresa',
          },
          { actionUrl: invitationUrl },
        )
      : renderEmail(
          'invitation',
          {
            name: name || 'bienvenido',
            company: companies || 'Tu empresa',
          },
          undefined,
          { actionUrl: invitationUrl },
        );

    await this.tenantMailer?.sendMail(config, {
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      attachments: email.attachments,
    });
  }

  async update(
    empresaId: string,
    id: string,
    data: any,
    actorUserId?: string,
    actorSessionId?: string,
  ) {
    if (!empresaId || !actorUserId)
      throw new BadRequestException('Empresa y actor requeridos');
    let passwordHash: string | undefined;
    if (data.password) {
      if (id !== actorUserId) {
        throw new BadRequestException(
          'Utiliza el flujo de recuperación de contraseña',
        );
      }
      if (typeof data.password !== 'string' || data.password.length < 6) {
        throw new BadRequestException(
          'La contraseña debe tener al menos 6 caracteres',
        );
      }
      passwordHash = await bcrypt.hash(data.password, 10);
    }
    const companyIds =
      data.empresaIds !== undefined
        ? await this.validateAssignableCompanies(
            actorUserId,
            this.normalizeCompanyIds(data.empresaIds, empresaId),
            empresaId,
          )
        : [empresaId];
    const managedIds =
      data.empresaIds !== undefined
        ? (await this.findAssignableCompanies(actorUserId)).map(
            (company) => company.id,
          )
        : [empresaId];
    return this.prisma.$transaction(async (tx) => {
      const member = await tx.membresia.findUnique({
        where: { usuarioId_empresaId: { usuarioId: id, empresaId } },
        include: { usuario: true, empresa: true },
      });
      if (!member)
        throw new NotFoundException('Usuario no encontrado en la empresa');
      const isOwner = member.empresa.propietarioId === id;
      if (isOwner) {
        if (data.estado === 'INACTIVO') {
          throw new BadRequestException(
            'No se puede desactivar o cambiar el rol del propietario',
          );
        }
        if (!companyIds.includes(empresaId)) {
          throw new BadRequestException(
            'La empresa principal debe estar asignada al propietario',
          );
        }
        delete data.roleId;
      }
      const nombre = data.name ?? data.nombre;
      const identityChanged =
        (nombre !== undefined && nombre !== member.usuario.nombre) ||
        (data.avatar !== undefined && data.avatar !== member.usuario.avatar);
      if (identityChanged && id !== actorUserId) {
        const unrelated = await tx.membresia.count({
          where: {
            usuarioId: id,
            empresa: { propietarioId: { not: actorUserId } },
          },
        });
        if (unrelated)
          throw new BadRequestException(
            'La identidad compartida solo puede modificarla su titular',
          );
      }
      if (data.roleId) {
        for (const assignedId of companyIds) {
          if (
            !(await tx.role.findFirst({
              where: { id: data.roleId, empresaId: assignedId },
            }))
          ) {
            throw new BadRequestException(
              'El rol debe pertenecer a la empresa asignada',
            );
          }
        }
      }
      if (identityChanged || passwordHash) {
        await tx.usuario.update({
          where: { id },
          data: {
            nombre: nombre === undefined ? undefined : nombre,
            avatar: data.avatar,
            ...(passwordHash ? { passwordHash } : {}),
          },
        });
      }
      if (data.empresaIds !== undefined) {
        await tx.membresia.deleteMany({
          where: {
            usuarioId: id,
            empresaId: { in: managedIds, notIn: companyIds },
          },
        });
      }
      for (const assignedId of companyIds)
        await tx.membresia.upsert({
          where: {
            usuarioId_empresaId: { usuarioId: id, empresaId: assignedId },
          },
          create: {
            usuarioId: id,
            empresaId: assignedId,
            roleId: isOwner ? null : data.roleId || null,
            estado: isOwner ? 'ACTIVO' : data.estado || 'ACTIVO',
          },
          update: {
            ...(isOwner ? {} : { roleId: data.roleId }),
            estado: isOwner ? 'ACTIVO' : data.estado,
          },
        });
      if (id !== actorUserId || passwordHash) {
        await tx.userSession.updateMany({
          where: {
            usuarioId: id,
            revokedAt: null,
            ...(id === actorUserId && actorSessionId
              ? { id: { not: actorSessionId } }
              : {}),
          },
          data: { revokedAt: new Date() },
        });
      }
      await tx.activityLog.create({
        data: {
          empresaId,
          usuarioId: actorUserId,
          modulo: 'SECURITY',
          accion: 'USER_UPDATED',
          resourceId: id,
          metadata: JSON.stringify({
            severity: 'Medium',
            actionTaken: 'Membresía actualizada',
          }),
        },
      });
      return { usuarioId: id, empresaIds: companyIds };
    });
  }

  private normalizeCompanyIds(
    value: unknown,
    fallbackEmpresaId: string,
  ): string[] {
    const ids = Array.isArray(value)
      ? value.filter(
          (id): id is string => typeof id === 'string' && id.length > 0,
        )
      : [];
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
    if (
      !ownedIds.has(fallbackEmpresaId) ||
      companyIds.some((id) => !ownedIds.has(id))
    ) {
      throw new BadRequestException(
        'Solo puedes asignar empresas de las que eres propietario.',
      );
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

    const member = await this.prisma.membresia.findUnique({
      where: { usuarioId_empresaId: { usuarioId: id, empresaId } },
      include: { usuario: true },
    });

    const deleted = await this.prisma.membresia.delete({
      where: {
        usuarioId_empresaId: { usuarioId: id, empresaId },
      },
    });

    await this.activityLog.log({
      empresaId,
      modulo: 'users',
      accion: 'DELETE',
      resourceId: id,
      resourceName:
        member?.usuario?.nombre || member?.usuario?.email || 'Usuario',
      resourceType: 'Usuario',
    });

    return deleted;
  }
}
