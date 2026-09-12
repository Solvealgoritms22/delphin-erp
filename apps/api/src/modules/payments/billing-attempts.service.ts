import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BillingAttemptsService {
  private readonly logger = new Logger(BillingAttemptsService.name);
  constructor(private readonly prisma: PrismaService) {}

  async execute<T>(
    empresaId: string,
    kind: string,
    key: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const id = createHash('sha256')
      .update(empresaId + ':' + kind + ':' + key)
      .digest('hex');
    try {
      await this.prisma.billingAttempt.create({
        data: { id, empresaId, kind, status: 'PROCESSING' },
      });
    } catch (error: any) {
      if (error.code !== 'P2002') throw error;
      const existing = await this.prisma.billingAttempt.findUnique({
        where: { id },
      });
      if (existing?.status === 'SUCCEEDED') return existing.result as T;
      throw new ConflictException(
        'Hay un cobro en curso o pendiente de conciliación. No se volverá a cobrar automáticamente.',
      );
    }
    try {
      const result = await operation();
      await this.prisma.$transaction([
        this.prisma.billingAttempt.update({
          where: { id },
          data: {
            status: 'SUCCEEDED',
            result: JSON.parse(JSON.stringify(result)),
          },
        }),
        this.prisma.activityLog.create({
          data: {
            empresaId,
            modulo: 'SECURITY',
            accion: kind,
            resourceId: id,
            metadata: JSON.stringify({
              severity: 'High',
              actionTaken: 'Operación de billing completada',
            }),
          },
        }),
      ]);
      return result;
    } catch (error) {
      // A timeout does not prove the bank did not charge. Never retry it with a new order.
      await this.prisma.billingAttempt.updateMany({
        where: { id, status: 'PROCESSING' },
        data: { status: 'UNKNOWN' },
      });
      this.logger.error('BILLING_RECONCILIATION_REQUIRED ' + id);
      throw error;
    }
  }
}
