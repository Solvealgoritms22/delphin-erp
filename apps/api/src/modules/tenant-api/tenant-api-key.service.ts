import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateTenantApiAppDto,
  UpdateTenantApiAppDto,
} from './dto/tenant-api.dto';
import { NotificationsService } from '../notifications/notifications.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantApiKeyService {
  private readonly logger = new Logger(TenantApiKeyService.name);

  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  private async withNotice<T>(
    empresaId: string,
    message: string,
    action: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const result = await this.prisma.$transaction(async (tx) => {
      return action(tx);
    });
    await this.notifications
      ?.create({
        empresaId,
        tipo: 'API_KEY_EVENT',
        titulo: 'Seguridad de integraciones API',
        mensaje: message,
      })
      .catch((err) =>
        this.logger.warn(`No se pudo enviar notificación: ${err?.message}`),
      );
    return result;
  }

  /**
   * Hashes a raw API key using SHA-256 for secure DB storage and lookup.
   */
  hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Generates a new API key string with prefix `dlph_live_...`
   */
  private generateRawKey(): string {
    const randomHex = crypto.randomBytes(24).toString('hex');
    return `dlph_live_${randomHex}`;
  }

  /**
   * Validates if the company has an active Enterprise plan
   */
  async checkEnterpriseEntitlement(empresaId: string): Promise<boolean> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        suscripcion: {
          include: { plan: true },
        },
      },
    });

    if (!empresa) throw new NotFoundException('Empresa no encontrada.');

    const planId = (
      empresa.suscripcion?.plan?.id ||
      empresa.suscripcion?.planId ||
      ''
    ).toLowerCase();

    // Check if Enterprise plan
    return planId === 'enterprise';
  }

  /**
   * Lists all registered API apps for a tenant (without sensitive full keys)
   */
  async findAll(empresaId: string) {
    const isEnterprise = await this.checkEnterpriseEntitlement(empresaId);

    const apps = await this.prisma.tenantApiApp.findMany({
      where: { empresaId },
      orderBy: { creadoEn: 'desc' },
    });

    return {
      isEnterprise,
      maxAllowedApps: 2,
      apps: apps.map((app) => ({
        id: app.id,
        nombre: app.nombre,
        descripcion: app.descripcion,
        apiKeyPrefix: app.apiKeyPrefix,
        allowedOrigins: app.allowedOrigins ? JSON.parse(app.allowedOrigins) : [],
        estado: app.estado,
        lastUsedAt: app.lastUsedAt,
        requestCount: Number(app.requestCount),
        creadoEn: app.creadoEn,
      })),
    };
  }

  /**
   * Registers a new tenant API application (Max 2 apps per enterprise tenant, max 2 origins)
   */
  async create(empresaId: string, dto: CreateTenantApiAppDto) {
    const isEnterprise = await this.checkEnterpriseEntitlement(empresaId);
    if (!isEnterprise) {
      throw new ForbiddenException(
        'La API Pública del Tenant es una característica exclusiva del plan Enterprise. Actualiza tu plan para habilitarla.',
      );
    }

    // Limit check: maximum 2 apps
    const activeCount = await this.prisma.tenantApiApp.count({
      where: { empresaId, estado: 'ACTIVO' },
    });

    if (activeCount >= 2) {
      throw new BadRequestException(
        'Has alcanzado el límite máximo de 2 aplicaciones externas para tu empresa.',
      );
    }

    const origins = dto.allowedOrigins || [];
    if (origins.length > 2) {
      throw new BadRequestException(
        'Solo se permiten hasta 2 orígenes/dominios por aplicación.',
      );
    }

    // Generate Key
    const rawApiKey = this.generateRawKey();
    const apiKeyHash = this.hashKey(rawApiKey);
    const apiKeyPrefix = `${rawApiKey.slice(0, 14)}...${rawApiKey.slice(-4)}`;

    const app = await this.withNotice(empresaId,'Se creó una credencial para '+dto.nombre+'.',tx=>tx.tenantApiApp.create({
      data: {
        empresaId,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        apiKeyHash,
        apiKeyPrefix,
        allowedOrigins: origins.length > 0 ? JSON.stringify(origins) : null,
        estado: 'ACTIVO',
      },
    }));

    return {
      message: 'Aplicación API creada con éxito.',
      rawApiKey, // ONLY RETURNED ONCE
      app: {
        id: app.id,
        nombre: app.nombre,
        descripcion: app.descripcion,
        apiKeyPrefix: app.apiKeyPrefix,
        allowedOrigins: origins,
        estado: app.estado,
        creadoEn: app.creadoEn,
      },
    };
  }

  /**
   * Rotates the API key of an existing application
   */
  async rotateKey(empresaId: string, appId: string) {
    const isEnterprise = await this.checkEnterpriseEntitlement(empresaId);
    if (!isEnterprise) {
      throw new ForbiddenException(
        'La API Pública del Tenant es exclusiva del plan Enterprise.',
      );
    }

    const app = await this.prisma.tenantApiApp.findFirst({
      where: { id: appId, empresaId },
    });

    if (!app) {
      throw new NotFoundException('Aplicación API no encontrada.');
    }

    const rawApiKey = this.generateRawKey();
    const apiKeyHash = this.hashKey(rawApiKey);
    const apiKeyPrefix = `${rawApiKey.slice(0, 14)}...${rawApiKey.slice(-4)}`;

    const updated = await this.withNotice(empresaId,'Se modificó la credencial de '+app.nombre+'.',tx=>tx.tenantApiApp.update({
      where: { id: appId },
      data: {
        apiKeyHash,
        apiKeyPrefix,
        estado: 'ACTIVO',
      },
    }));

    return {
      message: 'Clave API rotada con éxito. La clave anterior ha sido invalidada.',
      rawApiKey, // ONLY RETURNED ONCE
      app: {
        id: updated.id,
        nombre: updated.nombre,
        apiKeyPrefix: updated.apiKeyPrefix,
        estado: updated.estado,
      },
    };
  }

  /**
   * Revokes an application API key
   */
  async revoke(empresaId: string, appId: string) {
    const app = await this.prisma.tenantApiApp.findFirst({
      where: { id: appId, empresaId },
    });

    if (!app) throw new NotFoundException('Aplicación API no encontrada.');

    const updated = await this.withNotice(empresaId, 'Se revocó la credencial de ' + app.nombre + '.', tx => tx.tenantApiApp.update({
      where: { id: appId },
      data: { estado: 'REVOCADO' },
    }));
    return updated;
  }

  /**
   * Deletes an application registration
   */
  async delete(empresaId: string, appId: string) {
    const app = await this.prisma.tenantApiApp.findFirst({
      where: { id: appId, empresaId },
    });

    if (!app) throw new NotFoundException('Aplicación API no encontrada.');

    await this.withNotice(empresaId,'Se eliminó la integración '+app.nombre+' y su credencial.',tx=>tx.tenantApiApp.delete({where:{id:appId}}));

    return { message: 'Aplicación API eliminada correctamente.' };
  }
}
