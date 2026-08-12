import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface LogActivityDto {
  empresaId?: string;
  usuarioId?: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una actividad. Falla silenciosamente para no interrumpir el flujo de negocio.
   */
  async log(dto: LogActivityDto): Promise<void> {
    try {
      await this.prisma.activityLog.create({
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
    } catch {
      // Silently ignore — activity logging must never break business logic
    }
  }

  /**
   * Query activity logs with filtering and pagination.
   */
  async findMany(params: {
    empresaId?: string;
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

    const where: any = empresaId ? { empresaId } : {};

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

    // Parse metadata JSON
    const parsed = items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));

    return { total, page, limit, items: parsed };
  }

  /**
   * Returns available years for sidebar navigation.
   */
  async getYears(empresaId?: string): Promise<number[]> {
    const logs = await this.prisma.activityLog.findMany({
      where: empresaId ? { empresaId } : {},
      select: { creadoEn: true },
      orderBy: { creadoEn: 'desc' },
    });

    const years = [...new Set(logs.map((l) => l.creadoEn.getFullYear()))];
    return years.sort((a, b) => b - a);
  }

  async clear(empresaId: string, modulo?: string) {
    return this.prisma.activityLog.deleteMany({
      where: {
        empresaId,
        ...(modulo ? { modulo } : {}),
      },
    });
  }

  async findSecurityLogs(params: {
    empresaId?: string;
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
        const severity = metadata.severity || this.securitySeverity(item.accion);
        return {
          id: item.id,
          timestamp: item.creadoEn,
          eventType: metadata.eventType || item.accion,
          actionTaken: metadata.actionTaken || item.accion,
          sourceIp: item.ipAddress || 'No disponible',
          destinationIp: metadata.destinationIp || 'No disponible',
          severity,
          usuarioEmail: item.usuarioEmail,
        };
      })
      .filter((item: any) => {
        if (params.severity && item.severity !== params.severity) return false;
        if (!search) return true;
        return [item.eventType, item.actionTaken, item.sourceIp, item.destinationIp]
          .join(' ')
          .toLowerCase()
          .includes(search);
      });

    return { ...result, items };
  }

  private securitySeverity(action: string): 'Low' | 'Medium' | 'High' | 'Critical' {
    if (action.includes('FAILED') || action.includes('BLOCKED')) return 'High';
    if (action.includes('REVOKED') || action.includes('DELETED')) return 'Medium';
    return 'Low';
  }
}
