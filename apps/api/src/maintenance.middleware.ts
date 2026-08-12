import {
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    let tenantId: string | null = null;
    const authHeader = req.headers.authorization;

    // Extraer tenant del token JWT si el usuario está autenticado
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payloadBase64 = token.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(
            Buffer.from(payloadBase64, 'base64').toString(),
          );
          tenantId = payload.empresaId || null;
        }
      } catch {
        // Ignorar errores de decodificación
      }
    }

    let isMaintenance = false;

    // Leemos el .env de forma dinámica
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        if (envConfig['MAINTENANCE_MODE'] === 'true') {
          const maintenanceTenant = envConfig['MAINTENANCE_TENANT_ID'];
          // Si no hay tenant específico, es mantenimiento global.
          // Si hay tenant específico (separados por coma), verificamos que el del usuario esté en la lista.
          if (!maintenanceTenant || maintenanceTenant.trim() === '') {
            isMaintenance = true;
          } else if (
            tenantId &&
            maintenanceTenant
              .split(',')
              .map((t) => t.trim())
              .includes(tenantId)
          ) {
            isMaintenance = true;
          }
        }
      }
    } catch {
      // Ignorar
    }

    // Fallback por si acaso fue cargada en process.env
    if (!isMaintenance && process.env.MAINTENANCE_MODE === 'true') {
      const maintenanceTenant = process.env.MAINTENANCE_TENANT_ID;
      if (!maintenanceTenant || maintenanceTenant.trim() === '') {
        isMaintenance = true;
      } else if (
        tenantId &&
        maintenanceTenant
          .split(',')
          .map((t) => t.trim())
          .includes(tenantId)
      ) {
        isMaintenance = true;
      }
    }

    if (isMaintenance) {
      throw new ServiceUnavailableException(
        'El sistema se encuentra en mantenimiento.',
      );
    }

    next();
  }
}
