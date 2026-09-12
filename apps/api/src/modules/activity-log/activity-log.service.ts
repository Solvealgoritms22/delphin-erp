import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LogActivityDto {
  empresaId?: string;
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  usuarioAvatar?: string;
  modulo: string;
  accion: string;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una actividad. Falla silenciosamente para no interrumpir el flujo de negocio.
   */
  async log(
    dto: LogActivityDto,
    db: Pick<PrismaService, 'activityLog'> = this.prisma,
  ): Promise<void> {
    try {
      await db.activityLog.create({
        data: {
          empresaId: dto.empresaId,
          usuarioId: dto.usuarioId,
          usuarioNombre: dto.usuarioNombre,
          usuarioEmail: dto.usuarioEmail,
          modulo: dto.modulo,
          accion: dto.accion,
          resourceId: dto.resourceId,
          resourceName: dto.resourceName,
          resourceType: dto.resourceType,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(
        'AUDIT_WRITE_FAILED',
        error instanceof Error ? error.stack : undefined,
      );
      if (db !== this.prisma) throw error;
    }
  }

  /**
   * Query activity logs with filtering, pagination and enriched user avatar photos.
   */
  async findMany(params: {
    empresaId: string;
    modulo?: string;
    accion?: string;
    usuarioId?: string;
    year?: number;
    page?: number;
    limit?: number;
  }) {
    const {
      empresaId,
      modulo,
      accion,
      usuarioId,
      year,
      page = 1,
      limit = 30,
    } = params;

    if (!empresaId) throw new ForbiddenException('Empresa activa requerida');
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 200
    )
      throw new BadRequestException('Paginación inválida');
    const where: any = { empresaId };

    if (modulo) where.modulo = modulo;
    if (accion) where.accion = accion;
    if (usuarioId) where.usuarioId = usuarioId;
    if (year) {
      where.creadoEn = {
        gte: new Date(`${year}-01-01T00:00:00Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00Z`),
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.activityLog.count({ where }),
      this.prisma.activityLog.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Lookup user avatars and names for all actors
    const userIds = [
      ...new Set(
        items
          .map((i) => i.usuarioId)
          .filter((id): id is string => Boolean(id) && typeof id === 'string'),
      ),
    ];

    const users =
      userIds.length > 0
        ? await this.prisma.usuario.findMany({
            where: { id: { in: userIds } },
            select: { id: true, nombre: true, email: true, avatar: true },
          })
        : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Parse metadata JSON & attach user avatar
    const parsed = items.map((item) => {
      const user = item.usuarioId ? userMap.get(item.usuarioId) : null;
      return {
        ...item,
        usuarioNombre:
          item.usuarioNombre ||
          user?.nombre ||
          item.usuarioEmail ||
          user?.email ||
          'Sistema',
        usuarioEmail: item.usuarioEmail || user?.email,
        usuarioAvatar: user?.avatar || null,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
      };
    });

    return { total, page, limit, items: parsed };
  }

  /**
   * Returns available years for sidebar navigation.
   */
  async getYears(empresaId: string): Promise<number[]> {
    if (!empresaId) throw new ForbiddenException('Empresa activa requerida');
    const rows = await this.prisma.$queryRaw<Array<{ year: number }>>`
      SELECT DISTINCT EXTRACT(YEAR FROM creado_en)::int AS year
      FROM activity_logs WHERE empresa_id = ${empresaId} ORDER BY year DESC
    `;
    return rows.map((row) => row.year);
  }

  clear(_empresaId: string, _modulo?: string): Promise<never> {
    return Promise.reject(new ForbiddenException('Los registros de auditoría son inmutables'));
  }

  async findSecurityLogs(params: {
    empresaId: string;
    search?: string;
    severity?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 25;
    const result = await this.findMany({
      empresaId: params.empresaId,
      modulo: 'SECURITY',
      page,
      limit,
    });
    const search = params.search?.toLowerCase().trim();

    const items = result.items
      .map((item: any) => {
        const metadata = item.metadata || {};
        const severity =
          metadata.severity || this.securitySeverity(item.accion);
        return {
          id: item.id,
          timestamp: item.creadoEn,
          eventType: metadata.eventType || item.accion,
          actionTaken: metadata.actionTaken || item.accion,
          sourceIp: item.ipAddress || 'No disponible',
          destinationIp: metadata.destinationIp || 'No disponible',
          severity,
          usuarioNombre: item.usuarioNombre,
          usuarioEmail: item.usuarioEmail,
          usuarioAvatar: item.usuarioAvatar,
        };
      })
      .filter((item: any) => {
        if (params.severity && item.severity !== params.severity) return false;
        if (!search) return true;
        return [
          item.eventType,
          item.actionTaken,
          item.sourceIp,
          item.destinationIp,
          item.usuarioNombre,
          item.usuarioEmail,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });

    return { ...result, items };
  }

  private securitySeverity(
    action: string,
  ): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (action.includes('FAILED') || action.includes('BLOCKED')) return 'High';
    if (action.includes('REVOKED') || action.includes('DELETED'))
      return 'Medium';
    return 'Low';
  }
}
