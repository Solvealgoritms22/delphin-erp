import { ForbiddenException, Injectable, BadRequestException, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { MailerService } from '@nestjs-modules/mailer';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
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
          ...(usingInvitation
            ? {
                isVerified: false,
                invitacionTokenHash: createHash('sha256').update(invitationToken!).digest('hex'),
                invitacionExpiraEn: new Date(Date.now() + 48 * 60 * 60 * 1000),
              }
            : { debeCambiarPassword: true }),
        },
      });
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
      const companies = await this.findAssignableCompanies(actorUserId!);
      const assignedCompanies = companies
        .filter((company) => companyIds.includes(company.id))
        .map((company) => company.razonSocial)
        .join(', ');
      await this.sendInvitation(user.email, user.nombre || user.email, invitationToken, assignedCompanies);
    }

    return memberships[0];
  }

  async resendInvitation(empresaId: string, userId: string, actorUserId: string) {
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });
    if (!empresa || empresa.propietarioId !== actorUserId) {
      throw new ForbiddenException('Solo el propietario puede reenviar invitaciones');
    }
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
    await this.sendInvitation(membership.usuario.email, membership.usuario.nombre || membership.usuario.email, token, empresa.razonSocial);
    return { success: true };
  }

  private async sendInvitation(to: string, name: string, token: string, companies: string) {
    if (!this.mailer) throw new BadRequestException('El servicio de correo no está configurado');
    const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
    const invitationUrl = `${frontendUrl}/auth/accept-invitation?token=${encodeURIComponent(token)}`;
    await this.mailer.sendMail({
      to,
      subject: 'Invitación para acceder a Dolphin ERP',
      text: [
        `Hola ${name},`,
        '',
        'Has sido invitado a Dolphin ERP.',
        `Empresas asignadas: ${companies || 'Empresa asignada'}.`,
        '',
        'Activa tu cuenta y crea tu contraseña desde este enlace:',
        invitationUrl,
        '',
        'El enlace expira en 48 horas.',
      ].join('\n'),
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
