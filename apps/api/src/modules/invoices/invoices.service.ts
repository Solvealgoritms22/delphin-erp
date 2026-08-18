import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalBridgeService } from './fiscalbridge.service';
import { BillingConfigService } from '../billing-config/billing-config.service';
import { CreateInvoiceDto, FilterInvoiceDto } from './dto/invoice.dto';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

interface CalculatedItem {
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  tasaItbis: Prisma.Decimal;
  itbis: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  impuestoId?: string;
  indicadorFacturacion: string;
  afectaInventario: boolean;
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sequencesService: SequencesService,
    private readonly fiscalBridgeService: FiscalBridgeService,
    private readonly billingConfig: BillingConfigService,
  ) {}

  async create(empresaId: string, usuarioId: string, dto: CreateInvoiceDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'La factura debe tener al menos un producto.',
      );
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }
    const billing = await this.billingConfig.get(empresaId);
    const configuration = billing.configuracion;
    const currency = (
      dto.moneda ||
      configuration.monedaBase ||
      'DOP'
    ).toUpperCase();
    const exchangeRate = new Prisma.Decimal(dto.tasaCambio || 1);
    const selectedTerm = dto.terminoPagoId
      ? billing.terminosPago.find((term) => term.id === dto.terminoPagoId)
      : billing.terminosPago.find(
          (term) =>
            term.codigo ===
            (dto.tipoPago === 'CREDITO' ? 'CREDITO30' : 'CONTADO'),
        );
    if (dto.terminoPagoId && !selectedTerm)
      throw new BadRequestException(
        'El término de pago no pertenece a la empresa.',
      );

    // Determinar Almacén
    let almacenId = dto.almacenId;
    if (!almacenId) {
      const defaultAlmacen = await this.prisma.almacen.findFirst({
        where: { empresaId, estado: 'ACTIVO' },
        orderBy: { esPrincipal: 'desc' },
      });
      if (!defaultAlmacen) {
        throw new BadRequestException(
          'No hay almacenes configurados en la empresa para despachar el producto.',
        );
      }
      almacenId = defaultAlmacen.id;
    }

    const almacen = await this.prisma.almacen.findFirst({
      where: { id: almacenId, empresaId, estado: 'ACTIVO' },
    });
    if (!almacen)
      throw new BadRequestException(
        'El almacén no pertenece a la empresa o no está activo.',
      );
    if (
      dto.sucursalId &&
      !(await this.prisma.sucursal.findFirst({
        where: { id: dto.sucursalId, empresaId },
      }))
    )
      throw new BadRequestException('La sucursal no pertenece a la empresa.');
    if (
      dto.clienteId &&
      !(await this.prisma.cliente.findFirst({
        where: { id: dto.clienteId, empresaId },
      }))
    )
      throw new BadRequestException('El cliente no pertenece a la empresa.');

    // Reservar NCF
    const ambiente = empresa.fiscalbridgeEnv || 'TEST';
    const { ncf } = await this.sequencesService.getNextNCF(
      empresaId,
      dto.tipoNcf,
      ambiente,
    );

    // Calcular secuencial interno de factura
    const numeroFactura = `FAC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Calcular Subtotal, ITBIS y Total
    let subtotalAcc = new Prisma.Decimal(0);
    let itbisAcc = new Prisma.Decimal(0);

    const calculatedItems: CalculatedItem[] = [];

    for (const item of dto.items) {
      const producto = await this.prisma.producto.findFirst({
        where: { id: item.productoId, empresaId },
        include: { impuesto: true },
      });
      if (!producto) {
        throw new NotFoundException(
          `Producto con ID ${item.productoId} no existe en esta empresa.`,
        );
      }

      const cantidad = new Prisma.Decimal(item.cantidad);
      const precio = new Prisma.Decimal(item.precioUnitario);
      const configuredTax = item.impuestoId
        ? billing.impuestos.find((tax) => tax.id === item.impuestoId)
        : producto.impuesto?.empresaId === empresaId
          ? producto.impuesto
          : billing.impuestos.find((tax) => tax.codigo === 'ITBIS18');
      if (item.impuestoId && !configuredTax)
        throw new BadRequestException('El impuesto no pertenece a la empresa.');
      const tasaItbis = new Prisma.Decimal(
        item.tasaItbis ?? configuredTax?.tasa ?? producto.taxRate ?? 0,
      );
      if (tasaItbis.lt(0) || tasaItbis.gt(100))
        throw new BadRequestException(
          'La tasa de impuesto debe estar entre 0 y 100.',
        );

      const itemSubtotal = cantidad.mul(precio);
      const itemItbis = itemSubtotal
        .mul(tasaItbis)
        .div(100)
        .toDecimalPlaces(
          configuration.precisionMoneda,
          Prisma.Decimal.ROUND_HALF_UP,
        );
      const itemTotal = itemSubtotal
        .add(itemItbis)
        .toDecimalPlaces(
          configuration.precisionMoneda,
          Prisma.Decimal.ROUND_HALF_UP,
        );

      subtotalAcc = subtotalAcc.add(itemSubtotal);
      itbisAcc = itbisAcc.add(itemItbis);

      calculatedItems.push({
        productoId: item.productoId,
        cantidad,
        precioUnitario: precio,
        tasaItbis,
        itbis: itemItbis,
        subtotal: itemSubtotal,
        total: itemTotal,
        impuestoId: item.impuestoId || configuredTax?.id,
        indicadorFacturacion:
          configuredTax?.indicadorFacturacion || (tasaItbis.eq(0) ? '2' : '1'),
        afectaInventario: producto.tipo !== 'SERVICIO',
      });
    }

    const discount = new Prisma.Decimal(dto.descuento || 0);
    if (discount.lt(0) || discount.gt(subtotalAcc))
      throw new BadRequestException(
        'El descuento no puede superar el subtotal.',
      );
    const totalAfterDiscount = subtotalAcc
      .sub(discount)
      .add(itbisAcc)
      .toDecimalPlaces(
        configuration.precisionMoneda,
        Prisma.Decimal.ROUND_HALF_UP,
      );

    // Transacción de creación de factura y descuento de inventario
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Descontar inventario
      for (const item of calculatedItems) {
        if (!item.afectaInventario) continue;
        const stock = await tx.inventarioStock.findUnique({
          where: {
            productoId_almacenId: {
              productoId: item.productoId,
              almacenId: almacenId,
            },
          },
        });

        if (stock) {
          const changed = await tx.inventarioStock.updateMany({
            where: {
              id: stock.id,
              empresaId,
              cantidad: { gte: item.cantidad },
            },
            data: { cantidad: { decrement: item.cantidad } },
          });
          if (changed.count !== 1)
            throw new BadRequestException(
              `Stock insuficiente para el producto ${item.productoId}.`,
            );
        } else {
          throw new BadRequestException(
            `No existe inventario para el producto ${item.productoId}.`,
          );
        }

        // Registrar en Kardex
        await tx.movimientoInventario.create({
          data: {
            empresaId,
            productoId: item.productoId,
            almacenOrigenId: almacenId,
            usuarioId,
            tipo: 'VENTA',
            cantidad: item.cantidad,
            referenciaDoc: `${numeroFactura} (${ncf})`,
            motivo: `Facturación de Venta - NCF: ${ncf}`,
          },
        });
      }

      // Crear Factura
      const created = await tx.facturaVenta.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId,
          almacenId,
          clienteId: dto.clienteId,
          usuarioId,
          numeroFactura,
          ncf,
          tipoNcf: dto.tipoNcf,
          estado: 'EMITIDA',
          tipoPago: dto.tipoPago || 'CONTADO',
          metodoPago: dto.metodoPago || 'EFECTIVO',
          subtotal: subtotalAcc,
          descuento: discount,
          itbis: itbisAcc,
          total: totalAfterDiscount,
          moneda: currency,
          tasaCambio: exchangeRate,
          monedaBase: configuration.monedaBase,
          redondeoAjuste: new Prisma.Decimal(0),
          terminoPagoId: selectedTerm?.id,
          fechaVencimiento: dto.fechaVencimiento
            ? new Date(dto.fechaVencimiento)
            : selectedTerm && selectedTerm.diasCredito > 0
              ? new Date(Date.now() + selectedTerm.diasCredito * 86400000)
              : null,
          montoPagado: new Prisma.Decimal(0),
          balancePendiente: totalAfterDiscount,
          ncfModificado: dto.ncfModificado,
          motivoModificacion: dto.motivoModificacion,
          notas: dto.notas,
          detalles: {
            create: calculatedItems.map((item) => ({
              productoId: item.productoId,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              tasaItbis: item.tasaItbis,
              itbis: item.itbis,
              subtotal: item.subtotal,
              total: item.total,
              impuestoId: item.impuestoId,
              indicadorFacturacion: item.indicadorFacturacion,
            })),
          },
        },
        include: {
          cliente: true,
          almacen: true,
          sucursal: true,
          detalles: { include: { producto: true } },
        },
      });
      const taxLines = calculatedItems
        .map((item, index) =>
          item.impuestoId && created.detalles[index]
            ? {
                facturaId: created.id,
                detalleId: created.detalles[index]?.id,
                impuestoId: item.impuestoId,
                baseImponible: item.subtotal,
                tasa: item.tasaItbis,
                monto: item.itbis,
                indicadorFacturacion: item.indicadorFacturacion,
              }
            : null,
        )
        .filter((line): line is NonNullable<typeof line> => Boolean(line));
      if (taxLines.length)
        await tx.impuestoFactura.createMany({ data: taxLines });
      return created;
    });

    // Transmitir a FiscalBridge si está habilitado y es comprobante electrónico
    if (
      empresa.fiscalbridgeEnabled &&
      dto.tipoNcf.toUpperCase().startsWith('E')
    ) {
      try {
        const fbResult = await this.fiscalBridgeService.transmitInvoice(
          invoice,
          empresa,
        );
        const updated = await this.prisma.facturaVenta.update({
          where: { id: invoice.id },
          data: {
            fiscalbridgeStatus: fbResult.status || 'SENT',
            fiscalbridgeDocId: fbResult.documentUuid,
            fiscalbridgeTrackId: fbResult.trackId,
            fiscalbridgeSecurityCode: fbResult.securityCode,
            fiscalbridgeQrUrl: fbResult.qrUrl,
            fiscalbridgeSignDate: new Date(),
          },
          include: {
            cliente: true,
            almacen: true,
            sucursal: true,
            detalles: { include: { producto: true } },
          },
        });
        return updated;
      } catch (err: any) {
        this.logger.error(`Error al transmitir a FiscalBridge: ${err.message}`);
        await this.prisma.facturaVenta.update({
          where: { id: invoice.id },
          data: {
            fiscalbridgeStatus: 'FAILED',
            fiscalbridgeError: err.message,
          },
        });
      }
    }

    return invoice;
  }

  async findAll(empresaId: string, filterDto?: FilterInvoiceDto) {
    const where: Prisma.FacturaVentaWhereInput = { empresaId };

    if (filterDto?.search) {
      where.OR = [
        { numeroFactura: { contains: filterDto.search, mode: 'insensitive' } },
        { ncf: { contains: filterDto.search, mode: 'insensitive' } },
        {
          cliente: {
            nombreRazonSocial: {
              contains: filterDto.search,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (filterDto?.clienteId) where.clienteId = filterDto.clienteId;
    if (filterDto?.estado) where.estado = filterDto.estado;
    if (filterDto?.tipoNcf) where.tipoNcf = filterDto.tipoNcf;
    if (filterDto?.fiscalbridgeStatus)
      where.fiscalbridgeStatus = filterDto.fiscalbridgeStatus;

    if (filterDto?.desde || filterDto?.hasta) {
      where.fecha = {};
      if (filterDto.desde) where.fecha.gte = new Date(filterDto.desde);
      if (filterDto.hasta) where.fecha.lte = new Date(filterDto.hasta);
    }

    return this.prisma.facturaVenta.findMany({
      where,
      include: {
        cliente: true,
        almacen: true,
        sucursal: true,
        detalles: { include: { producto: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const invoice = await this.prisma.facturaVenta.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        almacen: true,
        sucursal: true,
        usuario: { select: { id: true, email: true, nombre: true } },
        detalles: { include: { producto: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Factura no encontrada.');
    }
    return invoice;
  }

  async sendToFiscalBridge(empresaId: string, id: string) {
    const invoice = await this.findOne(empresaId, id);
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    if (!invoice.tipoNcf?.toUpperCase().startsWith('E')) {
      throw new BadRequestException(
        'Esta factura tiene NCF tradicional y no es un e-CF electrónico.',
      );
    }

    if (
      invoice.fiscalbridgeStatus === 'SENT' ||
      invoice.fiscalbridgeStatus === 'ACCEPTED'
    )
      throw new BadRequestException(
        'La factura ya fue transmitida a FiscalBridge.',
      );
    const fbResult = await this.fiscalBridgeService.transmitInvoice(
      invoice,
      empresa,
    );

    return this.prisma.facturaVenta.update({
      where: { id, empresaId },
      data: {
        fiscalbridgeStatus: fbResult.status || 'SENT',
        fiscalbridgeDocId: fbResult.documentUuid,
        fiscalbridgeTrackId: fbResult.trackId,
        fiscalbridgeSecurityCode: fbResult.securityCode,
        fiscalbridgeQrUrl: fbResult.qrUrl,
        fiscalbridgeSignDate: new Date(),
        fiscalbridgeError: null,
      },
      include: {
        cliente: true,
        almacen: true,
        sucursal: true,
        detalles: { include: { producto: true } },
      },
    });
  }

  async proxyPdf(empresaId: string, id: string, res: Response) {
    const invoice = await this.findOne(empresaId, id);
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!invoice.fiscalbridgeDocId) {
      throw new BadRequestException(
        'La factura no tiene un documento emitido en FiscalBridge para descargar PDF.',
      );
    }

    const pdfBuffer = await this.fiscalBridgeService.getPdfBuffer(
      invoice.fiscalbridgeDocId,
      empresa,
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.ncf || invoice.numeroFactura}.pdf"`,
    );
    res.end(pdfBuffer);
  }

  async proxyXml(empresaId: string, id: string, res: Response) {
    const invoice = await this.findOne(empresaId, id);
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });

    if (!invoice.fiscalbridgeDocId) {
      throw new BadRequestException(
        'La factura no tiene un documento emitido en FiscalBridge para descargar XML.',
      );
    }

    const xmlBuffer = await this.fiscalBridgeService.getXmlBuffer(
      invoice.fiscalbridgeDocId,
      empresa,
    );

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoice.ncf || invoice.numeroFactura}.xml"`,
    );
    res.end(xmlBuffer);
  }

  async cancel(empresaId: string, usuarioId: string, id: string) {
    const invoice = await this.findOne(empresaId, id);

    if (invoice.estado === 'ANULADA') {
      throw new BadRequestException('Esta factura ya ha sido anulada.');
    }

    if (invoice.fiscalbridgeDocId) {
      throw new BadRequestException(
        'Esta factura ya fue transmitida y validada por la DGII en FiscalBridge. Para anular sus efectos fiscales debe emitir una Nota de Crédito (E34).',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.facturaVenta.updateMany({
        where: { id, empresaId, estado: { not: 'ANULADA' } },
        data: { estado: 'ANULADA', balancePendiente: new Prisma.Decimal(0) },
      });
      if (claimed.count !== 1)
        throw new BadRequestException(
          'La factura ya ha sido anulada o no pertenece a la empresa.',
        );
      // Restaurar stock
      for (const det of invoice.detalles) {
        if (det.producto.tipo === 'SERVICIO') continue;
        if (invoice.almacenId) {
          const stock = await tx.inventarioStock.findUnique({
            where: {
              productoId_almacenId: {
                productoId: det.productoId,
                almacenId: invoice.almacenId,
              },
            },
          });

          if (stock) {
            await tx.inventarioStock.update({
              where: { id: stock.id },
              data: { cantidad: { increment: det.cantidad } },
            });
          }

          // Registrar movimiento de anulación en Kardex
          await tx.movimientoInventario.create({
            data: {
              empresaId,
              productoId: det.productoId,
              almacenDestinoId: invoice.almacenId,
              usuarioId,
              tipo: 'AJUSTE_POSITIVO',
              cantidad: det.cantidad,
              referenciaDoc: `ANULACIÓN ${invoice.numeroFactura}`,
              motivo: `Devolución al inventario por anulación de factura ${invoice.numeroFactura}`,
            },
          });
        }
      }

      return tx.facturaVenta.findUnique({ where: { id } });
    });
  }
}
