import { Injectable, NestMiddleware, ServiceUnavailableException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (['/healthz', '/readyz'].includes(req.path)) return next();
    if (process.env.MAINTENANCE_MODE === 'true' && !process.env.MAINTENANCE_TENANT_ID?.trim()) {
      throw new ServiceUnavailableException('El sistema se encuentra en mantenimiento.');
    }
    next(); // Tenant-specific maintenance is checked after JWT validation.
  }
}
