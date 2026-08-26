import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class TenantApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(TenantApiKeyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. Extract API Key from header
    const rawApiKey =
      request.headers['x-api-key'] ||
      (request.headers['authorization']?.startsWith('Bearer dlph_')
        ? request.headers['authorization'].replace('Bearer ', '').trim()
        : null);

    if (!rawApiKey) {
      throw new UnauthorizedException(
        'Header X-API-Key requerido para consumir la API pública del tenant.',
      );
    }

    // 2. Hash and lookup
    const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
    const app = await this.prisma.tenantApiApp.findUnique({
      where: { apiKeyHash },
      include: {
        empresa: {
          include: {
            suscripcion: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (!app || app.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Clave API no válida o revocada.');
    }

    // 3. Verify Enterprise Entitlement
    const planId = (
      app.empresa?.suscripcion?.plan?.id ||
      app.empresa?.suscripcion?.planId ||
      ''
    ).toLowerCase();

    if (planId !== 'enterprise') {
      throw new ForbiddenException(
        'La API externa está deshabilitada porque la empresa no cuenta con un plan Enterprise activo.',
      );
    }

    // 4. Validate Origin if configured
    const requestOrigin = request.headers['origin'] || request.headers['referer'];
    if (app.allowedOrigins && requestOrigin) {
      try {
        const allowed: string[] = JSON.parse(app.allowedOrigins);
        if (allowed.length > 0) {
          const originHost = new URL(requestOrigin).hostname.toLowerCase();
          const isAllowed = allowed.some((orig) => {
            try {
              const origHost = new URL(orig).hostname.toLowerCase();
              return (
                origHost === originHost ||
                originHost.endsWith(`.${origHost}`) ||
                orig === '*'
              );
            } catch {
              return orig.toLowerCase().includes(originHost);
            }
          });

          if (!isAllowed) {
            throw new ForbiddenException(
              `El origen '${requestOrigin}' no está en la lista de orígenes autorizados para esta clave API.`,
            );
          }
        }
      } catch (err: any) {
        if (err instanceof ForbiddenException) throw err;
        this.logger.warn(`Error parsing allowedOrigins for app ${app.id}: ${err?.message}`);
      }
    }

    // 5. Asynchronously record usage (lastUsedAt + requestCount increment)
    void this.prisma.tenantApiApp
      .update({
        where: { id: app.id },
        data: {
          lastUsedAt: new Date(),
          requestCount: { increment: 1 },
        },
      })
      .catch((err) =>
        this.logger.error(`Error updating API usage count: ${err?.message}`),
      );

    // 6. Attach tenant context to request
    request.empresaId = app.empresaId;
    request.tenantAppId = app.id;
    request.tenantAppName = app.nombre;

    return true;
  }
}
