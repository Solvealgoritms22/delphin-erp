import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AzulService } from './azul.service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);

  constructor(
    private prisma: PrismaService,
    private azulService: AzulService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyRenewals() {
    this.logger.log('Iniciando proceso de cobros automáticos...');

    // Buscar suscripciones que necesitan renovación hoy o que están vencidas y en período de gracia.
    // Simplificado para el ejemplo: buscamos las que expiran hoy o antes y siguen ACTIVAS.
    const hoy = new Date();

    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        estado: 'ACTIVE', // Solo ACTIVE; TRIAL, PAST_DUE y CANCELED se excluyen
        fechaRenovacion: { lte: hoy },
        azulDataVaultToken: { not: null },
      },
      include: { plan: true, empresa: true },
    });

    for (const sub of suscripciones) {
      if (!sub.azulDataVaultToken || !sub.azulDataVaultExpiration || !sub.plan)
        continue;

      this.logger.log(
        `Procesando cobro para la empresa ${sub.empresa.razonSocial} (Plan: ${sub.plan.nombre})`,
      );

      const amountToCharge =
        sub.periodicidad === 'YEARLY'
          ? sub.plan.precioAnual
          : sub.plan.precioMensual;
      // Asumiendo que el monto viene en USD pero procesamos en una moneda base. Para simplificar, multiplicamos x 100.
      const amountCents = Math.round(Number(amountToCharge) * 100);
      const orderNumber = `RENEW-${sub.id.substring(0, 8)}-${Date.now()}`;

      try {
        const azulRes = await this.azulService.processTokenSale({
          dataVaultToken: sub.azulDataVaultToken,
          dataVaultExpiration: sub.azulDataVaultExpiration,
          amountCents,
          itbisCents: Math.round(amountCents * 0.18), // Ejemplo: 18% itbis
          orderNumber,
        });

        if (this.azulService.isApproved(azulRes)) {
          // Cobro exitoso. Renovar la suscripción sumando 1 mes o 1 año.
          const nextRenewal = new Date();
          if (sub.periodicidad === 'YEARLY') {
            nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
          } else {
            nextRenewal.setMonth(nextRenewal.getMonth() + 1);
          }

          await this.prisma.suscripcion.update({
            where: { id: sub.id },
            data: { fechaRenovacion: nextRenewal },
          });

          await this.prisma.factura.create({
            data: {
              suscripcionId: sub.id,
              monto: amountToCharge,
              estado: 'PAID',
              azulOrderId: azulRes.AzuleOrderId,
              azulAuthCode: azulRes.AuthorizationCode,
            },
          });

          this.logger.log(
            `Cobro exitoso. Próxima renovación: ${nextRenewal.toISOString()}`,
          );
        } else {
          // Cobro rechazado. Pasar a PAST_DUE.
          await this.prisma.suscripcion.update({
            where: { id: sub.id },
            data: { estado: 'PAST_DUE' },
          });
          this.logger.warn(
            `Cobro fallido para ${sub.empresa.razonSocial}. Estado actualizado a PAST_DUE.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Error procesando renovación para ${sub.empresa.razonSocial}`,
          error,
        );
      }
    }
  }
}
