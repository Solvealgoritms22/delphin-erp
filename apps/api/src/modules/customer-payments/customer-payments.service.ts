import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateCustomerPaymentDto,
  PaymentApplicationDto,
} from './dto/create-customer-payment.dto';
import { FilterCustomerPaymentsDto } from './dto/filter-customer-payments.dto';

@Injectable()
export class CustomerPaymentsService {
  private readonly logger = new Logger(CustomerPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /**
   * Genera el siguiente correlativo secuencial de recibo de cobro (REC-000001)
   */
  private async generateReceiptNumber(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ): Promise<string> {
    const lastPayment = await tx.pagoCliente.findFirst({
      where: {
        empresaId,
        numeroRecibo: { startsWith: 'REC-' },
      },
      orderBy: { creadoEn: 'desc' },
      select: { numeroRecibo: true },
    });

    let nextNumber = 1;
    if (lastPayment?.numeroRecibo) {
      const match = lastPayment.numeroRecibo.match(/REC-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `REC-${nextNumber.toString().padStart(6, '0')}`;
  }

  /**
   * Registra un recibo de cobro con aplicación a una o múltiples facturas en transacción atómica
   */
  async create(
    empresaId: string,
    usuarioId: string,
    dto: CreateCustomerPaymentDto,
  ) {
    if (!empresaId || !dto.clienteId) {
      throw new BadRequestException('Empresa y cliente son requeridos.');
    }

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: dto.clienteId, empresaId },
    });
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado para la empresa.');
    }

    // Normalizar aplicaciones
    let apps: PaymentApplicationDto[] = [];
    if (dto.aplicaciones && dto.aplicaciones.length > 0) {
      apps = dto.aplicaciones;
    } else if (dto.facturaId && dto.monto && Number(dto.monto) > 0) {
      apps = [{ facturaId: dto.facturaId, monto: Number(dto.monto) }];
    } else {
      throw new BadRequestException(
        'Debe especificar al menos una factura y monto a cobrar.',
      );
    }

    const totalCalculado = apps.reduce((acc, a) => acc + Number(a.monto), 0);
    if (totalCalculado <= 0) {
      throw new BadRequestException(
        'El monto total del cobro debe ser mayor a cero.',
      );
    }

    const montoFinal = new Prisma.Decimal(dto.monto ? dto.monto : totalCalculado);

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Validar cada factura y su saldo pendiente
      for (const app of apps) {
        const inv = await tx.facturaVenta.findFirst({
          where: {
            id: app.facturaId,
            empresaId,
            clienteId: dto.clienteId,
          },
          select: {
            id: true,
            numeroFactura: true,
            balancePendiente: true,
            estado: true,
          },
        });

        if (!inv) {
          throw new NotFoundException(
            `Factura ${app.facturaId} no encontrada para este cliente.`,
          );
        }

        if (inv.estado === 'ANULADA') {
          throw new BadRequestException(
            `La factura ${inv.numeroFactura} está anulada y no acepta pagos.`,
          );
        }

        const appMontoDec = new Prisma.Decimal(app.monto);
        if (appMontoDec.gt(inv.balancePendiente)) {
          throw new BadRequestException(
            `El abono de RD$ ${appMontoDec.toFixed(2)} supera el balance pendiente de RD$ ${inv.balancePendiente.toFixed(2)} en la factura ${inv.numeroFactura}.`,
          );
        }
      }

      // 2. Generar número de recibo correlativo
      const numeroRecibo = await this.generateReceiptNumber(tx, empresaId);

      // 3. Crear cabecera del recibo de cobro
      const payment = await tx.pagoCliente.create({
        data: {
          empresaId,
          numeroRecibo,
          clienteId: dto.clienteId,
          moneda: dto.moneda || 'DOP',
          monto: montoFinal,
          tasaCambio: dto.tasaCambio ? new Prisma.Decimal(dto.tasaCambio) : 1,
          metodo: dto.metodo || 'EFECTIVO',
          referencia: dto.referencia?.trim() || null,
          fechaPago: dto.fechaPago ? new Date(dto.fechaPago) : new Date(),
          estado: 'REGISTRADO',
          usuarioId,
          notas: dto.notas?.trim() || null,
        },
      });

      // 4. Aplicar a cada factura
      for (const app of apps) {
        const appMontoDec = new Prisma.Decimal(app.monto);

        // Crear registro de aplicación
        await tx.aplicacionPago.create({
          data: {
            pagoId: payment.id,
            facturaId: app.facturaId,
            monto: appMontoDec,
          },
        });

        // Actualizar factura
        const invUpdated = await tx.facturaVenta.update({
          where: { id: app.facturaId },
          data: {
            montoPagado: { increment: appMontoDec },
            balancePendiente: { decrement: appMontoDec },
          },
        });

        // Transicionar estado de factura
        const newStatus = invUpdated.balancePendiente.eq(0)
          ? 'PAGADA'
          : 'PARCIALMENTE_PAGADA';

        await tx.facturaVenta.update({
          where: { id: app.facturaId },
          data: { estado: newStatus },
        });
      }

