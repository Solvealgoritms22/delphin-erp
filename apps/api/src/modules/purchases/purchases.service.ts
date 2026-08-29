import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  CreatePurchaseDto,
  PurchasePaymentType,
} from './dto/create-purchase.dto';
import { FilterPurchasesDto } from './dto/filter-purchases.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
  ) {}

  async create(empresaId: string, usuarioId: string, dto: CreatePurchaseDto) {
    // 1. Validar proveedor
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id: dto.proveedorId, empresaId },
    });
    if (!proveedor) {
      throw new NotFoundException('Proveedor no encontrado en esta empresa.');
    }

    // 2. Almacén de destino
    let almacenId = dto.almacenId;
    if (!almacenId) {
      const defaultAlmacen = await this.prisma.almacen.findFirst({
        where: { empresaId, estado: 'ACTIVO' },
        orderBy: [{ esPrincipal: 'desc' }, { creadoEn: 'asc' }],
      });
      almacenId = defaultAlmacen?.id;
    } else {
      const existAlmacen = await this.prisma.almacen.findFirst({
        where: { id: almacenId, empresaId },
      });
      if (!existAlmacen) {
        throw new NotFoundException('Almacén de destino no encontrado.');
      }
    }

    // 3. Validar items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La compra debe incluir al menos una línea de producto o gasto.');
    }

    // 4. Obtener productos para validación y snapshot
    const productIds = dto.items
      .map((i) => i.productoId)
      .filter((id): id is string => Boolean(id));

    const productosDb = productIds.length > 0
      ? await this.prisma.producto.findMany({
          where: { id: { in: productIds }, empresaId },
        })
      : [];

    const productMap = new Map(productosDb.map((p) => [p.id, p]));

    let subtotalAcc = new Prisma.Decimal(0);
    let descuentoLineasAcc = new Prisma.Decimal(0);
    let itbisAcc = new Prisma.Decimal(0);

    const calculatedItems = dto.items.map((item) => {
      const cantidad = new Prisma.Decimal(item.cantidad);
      const costoUnitario = new Prisma.Decimal(item.costoUnitario);
      const itemDescuento = new Prisma.Decimal(item.descuento || 0);
      const tasaItbis = new Prisma.Decimal(item.tasaItbis !== undefined ? item.tasaItbis : 18);

      const grossLine = cantidad.mul(costoUnitario);
      const netLine = grossLine.sub(itemDescuento);
      const itemItbis = netLine.mul(tasaItbis).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const itemTotal = netLine.add(itemItbis).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      subtotalAcc = subtotalAcc.add(grossLine);
      descuentoLineasAcc = descuentoLineasAcc.add(itemDescuento);
      itbisAcc = itbisAcc.add(itemItbis);

      let afectaInventario = item.afectaInventario ?? true;
      if (item.productoId) {
        const prod = productMap.get(item.productoId);
        if (prod && prod.tipo === 'SERVICIO') {
          afectaInventario = false;
        }
      } else {
        afectaInventario = false;
      }

      return {
        productoId: item.productoId || null,
        descripcion: item.descripcion,
        cantidad,
        costoUnitario,
        descuento: itemDescuento,
        tasaItbis,
        itbis: itemItbis,
        subtotal: netLine,
        total: itemTotal,
        afectaInventario,
      };
    });

    const globalDiscount = new Prisma.Decimal(dto.descuento || 0);
    const totalDescuento = descuentoLineasAcc.add(globalDiscount);
    const itbisRetenido = new Prisma.Decimal(dto.itbisRetenido || 0);
    const retencionRenta = new Prisma.Decimal(dto.retencionRenta || 0);

    const totalCompra = subtotalAcc
      .sub(totalDescuento)
      .add(itbisAcc)
      .sub(itbisRetenido)
      .sub(retencionRenta)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    if (totalCompra.lt(0)) {
      throw new BadRequestException('El total de la compra no puede ser negativo tras descuentos y retenciones.');
    }

    const esContado = dto.tipoPago === PurchasePaymentType.CONTADO;
    const montoPagado = esContado ? totalCompra : new Prisma.Decimal(0);
    const balancePendiente = esContado ? new Prisma.Decimal(0) : totalCompra;
    const estadoCompra = esContado ? 'PAGADA' : 'REGISTRADA';

    // 5. Transacción Atómica
    const compra = await this.prisma.$transaction(async (tx) => {
      const numeroFactura = dto.numeroFactura?.trim()
        ? dto.numeroFactura.trim()
        : await this.generateNextNumeroCompra(tx, empresaId);

      // Aumentar stock y actualizar Costo Promedio Ponderado para productos físicos
      for (const item of calculatedItems) {
        if (!item.afectaInventario || !item.productoId || !almacenId) continue;

        const prod = productMap.get(item.productoId);
        if (!prod) continue;

        const stockExistente = await tx.inventarioStock.findUnique({
          where: {
            productoId_almacenId: {
              productoId: item.productoId,
              almacenId,
            },
          },
        });

        let nuevoStock = item.cantidad;
        let nuevoCostoPromedio = item.costoUnitario;

        if (stockExistente) {
          const stockActual = new Prisma.Decimal(stockExistente.cantidad);
          const costoActual = stockExistente.costoPromedio !== null
            ? new Prisma.Decimal(stockExistente.costoPromedio)
            : new Prisma.Decimal(prod.costo || 0);

          nuevoStock = stockActual.add(item.cantidad);

          if (nuevoStock.gt(0)) {
            const valorActual = stockActual.gt(0) ? stockActual.mul(costoActual) : new Prisma.Decimal(0);
            const valorCompra = item.cantidad.mul(item.costoUnitario);
            nuevoCostoPromedio = valorActual.add(valorCompra).div(nuevoStock).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          }

          await tx.inventarioStock.update({
            where: { id: stockExistente.id },
            data: {
              cantidad: { increment: item.cantidad },
              costoPromedio: nuevoCostoPromedio,
            },
          });
        } else {
          await tx.inventarioStock.create({
            data: {
              empresaId,
              productoId: item.productoId,
              almacenId,
              cantidad: item.cantidad,
              costoPromedio: nuevoCostoPromedio,
            },
          });
        }

        // Actualizar el costo del producto maestro
        await tx.producto.update({
          where: { id: item.productoId },
          data: {
            costo: nuevoCostoPromedio,
          },
        });

        // Registrar en Kardex inmutable
        await tx.movimientoInventario.create({
          data: {
            empresaId,
            productoId: item.productoId,
            almacenDestinoId: almacenId,
            usuarioId,
            tipo: 'COMPRA',
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            referenciaDoc: `${numeroFactura}${dto.ncf ? ` (NCF: ${dto.ncf})` : ''}`,
            motivo: `Compra a Proveedor: ${proveedor.nombreRazonSocial}`,
          },
        });
      }

      // Crear registro de Factura de Compra
      const createdPurchase = await tx.facturaCompra.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId || null,
          almacenId: almacenId || null,
          proveedorId: dto.proveedorId,
          usuarioId,
          numeroFactura,
          ncf: dto.ncf || null,
          ncfModificado: dto.ncfModificado || null,
          tipoNcf: dto.tipoNcf || null,
          tipoGasto: dto.tipoGasto || '09', // Default 09: Compras y gastos costo de venta
          fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
          estado: estadoCompra,
          tipoPago: dto.tipoPago,
          metodoPago: dto.metodoPago || 'TRANSFERENCIA',
          subtotal: subtotalAcc,
          descuento: totalDescuento,
          itbis: itbisAcc,
          itbisRetenido,
          retencionRenta,
          total: totalCompra,
          montoPagado,
          balancePendiente,
          notas: dto.notas || null,
          detalles: {
            create: calculatedItems.map((det) => ({
              productoId: det.productoId,
              descripcion: det.descripcion,
              cantidad: det.cantidad,
              costoUnitario: det.costoUnitario,
              descuento: det.descuento,
              tasaItbis: det.tasaItbis,
              itbis: det.itbis,
              subtotal: det.subtotal,
              total: det.total,
              afectaInventario: det.afectaInventario,
            })),
          },
        },
        include: {
          proveedor: true,
          almacen: true,
          sucursal: true,
          detalles: {
            include: { producto: true },
          },
        },
      });

      // Si es al contado, registrar el pago automático
      if (esContado && totalCompra.gt(0)) {
        const pago = await tx.pagoProveedor.create({
          data: {
            empresaId,
            proveedorId: dto.proveedorId,
            usuarioId,
            monto: totalCompra,
            metodo: dto.metodoPago || 'TRANSFERENCIA',
            referencia: `Pago de Contado Factura ${numeroFactura}`,
            fechaPago: dto.fecha ? new Date(dto.fecha) : new Date(),
            estado: 'REGISTRADO',
            notas: 'Pago automático por compra al contado',
          },
        });

        await tx.aplicacionPagoProveedor.create({
          data: {
            pagoId: pago.id,
            facturaCompraId: createdPurchase.id,
            monto: totalCompra,
          },
        });
      }

      return createdPurchase;
    });

    // Registrar en Activity Log
    await this.activityLog.log({
      empresaId,
      usuarioId,
      modulo: 'purchases',
      accion: 'CREATE',
      resourceId: compra.id,
      resourceName: `${compra.numeroFactura} - ${proveedor.nombreRazonSocial}`,
      resourceType: 'Factura de Compra',
      metadata: {
        total: compra.total.toString(),
        ncf: compra.ncf,
        itemsCount: compra.detalles.length,
        tipoPago: compra.tipoPago,
      },
    });

    return compra;
  }

  async findAll(empresaId: string, filterDto: FilterPurchasesDto) {
    const where: Prisma.FacturaCompraWhereInput = { empresaId };

    if (filterDto.search) {
      const q = filterDto.search.trim();
      where.OR = [
        { numeroFactura: { contains: q, mode: 'insensitive' } },
        { ncf: { contains: q, mode: 'insensitive' } },
        { proveedor: { nombreRazonSocial: { contains: q, mode: 'insensitive' } } },
        { proveedor: { numeroDocumento: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (filterDto.proveedorId) {
      where.proveedorId = filterDto.proveedorId;
    }

    if (filterDto.estado && filterDto.estado !== 'ALL') {
      where.estado = filterDto.estado;
    }

    if (filterDto.tipoPago && filterDto.tipoPago !== 'ALL') {
      where.tipoPago = filterDto.tipoPago;
    }

    if (filterDto.desde || filterDto.hasta) {
      where.fecha = {};
      if (filterDto.desde) where.fecha.gte = new Date(filterDto.desde);
      if (filterDto.hasta) {
        const hastaDate = new Date(filterDto.hasta);
        hastaDate.setHours(23, 59, 59, 999);
        where.fecha.lte = hastaDate;
      }
    }

    const page = Math.max(1, filterDto.page ?? 1);
    const limit = Math.min(100, Math.max(1, filterDto.limit ?? 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.facturaCompra.findMany({
        where,
        include: {
          proveedor: true,
          almacen: true,
          sucursal: true,
          detalles: {
            include: { producto: true },
          },
          pagosAplicados: {
            include: { pago: true },
          },
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.facturaCompra.count({ where }),
    ]);

    // Calcular estadísticas globales del mes
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [statsMes, statsCxP, statsVencidas] = await Promise.all([
      this.prisma.facturaCompra.aggregate({
        where: {
          empresaId,
          estado: { not: 'ANULADA' },
          fecha: { gte: startOfMonth },
        },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.facturaCompra.aggregate({
        where: {
          empresaId,
          estado: { in: ['REGISTRADA', 'PAGADA_PARCIAL'] },
        },
        _sum: { balancePendiente: true },
        _count: { id: true },
      }),
      this.prisma.facturaCompra.aggregate({
        where: {
          empresaId,
          estado: { in: ['REGISTRADA', 'PAGADA_PARCIAL'] },
          fechaVencimiento: { lt: now },
        },
        _sum: { balancePendiente: true },
        _count: { id: true },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      metrics: {
        totalComprasMes: statsMes._sum.total ? Number(statsMes._sum.total) : 0,
        cantidadComprasMes: statsMes._count.id,
        totalCxPPendiente: statsCxP._sum.balancePendiente ? Number(statsCxP._sum.balancePendiente) : 0,
        facturasPendientesCount: statsCxP._count.id,
        totalVencido: statsVencidas._sum.balancePendiente ? Number(statsVencidas._sum.balancePendiente) : 0,
        facturasVencidasCount: statsVencidas._count.id,
      },
    };
  }

  async findOne(empresaId: string, id: string) {
    const compra = await this.prisma.facturaCompra.findFirst({
      where: { id, empresaId },
      include: {
        proveedor: true,
        almacen: true,
        sucursal: true,
        usuario: { select: { id: true, email: true, nombre: true } },
        detalles: {
          include: { producto: true },
        },
        pagosAplicados: {
          include: { pago: true },
        },
      },
    });

    if (!compra) {
      throw new NotFoundException('Factura de compra no encontrada.');
    }

    return compra;
  }

  async registerPayment(
    empresaId: string,
    usuarioId: string,
    compraId: string,
    dto: CreateSupplierPaymentDto,
  ) {
    const compra = await this.findOne(empresaId, compraId);

    if (compra.estado === 'ANULADA') {
      throw new BadRequestException('No se pueden registrar pagos a una compra anulada.');
    }

    if (new Prisma.Decimal(compra.balancePendiente).lte(0)) {
      throw new BadRequestException('Esta factura de compra ya se encuentra completamente pagada.');
    }

    const montoPago = new Prisma.Decimal(dto.monto);
    if (montoPago.gt(compra.balancePendiente)) {
      throw new BadRequestException(
        `El monto a pagar (RD$ ${montoPago}) no puede ser mayor al balance pendiente (RD$ ${compra.balancePendiente}).`,
      );
    }

    const nuevoBalance = new Prisma.Decimal(compra.balancePendiente).sub(montoPago);
    const nuevoMontoPagado = new Prisma.Decimal(compra.montoPagado).add(montoPago);
    const nuevoEstado = nuevoBalance.lte(0) ? 'PAGADA' : 'PAGADA_PARCIAL';

    const result = await this.prisma.$transaction(async (tx) => {
      const pago = await tx.pagoProveedor.create({
        data: {
          empresaId,
          proveedorId: compra.proveedorId,
          usuarioId,
          monto: montoPago,
          metodo: dto.metodo,
          referencia: dto.referencia || null,
          fechaPago: dto.fechaPago ? new Date(dto.fechaPago) : new Date(),
          estado: 'REGISTRADO',
          notas: dto.notas || null,
        },
      });

      await tx.aplicacionPagoProveedor.create({
        data: {
          pagoId: pago.id,
          facturaCompraId: compra.id,
          monto: montoPago,
        },
      });

      const updatedPurchase = await tx.facturaCompra.update({
        where: { id: compra.id },
        data: {
          montoPagado: nuevoMontoPagado,
          balancePendiente: nuevoBalance,
          estado: nuevoEstado,
        },
        include: {
          proveedor: true,
          almacen: true,
          detalles: true,
          pagosAplicados: {
            include: { pago: true },
          },
        },
      });

      return { pago, updatedPurchase };
    });

    await this.activityLog.log({
      empresaId,
      usuarioId,
      modulo: 'purchases',
      accion: 'PAYMENT',
      resourceId: compra.id,
      resourceName: `${compra.numeroFactura} - Abono RD$ ${montoPago}`,
      resourceType: 'Pago a Proveedor',
      metadata: {
        monto: montoPago.toString(),
        metodo: dto.metodo,
        referencia: dto.referencia,
        nuevoBalance: nuevoBalance.toString(),
      },
    });

    return result;
  }

  async cancel(empresaId: string, usuarioId: string, id: string, motivo?: string) {
    const compra = await this.findOne(empresaId, id);

    if (compra.estado === 'ANULADA') {
      throw new BadRequestException('Esta compra ya ha sido anulada previamente.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Revertir inventario si afectó almacén
      if (compra.almacenId) {
        for (const det of compra.detalles) {
          if (!det.afectaInventario || !det.productoId) continue;

          const stock = await tx.inventarioStock.findUnique({
            where: {
              productoId_almacenId: {
                productoId: det.productoId,
                almacenId: compra.almacenId,
              },
            },
          });

          if (stock) {
            await tx.inventarioStock.update({
              where: { id: stock.id },
              data: {
                cantidad: { decrement: det.cantidad },
              },
            });
          }

          // Kardex de anulación de compra
          await tx.movimientoInventario.create({
            data: {
              empresaId,
              productoId: det.productoId,
              almacenOrigenId: compra.almacenId,
              usuarioId,
              tipo: 'AJUSTE_NEGATIVO',
              cantidad: det.cantidad,
              referenciaDoc: `ANULACIÓN ${compra.numeroFactura}`,
              motivo: `Anulación de factura de compra ${compra.numeroFactura}${motivo ? `: ${motivo}` : ''}`,
            },
          });
        }
      }

      return tx.facturaCompra.update({
        where: { id },
        data: {
          estado: 'ANULADA',
          balancePendiente: 0,
        },
      });
    });

    await this.activityLog.log({
      empresaId,
      usuarioId,
      modulo: 'purchases',
      accion: 'CANCEL',
      resourceId: id,
      resourceName: `${compra.numeroFactura}`,
      resourceType: 'Factura de Compra',
      metadata: { motivo },
    });

    return updated;
  }

  private async generateNextNumeroCompra(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ): Promise<string> {
    const prefix = 'COM';
    const last = await tx.facturaCompra.findFirst({
      where: {
        empresaId,
        numeroFactura: { startsWith: `${prefix}-` },
      },
      orderBy: { creadoEn: 'desc' },
      select: { numeroFactura: true },
    });

    let nextNum = 1;
    if (last?.numeroFactura) {
      const match = last.numeroFactura.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      } else {
        const count = await tx.facturaCompra.count({
          where: {
            empresaId,
            numeroFactura: { startsWith: `${prefix}-` },
          },
        });
        nextNum = count + 1;
      }
    }

    let numero = `${prefix}-${String(nextNum).padStart(6, '0')}`;
    while (
      await tx.facturaCompra.findUnique({
        where: {
          empresaId_numeroFactura: { empresaId, numeroFactura: numero },
        },
      })
    ) {
      nextNum++;
      numero = `${prefix}-${String(nextNum).padStart(6, '0')}`;
    }

    return numero;
  }
}
