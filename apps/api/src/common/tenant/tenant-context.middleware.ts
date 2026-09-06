import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant-context';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    const headerEmpresaId = req.headers['x-empresa-id'] as string;
    const empresaId = user?.empresaId || headerEmpresaId || undefined;
    const usuarioId = user?.id || user?.sub || undefined;
    const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.rol === 'SUPER_ADMIN');

    TenantContext.run(
      {
        empresaId,
        usuarioId,
        isSuperAdmin,
      },
      () => {
        next();
      },
    );
  }
}
