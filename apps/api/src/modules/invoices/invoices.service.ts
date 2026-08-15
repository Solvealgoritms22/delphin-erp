import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import { FiscalBridgeService } from './fiscalbridge.service';
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
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sequencesService: SequencesService,
    private readonly fiscalBridgeService: FiscalBridgeService,
  ) {}

  async create(empresaId: string, usuarioId: string, dto: CreateInvoiceDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La factura debe tener al menos un producto.');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    // Determinar Almacén
    let almacenId = dto.almacenId;
    if (!almacenId) {
      const defaultAlmacen = await this.prisma.almacen.findFirst({
        where: { empresaId, estado: 'ACTIVO' },
        orderBy: { esPrincipal: 'desc' },
      });
      if (!defaultAlmacen) {
        throw new BadRequestException('No hay almacenes configurados en la empresa para despachar el producto.');
      }
      almacenId = defaultAlmacen.id;
    }

    // Reservar NCF
    const ambiente = empresa.fiscalbridgeEnv || 'TEST';
    const { ncf } = await this.sequencesService.getNextNCF(empresaId, dto.tipoNcf, ambiente);

    // Calcular secuencial interno de factura
    const count = await this.prisma.facturaVenta.count({ where: { empresaId } });
    const numeroFactura = `FAC-${(count + 1).toString().padStart(6, '0')}`;

    // Calcular Subtotal, ITBIS y Total
    let subtotalAcc = new Prisma.Decimal(0);
    let itbisAcc = new Prisma.Decimal(0);
    let totalAcc = new Prisma.Decimal(0);

    const calculatedItems: CalculatedItem[] = [];

    for (const item of dto.items) {
      const producto = await this.prisma.producto.findFirst({
        where: { id: item.productoId, empresaId },
      });
      if (!producto) {
        throw new NotFoundException(`Producto con ID ${item.productoId} no existe en esta empresa.`);
      }

      const cantidad = new Prisma.Decimal(item.cantidad);
      const precio = new Prisma.Decimal(item.precioUnitario);
      const tasaItbis = new Prisma.Decimal(item.tasaItbis ?? producto.taxRate ?? 18);

      const itemSubtotal = cantidad.mul(precio);
      const itemItbis = itemSubtotal.mul(tasaItbis).div(100);
      const itemTotal = itemSubtotal.add(itemItbis);

      subtotalAcc = subtotalAcc.add(itemSubtotal);
      itbisAcc = itbisAcc.add(itemItbis);
      totalAcc = totalAcc.add(itemTotal);

      calculatedItems.push({
        productoId: item.productoId,
        cantidad,
        precioUnitario: precio,
        tasaItbis,
        itbis: itemItbis,
        subtotal: itemSubtotal,
        total: itemTotal,
      });
    }

    // Transacción de creación de factura y descuento de inventario
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Descontar inventario
      for (const item of calculatedItems) {
        const stock = await tx.inventarioStock.findUnique({
          where: {
            productoId_almacenId: {
              productoId: item.productoId,
              almacenId: almacenId!,
            },
          },
        });

        if (stock) {
          await tx.inventarioStock.update({
            where: { id: stock.id },
            data: {
              cantidad: { decrement: item.cantidad },
            },
          });
        } else {
          await tx.inventarioStock.create({
            data: {
              empresaId,
              productoId: item.productoId,
              almacenId: almacenId!,
              cantidad: new Prisma.Decimal(0).sub(item.cantidad),
            },
          });
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
      return tx.facturaVenta.create({
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
          itbis: itbisAcc,
          total: totalAcc,
          montoPagado: dto.tipoPago === 'CONTADO' ? totalAcc : new Prisma.Decimal(0),
          balancePendiente: dto.tipoPago === 'CONTADO' ? new Prisma.Decimal(0) : totalAcc,
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
    });

    // Transmitir a FiscalBridge si está habilitado y es comprobante electrónico
    if (empresa.fiscalbridgeEnabled && dto.tipoNcf.toUpperCase().startsWith('E')) {
      try {
        const fbResult = await this.fiscalBridgeService.transmitInvoice(invoice, empresa);
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
        { cliente: { nombreRazonSocial: { contains: filterDto.search, mode: 'insensitive' } } },
      ];
    }

    if (filterDto?.clienteId) where.clienteId = filterDto.clienteId;
    if (filterDto?.estado) where.estado = filterDto.estado;
    if (filterDto?.tipoNcf) where.tipoNcf = filterDto.tipoNcf;
    if (filterDto?.fiscalbridgeStatus) where.fiscalbridgeStatus = filterDto.fiscalbridgeStatus;

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
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    if (!empresa) throw new NotFoundException('Empresa no encontrada.');
    if (!invoice.tipoNcf?.toUpperCase().startsWith('E')) {
      throw new BadRequestException('Esta factura tiene NCF tradicional y no es un e-CF electrónico.');
    }

    const fbResult = await this.fiscalBridgeService.transmitInvoice(invoice, empresa);

    return this.prisma.facturaVenta.update({
      where: { id },
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
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    if (!invoice.fiscalbridgeDocId) {
      throw new BadRequestException('La factura no tiene un documento emitido en FiscalBridge para descargar PDF.');
    }

    const pdfBuffer = await this.fiscalBridgeService.getPdfBuffer(invoice.fiscalbridgeDocId, empresa);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.ncf || invoice.numeroFactura}.pdf"`);
    res.end(pdfBuffer);
  }

  async proxyXml(empresaId: string, id: string, res: Response) {
    const invoice = await this.findOne(empresaId, id);
    const empresa = await this.prisma.empresa.findUnique({ where: { id: empresaId } });

    if (!invoice.fiscalbridgeDocId) {
      throw new BadRequestException('La factura no tiene un documento emitido en FiscalBridge para descargar XML.');
    }

    const xmlBuffer = await this.fiscalBridgeService.getXmlBuffer(invoice.fiscalbridgeDocId, empresa);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.ncf || invoice.numeroFactura}.xml"`);
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
      // Restaurar stock
      for (const det of invoice.detalles) {
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

      return tx.facturaVenta.update({
        where: { id },
        data: { estado: 'ANULADA', balancePendiente: new Prisma.Decimal(0) },
      });
    });
  }
}