      return payment;
    });

    // Auditoría
    await this.activity.log({
      empresaId,
      usuarioId,
      modulo: 'commercial',
      accion: 'CREATE',
      resourceId: result.id,
      resourceName: `Recibo de Cobro ${result.numeroRecibo || result.id}`,
      resourceType: 'PagoCliente',
      metadata: {
        numeroRecibo: result.numeroRecibo,
        cliente: cliente.nombreRazonSocial,
        monto: montoFinal.toString(),
        metodo: dto.metodo,
      },
    });

    if (this.notifications) {
      await this.notifications.create({
        empresaId,
        tipo: 'PAYMENT_RECEIVED',
        titulo: 'Cobro de Cliente Registrado',
        mensaje: `Cobro de ${Number(montoFinal).toLocaleString('es-DO', { style: 'currency', currency: result.moneda || 'DOP' })} (${result.numeroRecibo || 'Recibo'}) recibido de ${cliente.nombreRazonSocial}.`,
        severidad: 'SUCCESS',
        icono: 'dollar-sign',
        payload: {
          pagoId: result.id,
          numeroRecibo: result.numeroRecibo,
          monto: Number(montoFinal),
          cliente: cliente.nombreRazonSocial,
        },
        canales: ['IN_APP'],
      });
    }

    return this.findOne(empresaId, result.id);
  }

  /**
   * Listado con filtros, paginación y ordenamiento
   */
  async findAll(empresaId: string, filterDto: FilterCustomerPaymentsDto) {
    const {
      search,
      clienteId,
      metodo,
      estado,
      desde,
      hasta,
      page = 1,
      limit = 25,
    } = filterDto;

    const where: Prisma.PagoClienteWhereInput = {
      empresaId,
    };

    if (clienteId && clienteId !== 'ALL') {
      where.clienteId = clienteId;
    }

    if (metodo && metodo !== 'ALL') {
      where.metodo = metodo;
    }

    if (estado && estado !== 'ALL') {
      where.estado = estado;
    }

    if (desde || hasta) {
      where.fechaPago = {};
      if (desde) {
        where.fechaPago.gte = new Date(`${desde}T00:00:00.000Z`);
      }
      if (hasta) {
        where.fechaPago.lte = new Date(`${hasta}T23:59:59.999Z`);
      }
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { numeroRecibo: { contains: q, mode: 'insensitive' } },
        { referencia: { contains: q, mode: 'insensitive' } },
        {
          cliente: {
            nombreRazonSocial: { contains: q, mode: 'insensitive' },
          },
        },
        {
          cliente: {
            numeroDocumento: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [total, data] = await Promise.all([
      this.prisma.pagoCliente.count({ where }),
      this.prisma.pagoCliente.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              nombreRazonSocial: true,
              numeroDocumento: true,
              telefono: true,
              email: true,
            },
          },
          usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
          aplicaciones: {
            include: {
              factura: {
                select: {
                  id: true,
                  numeroFactura: true,
                  ncf: true,
                  total: true,
                  balancePendiente: true,
                },
              },
            },
          },
        },
        orderBy: { fechaPago: 'desc' },
        skip,
        take,
      }),
    ]);

    return {
      data,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / take) || 1,
    };
  }

  /**
   * Obtiene un recibo de cobro con todos sus detalles y aplicaciones
   */
  async findOne(empresaId: string, id: string) {
    const payment = await this.prisma.pagoCliente.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        aplicaciones: {
          include: {
            factura: {
              select: {
                id: true,
                numeroFactura: true,
                ncf: true,
                fecha: true,
                fechaVencimiento: true,
                total: true,
                montoPagado: true,
                balancePendiente: true,
                estado: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Recibo de cobro no encontrado.');
    }

    return payment;
  }

  /**
   * Métricas y KPIs de cuentas por cobrar (CxC) en tiempo real
   */
  async getMetrics(empresaId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      cxcAgg,
      vencidoAgg,
      cobradoMesAgg,
      distinctClientsWithBalance,
      allPaymentsCount,
    ] = await Promise.all([
      // Total por cobrar y facturas con balance
      this.prisma.facturaVenta.aggregate({
        where: {
          empresaId,
          estado: { not: 'ANULADA' },
          balancePendiente: { gt: 0 },
        },
        _sum: { balancePendiente: true },
        _count: { id: true },
      }),
      // Total vencido (fechaVencimiento < now)
      this.prisma.facturaVenta.aggregate({
        where: {
          empresaId,
          estado: { not: 'ANULADA' },
          balancePendiente: { gt: 0 },
          fechaVencimiento: { lt: now },
        },
        _sum: { balancePendiente: true },
        _count: { id: true },
      }),
      // Cobrado en el mes actual
      this.prisma.pagoCliente.aggregate({
        where: {
          empresaId,
          estado: 'REGISTRADO',
          fechaPago: { gte: startOfMonth },
        },
        _sum: { monto: true },
        _count: { id: true },
      }),
      // Clientes distintos con saldo pendiente
      this.prisma.facturaVenta.groupBy({
        by: ['clienteId'],
        where: {
          empresaId,
          estado: { not: 'ANULADA' },
          balancePendiente: { gt: 0 },
          clienteId: { not: null },
        },
      }),
      // Total de cobros históricos
      this.prisma.pagoCliente.count({
        where: { empresaId },
      }),
    ]);

    return {
      totalPorCobrar: Number(cxcAgg._sum.balancePendiente || 0),
      facturasPendientesCount: cxcAgg._count.id || 0,
      totalVencido: Number(vencidoAgg._sum.balancePendiente || 0),
      facturasVencidasCount: vencidoAgg._count.id || 0,
      cobradoMes: Number(cobradoMesAgg._sum.monto || 0),
      cobrosMesCount: cobradoMesAgg._count.id || 0,
      clientesConSaldoCount: distinctClientsWithBalance.length,
      totalCobrosHistoricos: allPaymentsCount,
    };
  }

  /**
   * Obtiene todas las facturas de venta con saldo pendiente por cobrar
   */
  async getPendingInvoices(empresaId: string, clienteId?: string) {
    const where: Prisma.FacturaVentaWhereInput = {
      empresaId,
      estado: { not: 'ANULADA' },
      balancePendiente: { gt: 0 },
    };

    if (clienteId && clienteId !== 'ALL') {
      where.clienteId = clienteId;
    }

    const invoices = await this.prisma.facturaVenta.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombreRazonSocial: true,
            numeroDocumento: true,
            telefono: true,
            email: true,
          },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    const now = new Date();
    return invoices.map((inv) => {
      let diasVencido = 0;
      let enMora = false;

      if (inv.fechaVencimiento) {
        const due = new Date(inv.fechaVencimiento);
        if (due < now) {
          enMora = true;
          diasVencido = Math.floor(
            (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
          );
        }
      }

      return {
        ...inv,
        diasVencido,
        enMora,
      };
    });
  }

  /**
   * Anula un recibo de cobro y restituye los balances en las facturas involucradas
   */
  async cancel(empresaId: string, usuarioId: string, id: string) {
    const payment = await this.prisma.pagoCliente.findFirst({
      where: { id, empresaId },
      include: { aplicaciones: true, cliente: true },
    });

    if (!payment) {
      throw new NotFoundException('Recibo de cobro no encontrado.');
    }

    if (payment.estado === 'ANULADO') {
      throw new BadRequestException('El recibo ya se encuentra anulado.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Revertir cada aplicación
      for (const app of payment.aplicaciones) {
        const inv = await tx.facturaVenta.findUnique({
          where: { id: app.facturaId },
        });

        if (inv) {
          const newMontoPagado = Prisma.Decimal.max(
            0,
            inv.montoPagado.sub(app.monto),
          );
          const newBalancePendiente = inv.balancePendiente.add(app.monto);
          const newStatus = newBalancePendiente.gte(inv.total)
            ? 'EMITIDA'
            : 'PARCIALMENTE_PAGADA';

          await tx.facturaVenta.update({
            where: { id: inv.id },
            data: {
              montoPagado: newMontoPagado,
              balancePendiente: newBalancePendiente,
              estado: newStatus,
            },
          });
        }
      }

      // Marcar recibo como anulado
      return tx.pagoCliente.update({
        where: { id: payment.id },
        data: { estado: 'ANULADO' },
      });
    });

    // Auditoría
    await this.activity.log({
      empresaId,
      usuarioId,
      modulo: 'commercial',
      accion: 'DELETE',
      resourceId: payment.id,
      resourceName: `Recibo de Cobro ${payment.numeroRecibo || payment.id}`,
      resourceType: 'PagoCliente',
      metadata: {
        motivo: 'Anulación de recibo de cobro y reversión de saldos en facturas',
        montoRevertido: payment.monto.toString(),
      },
    });

    return result;
  }
}
