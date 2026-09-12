import { hasActiveSubscription } from '../subscription-policy';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ENTITLEMENT_KEY } from '../decorators/require-entitlement.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredEntitlement = this.reflector.getAllAndOverride<string>(
      ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredEntitlement) {
      return true; // No entitlement required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.empresaId) {
      throw new ForbiddenException(
        'Usuario no autenticado o no pertenece a una empresa.',
      );
    }

    const empresaId = user.empresaId;

    // Obtener la suscripción y plan de la empresa
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        suscripcion: {
          include: { plan: true },
        },
      },
    });

    if (!empresa) {
      throw new ForbiddenException('Empresa no encontrada.');
    }

    const suscripcion = empresa.suscripcion;

    // -----------------------------------------------
    // Lógica de Trial
    // -----------------------------------------------
    if (suscripcion?.estado === 'TRIAL') {
      const now = new Date();
      const expiry = suscripcion.fechaRenovacion;

      if (!expiry || now >= expiry) {
        // Trial expirado → bloquear con error específico para redirigir al frontend
        throw new HttpException(
          {
            message:
              'Tu período de prueba gratuita de 15 días ha finalizado. Por favor selecciona un plan para continuar.',
            code: 'TRIAL_EXPIRED',
          },
          HttpStatus.PAYMENT_REQUIRED,
        );
      }
    }

    // -----------------------------------------------
    // Lógica de suscripción de pago
    // -----------------------------------------------
    if (!suscripcion || !hasActiveSubscription(suscripcion)) {
      throw new HttpException(
        {
          message:
            'Suscripción inactiva o expirada. Por favor, actualiza tu pago.',
          code: 'SUBSCRIPTION_INACTIVE',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    // Resolver límites del plan
    const currentPlan = suscripcion.plan;
    if (
      !['maxUsuarios', 'maxSucursales', 'maxProductos'].includes(
        requiredEntitlement,
      ) ||
      !currentPlan
    ) {
      throw new ForbiddenException(
        'El plan o el límite del recurso no está configurado.',
      );
    }
    const maxLimit = currentPlan[requiredEntitlement];
    if (!Number.isSafeInteger(maxLimit) || maxLimit < 0) {
      throw new ForbiddenException('El límite del plan no es válido.');
    }

    // Calcular el uso actual basado en el recurso
    let currentUsage = 0;
    if (requiredEntitlement === 'maxUsuarios') {
      currentUsage = await this.prisma.membresia.count({
        where: { empresaId, estado: 'ACTIVO' },
      });
    } else if (requiredEntitlement === 'maxSucursales') {
      currentUsage = await this.prisma.sucursal.count({
        where: { empresaId, estado: 'ACTIVO' },
      });
    } else if (requiredEntitlement === 'maxProductos') {
      currentUsage = await this.prisma.producto.count({
        where: { empresaId, estado: 'ACTIVO' },
      });
    }

    if (currentUsage >= maxLimit) {
      throw new HttpException(
        {
          message: `Has alcanzado el límite de tu plan para este recurso (${currentUsage}/${maxLimit}). Actualiza tu plan para continuar.`,
          code: 'LIMIT_EXCEEDED',
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    return true;
  }
}
