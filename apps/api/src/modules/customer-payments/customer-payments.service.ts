import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class CustomerPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(empresaId: string, usuarioId: string, data: any) {
    if (
      !empresaId ||
      !data.clienteId ||
      !data.facturaId ||
      !data.monto ||
      Number(data.monto) <= 0
    )
      throw new BadRequestException(
        'Empresa, cliente, factura y monto válido son requeridos',
      );
    const amount = new Prisma.Decimal(data.monto);
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.facturaVenta.findFirst({
        where: { id: data.facturaId, empresaId, clienteId: data.clienteId },
        select: { id: true, moneda: true, balancePendiente: true },
      });
      if (!invoice)
        throw new NotFoundException(
          'Factura no encontrada para el cliente activo',
        );
      if (data.moneda && data.moneda !== invoice.moneda)
        throw new BadRequestException(
          'La moneda del pago debe coincidir con la moneda de la factura',
        );
      const balance = invoice.balancePendiente;
      const newBalance = balance.sub(amount);
      const claimed = await tx.facturaVenta.updateMany({
        where: {
          id: invoice.id,
          empresaId,
          balancePendiente: { gte: amount },
          estado: { not: 'ANULADA' },
        },
        data: {
          montoPagado: { increment: amount },
          balancePendiente: { decrement: amount },
          estado: newBalance.eq(0) ? 'PAGADA' : 'PARCIALMENTE_PAGADA',
        },
      });
      if (claimed.count !== 1)
        throw new BadRequestException(
          `El pago supera el balance pendiente de ${balance.toFixed(2)}`,
        );
      const payment = await tx.pagoCliente.create({
        data: {
          empresaId,
          clienteId: data.clienteId,
          moneda: data.moneda || invoice.moneda,
          monto: amount,
          tasaCambio: data.tasaCambio || 1,
          metodo: data.metodo || 'EFECTIVO',
          referencia: data.referencia || null,
          fechaPago: data.fechaPago ? new Date(data.fechaPago) : new Date(),
          usuarioId,
          notas: data.notas || null,
        },
      });
      await tx.aplicacionPago.create({
        data: { pagoId: payment.id, facturaId: invoice.id, monto: amount },
      });
      return payment;
    });
    await this.activity.log({
      empresaId,
      usuarioId,
      modulo: 'CUSTOMER_PAYMENTS',
      accion: 'CREATE',
      resourceId: result.id,
      resourceName: `Pago ${result.id}`,
      resourceType: 'PagoCliente',
      metadata: { facturaId: data.facturaId, monto: amount.toString() },
    });
    return result;
  }

  listForInvoice(empresaId: string, facturaId: string) {
    return this.prisma.aplicacionPago.findMany({
      where: { facturaId, factura: { empresaId } },
      include: { pago: true },
      orderBy: { creadoEn: 'desc' },
    });
  }
}
