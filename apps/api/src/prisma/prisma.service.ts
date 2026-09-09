import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '../common/tenant/tenant-context';
import { scopedModels, tenantQueryExtension } from '../common/tenant/tenant-policy';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['error', 'warn']
          : ['error'],
    });
    const client = this.$extends({ query: tenantQueryExtension });
    const delegates = new Set([...scopedModels].map(name => name[0].toLowerCase() + name.slice(1)));
    return new Proxy(this, {
      get(target, property, receiver) {
        if (typeof property === 'string' && delegates.has(property)) return client[property];
        if (property === '$transaction') return client.$transaction.bind(client);
        return Reflect.get(target, property, receiver);
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Conexión exitosa con la base de datos PostgreSQL.');
    } catch (err: any) {
      this.logger.error('Error conectando a la base de datos:', err?.message || err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Desconexión segura de PostgreSQL completada.');
  }

  /**
   * Valida que el recurso solicitado pertenezca a la empresa del tenant activo.
   * Evita fugas de datos involuntarias entre organizaciones.
   */
  assertTenantAccess(resourceEmpresaId?: string | null): void {
    if (TenantContext.isSuperAdmin()) return;

    const currentTenant = TenantContext.getTenantId();
    if (!currentTenant) throw new ForbiddenException('Contexto de empresa requerido');

    if (resourceEmpresaId && resourceEmpresaId !== currentTenant) {
      throw new ForbiddenException(
        'Acceso denegado: el recurso solicitado pertenece a otra organización.',
      );
    }
  }

  /**
   * Healthcheck de PostgreSQL (latencia y conectividad).
   */
  async ping(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    await this.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  }
}
