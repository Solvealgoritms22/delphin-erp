import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { TenantMailerService, OwnerSmtpConfig } from '../../common/tenant-mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateQuoteDto,
  FilterQuotesDto,
  SendQuoteEmailDto,
} from './dto/quotes.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLog: ActivityLogService,
    private readonly tenantMailer: TenantMailerService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /**
   * Genera el siguiente número secuencial correlativo de cotización por empresa (ej: COT-000001)
   */
  private async generateNextNumeroCotizacion(
    tx: Prisma.TransactionClient,
    empresaId: string,
  ): Promise<string> {
    const lastQuote = await tx.cotizacion.findFirst({
      where: { empresaId },
      orderBy: { creadoEn: 'desc' },
      select: { numeroCotizacion: true },
    });

    let nextNumber = 1;
    if (lastQuote?.numeroCotizacion) {
      const match = lastQuote.numeroCotizacion.match(/COT-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `COT-${String(nextNumber).padStart(6, '0')}`;
  }

  /**
   * Consulta el estado de configuración SMTP de la empresa activa
   */
  async getSmtpStatus(empresaId: string): Promise<{
    smtpConfigured: boolean;
    smtpHost: string | null;
    smtpFrom: string | null;
    smtpUser: string | null;
    smtpEnabled: boolean;
    ownerName: string | null;
  }> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        propietario: {
          select: {
            nombre: true,
            email: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPass: true,
            smtpFrom: true,
            smtpSecure: true,
            smtpEnabled: true,
          },
        },
      },
    });

    if (!empresa || !empresa.propietario) {
      return {
        smtpConfigured: false,
        smtpHost: null,
        smtpFrom: null,
        smtpUser: null,
        smtpEnabled: false,
        ownerName: null,
      };
    }

    const prop = empresa.propietario;
    const isConfigured = Boolean(
      prop.smtpEnabled && prop.smtpHost && prop.smtpUser && prop.smtpPass,
    );

    return {
      smtpConfigured: isConfigured,
      smtpHost: prop.smtpHost || null,
      smtpFrom: prop.smtpFrom || prop.smtpUser || null,
      smtpUser: prop.smtpUser || null,
      smtpEnabled: prop.smtpEnabled || false,
      ownerName: prop.nombre || prop.email || null,
    };
  }

  /**
   * Obtiene métricas reales agregadas para las tarjetas de KPIs
   */
  async getMetrics(empresaId: string) {
    const [totalCotizaciones, totalEnviadas, totalAceptadas, totalFacturadas, totalBorradores, sumAggregate] =
      await Promise.all([
        this.prisma.cotizacion.count({ where: { empresaId } }),
        this.prisma.cotizacion.count({
          where: { empresaId, estado: 'ENVIADA' },
        }),
        this.prisma.cotizacion.count({
          where: { empresaId, estado: 'ACEPTADA' },
        }),
        this.prisma.cotizacion.count({
          where: { empresaId, estado: 'FACTURADA' },
        }),
        this.prisma.cotizacion.count({
          where: { empresaId, estado: 'BORRADOR' },
        }),
        this.prisma.cotizacion.aggregate({
          where: { empresaId, estado: { notIn: ['RECHAZADA', 'VENCIDA'] } },
          _sum: { total: true },
        }),
      ]);

    return {
      totalCotizaciones,
      totalEnviadas,
      totalAceptadas,
      totalFacturadas,
      totalBorradores,
      totalPendientes: totalBorradores + totalEnviadas,
      montoTotalCotizado: Number(sumAggregate._sum.total || 0),
    };
  }

  /**
   * Crea una nueva cotización
   */
  async create(empresaId: string, usuarioId: string, dto: CreateQuoteDto) {
    // Validar cliente si se especificó
    let cliente: any = null;
    if (dto.clienteId) {
      cliente = await this.prisma.cliente.findFirst({
        where: { id: dto.clienteId, empresaId },
      });
      if (!cliente) {
        throw new NotFoundException('Cliente no encontrado.');
      }
    }

    // Validar items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La cotización debe incluir al menos una línea de producto o servicio.');
    }

    // Calcular líneas
    let subtotalAcc = new Prisma.Decimal(0);
    let itbisAcc = new Prisma.Decimal(0);
    let descuentoLineasAcc = new Prisma.Decimal(0);

    const calculatedItems = dto.items.map((item) => {
      const cantidad = new Prisma.Decimal(item.cantidad);
      const precioUnitario = new Prisma.Decimal(item.precioUnitario);
      const itemDescuento = new Prisma.Decimal(item.descuento || 0);
      const tasaItbis = new Prisma.Decimal(item.tasaItbis !== undefined ? item.tasaItbis : 18);

      const grossLine = cantidad.mul(precioUnitario);
      const netLine = grossLine.sub(itemDescuento);
      const itemItbis = netLine.mul(tasaItbis).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
      const itemTotal = netLine.add(itemItbis).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

      subtotalAcc = subtotalAcc.add(grossLine);
      descuentoLineasAcc = descuentoLineasAcc.add(itemDescuento);
      itbisAcc = itbisAcc.add(itemItbis);

      return {
        productoId: item.productoId || null,
        descripcion: item.descripcion,
        cantidad,
        precioUnitario,
        descuento: itemDescuento,
        porcentajeDescuento: item.porcentajeDescuento
          ? new Prisma.Decimal(item.porcentajeDescuento)
          : new Prisma.Decimal(0),
        tasaItbis,
        itbis: itemItbis,
        subtotal: netLine,
        total: itemTotal,
      };
    });

    const globalDiscount = new Prisma.Decimal(dto.descuento || 0);
    const totalDescuento = descuentoLineasAcc.add(globalDiscount);

    const totalCotizacion = subtotalAcc
      .sub(totalDescuento)
      .add(itbisAcc)
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

    if (totalCotizacion.lt(0)) {
      throw new BadRequestException('El total de la cotización no puede ser negativo tras aplicar descuentos.');
    }

    return this.prisma.$transaction(async (tx) => {
      const numeroCotizacion = dto.numeroCotizacion?.trim()
        ? dto.numeroCotizacion.trim()
        : await this.generateNextNumeroCotizacion(tx, empresaId);

      const quote = await tx.cotizacion.create({
        data: {
          empresaId,
          usuarioId,
          clienteId: dto.clienteId || null,
          sucursalId: dto.sucursalId || null,
          almacenId: dto.almacenId || null,
          numeroCotizacion,
          fecha: dto.fecha ? new Date(dto.fecha) : new Date(),
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : null,
          estado: 'BORRADOR',
          subtotal: subtotalAcc,
          descuento: totalDescuento,
          itbis: itbisAcc,
          total: totalCotizacion,
          moneda: 'DOP',
          tasaCambio: new Prisma.Decimal(1),
          notas: dto.notas || null,
          terminosCondiciones: dto.terminosCondiciones || null,
          detalles: {
            create: calculatedItems.map((item) => ({
              productoId: item.productoId,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento,
              porcentajeDescuento: item.porcentajeDescuento,
              tasaItbis: item.tasaItbis,
              itbis: item.itbis,
              subtotal: item.subtotal,
              total: item.total,
            })),
          },
        },
        include: {
          cliente: true,
          detalles: {
            include: {
              producto: true,
            },
          },
          usuario: {
            select: { id: true, nombre: true, email: true },
          },
        },
      });

      this.activityLog.log({
        empresaId,
        usuarioId,
        modulo: 'commercial',
        accion: 'CREATE',
        resourceId: quote.id,
        resourceName: quote.numeroCotizacion,
        resourceType: 'Cotización',
        metadata: {
          total: totalCotizacion.toNumber(),
          cliente: cliente?.nombreRazonSocial || 'Consumidor Final',
        },
      });

      return quote;
    });
  }

  /**
   * Lista cotizaciones con paginación y filtros avanzados
   */
  async findAll(empresaId: string, filter: FilterQuotesDto) {
    const page = Math.max(1, Number(filter.page || 1));
    const limit = Math.max(1, Math.min(100, Number(filter.limit || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.CotizacionWhereInput = { empresaId };

    if (filter.estado) {
      where.estado = filter.estado;
    }

    if (filter.clienteId) {
      where.clienteId = filter.clienteId;
    }

    if (filter.from || filter.to) {
      where.fecha = {};
      if (filter.from) where.fecha.gte = new Date(filter.from);
      if (filter.to) where.fecha.lte = new Date(filter.to);
    }

    if (filter.search) {
      const q = filter.search.trim();
      where.OR = [
        { numeroCotizacion: { contains: q, mode: 'insensitive' } },
        { notas: { contains: q, mode: 'insensitive' } },
        {
          cliente: {
            OR: [
              { nombreRazonSocial: { contains: q, mode: 'insensitive' } },
              { numeroDocumento: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.cotizacion.count({ where }),
      this.prisma.cotizacion.findMany({
        where,
        skip,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombreRazonSocial: true,
              numeroDocumento: true,
              email: true,
              telefono: true,
            },
          },
          usuario: {
            select: { id: true, nombre: true, email: true },
          },
          detalles: {
            select: {
              id: true,
              descripcion: true,
              cantidad: true,
              precioUnitario: true,
              itbis: true,
              total: true,
            },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Consulta una cotización individual por ID
   */
  async findOne(empresaId: string, id: string) {
    const quote = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        sucursal: true,
        almacen: true,
        usuario: {
          select: { id: true, nombre: true, email: true },
        },
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    return quote;
  }

  /**
   * Actualiza una cotización en estado BORRADOR o ENVIADA
   */
  async update(empresaId: string, id: string, dto: Partial<CreateQuoteDto>) {
    const existing = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
    });

    if (!existing) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    if (existing.estado === 'FACTURADA') {
      throw new BadRequestException('No se puede modificar una cotización que ya fue convertida a Factura.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Si se actualizaron los items, recalcular
      if (dto.items && dto.items.length > 0) {
        await tx.cotizacionDetalle.deleteMany({ where: { cotizacionId: id } });

        let subtotalAcc = new Prisma.Decimal(0);
        let itbisAcc = new Prisma.Decimal(0);
        let descuentoLineasAcc = new Prisma.Decimal(0);

        const calculatedItems = dto.items.map((item) => {
          const cantidad = new Prisma.Decimal(item.cantidad);
          const precioUnitario = new Prisma.Decimal(item.precioUnitario);
          const itemDescuento = new Prisma.Decimal(item.descuento || 0);
          const tasaItbis = new Prisma.Decimal(item.tasaItbis !== undefined ? item.tasaItbis : 18);

          const grossLine = cantidad.mul(precioUnitario);
          const netLine = grossLine.sub(itemDescuento);
          const itemItbis = netLine.mul(tasaItbis).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
          const itemTotal = netLine.add(itemItbis).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

          subtotalAcc = subtotalAcc.add(grossLine);
          descuentoLineasAcc = descuentoLineasAcc.add(itemDescuento);
          itbisAcc = itbisAcc.add(itemItbis);

          return {
            cotizacionId: id,
            productoId: item.productoId || null,
            descripcion: item.descripcion,
            cantidad,
            precioUnitario,
            descuento: itemDescuento,
            porcentajeDescuento: item.porcentajeDescuento
              ? new Prisma.Decimal(item.porcentajeDescuento)
              : new Prisma.Decimal(0),
            tasaItbis,
            itbis: itemItbis,
            subtotal: netLine,
            total: itemTotal,
          };
        });

        const globalDiscount = new Prisma.Decimal(dto.descuento || 0);
        const totalDescuento = descuentoLineasAcc.add(globalDiscount);

        const totalCotizacion = subtotalAcc
          .sub(totalDescuento)
          .add(itbisAcc)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);

        await tx.cotizacionDetalle.createMany({
          data: calculatedItems,
        });

        return tx.cotizacion.update({
          where: { id },
          data: {
            clienteId: dto.clienteId !== undefined ? dto.clienteId : existing.clienteId,
            sucursalId: dto.sucursalId !== undefined ? dto.sucursalId : existing.sucursalId,
            almacenId: dto.almacenId !== undefined ? dto.almacenId : existing.almacenId,
            fecha: dto.fecha ? new Date(dto.fecha) : existing.fecha,
            fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : existing.fechaVencimiento,
            notas: dto.notas !== undefined ? dto.notas : existing.notas,
            terminosCondiciones: dto.terminosCondiciones !== undefined ? dto.terminosCondiciones : existing.terminosCondiciones,
            subtotal: subtotalAcc,
            descuento: totalDescuento,
            itbis: itbisAcc,
            total: totalCotizacion,
          },
          include: {
            cliente: true,
            detalles: true,
          },
        });
      }

      // Actualización simple de metadatos
      return tx.cotizacion.update({
        where: { id },
        data: {
          clienteId: dto.clienteId !== undefined ? dto.clienteId : existing.clienteId,
          fechaVencimiento: dto.fechaVencimiento ? new Date(dto.fechaVencimiento) : existing.fechaVencimiento,
          notas: dto.notas !== undefined ? dto.notas : existing.notas,
          terminosCondiciones: dto.terminosCondiciones !== undefined ? dto.terminosCondiciones : existing.terminosCondiciones,
        },
        include: {
          cliente: true,
          detalles: true,
        },
      });
    });
  }

  /**
   * Elimina o cancela una cotización
   */
  async delete(empresaId: string, id: string) {
    const existing = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
    });

    if (!existing) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    if (existing.estado === 'FACTURADA') {
      throw new BadRequestException('No se puede eliminar una cotización que ya fue convertida a Factura.');
    }

    // Si es borrador, se puede eliminar físicamente; si ya fue enviada, se marca RECHAZADA
    if (existing.estado === 'BORRADOR') {
      return this.prisma.cotizacion.delete({ where: { id } });
    } else {
      return this.prisma.cotizacion.update({
        where: { id },
        data: { estado: 'RECHAZADA' },
      });
    }
  }

  /**
   * Valida SMTP y correo del cliente, y envía la cotización por correo electrónico
   */
  async sendEmail(empresaId: string, id: string, dto: SendQuoteEmailDto) {
    // 1. Obtener cotización completa y datos de la empresa con propietario
    const quote = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        detalles: {
          include: {
            producto: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        propietario: {
          select: {
            nombre: true,
            email: true,
            smtpHost: true,
            smtpPort: true,
            smtpUser: true,
            smtpPass: true,
            smtpFrom: true,
            smtpSecure: true,
            smtpEnabled: true,
          },
        },
      },
    });

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada.');
    }

    // 2. Validar que la empresa tenga SMTP configurado
    const prop = empresa.propietario;
    const smtpConfig: OwnerSmtpConfig = {
      smtpEnabled: prop?.smtpEnabled ?? false,
      smtpHost: prop?.smtpHost ?? null,
      smtpPort: prop?.smtpPort ?? 587,
      smtpUser: prop?.smtpUser ?? null,
      smtpPass: prop?.smtpPass ?? null,
      smtpFrom: prop?.smtpFrom ?? null,
      smtpSecure: prop?.smtpSecure ?? true,
    };

    if (!smtpConfig.smtpEnabled || !smtpConfig.smtpHost || !smtpConfig.smtpUser || !smtpConfig.smtpPass) {
      throw new BadRequestException({
        code: 'SMTP_NOT_CONFIGURED',
        message:
          'La empresa no tiene un servidor de correo (SMTP) configurado. Por favor configúralo en Configuración > Mi Cuenta antes de enviar cotizaciones.',
      });
    }

    // 3. Validar correo del destinatario
    const targetEmail = dto.recipientEmail?.trim() || quote.cliente?.email?.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      throw new BadRequestException({
        code: 'CLIENT_EMAIL_MISSING',
        message:
          'El cliente no tiene un correo electrónico registrado. Por favor introduce un correo válido para el envío.',
      });
    }

    // Si el usuario solicitó guardar el correo en la ficha del cliente
    if (dto.saveEmailToClient && quote.clienteId && dto.recipientEmail) {
      await this.prisma.cliente.update({
        where: { id: quote.clienteId },
        data: { email: dto.recipientEmail.trim() },
      });
    }

    // 4. Construir la plantilla HTML corporativa con estética Fuse
    const emailSubject =
      dto.customSubject?.trim() ||
      `Cotización ${quote.numeroCotizacion} - ${empresa.razonSocial}`;

    const emailHtml = this.buildQuoteEmailHtml(quote, empresa, dto.customMessage);

    // 5. Enviar el correo usando TenantMailerService
    await this.tenantMailer.sendMail(smtpConfig, {
      to: targetEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    // 6. Actualizar trazabilidad de la cotización
    const updated = await this.prisma.cotizacion.update({
      where: { id },
      data: {
        enviadaPorEmail: true,
        fechaEnvioEmail: new Date(),
        emailDestino: targetEmail,
        estado: quote.estado === 'BORRADOR' ? 'ENVIADA' : quote.estado,
      },
      include: {
        cliente: true,
        detalles: true,
      },
    });

    if (this.notifications) {
      await this.notifications.create({
        empresaId,
        tipo: 'QUOTE_SENT',
        titulo: 'Cotización Despachada',
        mensaje: `Cotización ${quote.numeroCotizacion} enviada por correo a ${targetEmail}.`,
        severidad: 'SUCCESS',
        icono: 'send',
        payload: {
          cotizacionId: id,
          numeroCotizacion: quote.numeroCotizacion,
          emailDestino: targetEmail,
        },
        canales: ['IN_APP'],
      });
    }

    this.logger.log(`[QuotesService] Cotización ${quote.numeroCotizacion} enviada por correo a ${targetEmail}`);

    return {
      success: true,
      message: `Cotización enviada exitosamente a ${targetEmail}`,
      quote: updated,
    };
  }

  /**
   * Convierte una cotización directamente en una Factura de Venta
   */
  async convertToInvoice(empresaId: string, usuarioId: string, id: string) {
    const quote = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
      include: {
        detalles: true,
        cliente: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Cotización no encontrada.');
    }

    if (quote.estado === 'FACTURADA' && quote.facturaId) {
      throw new BadRequestException('Esta cotización ya fue convertida previamente en una Factura de Venta.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generar número de factura interna
      const lastInvoice = await tx.facturaVenta.findFirst({
        where: { empresaId },
        orderBy: { creadoEn: 'desc' },
        select: { numeroFactura: true },
      });

      let nextNumber = 1;
      if (lastInvoice?.numeroFactura) {
        const match = lastInvoice.numeroFactura.match(/FAC-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }
      const numeroFactura = `FAC-${String(nextNumber).padStart(6, '0')}`;

      // 2. Crear la FacturaVenta
      const factura = await tx.facturaVenta.create({
        data: {
          empresaId,
          usuarioId,
          clienteId: quote.clienteId,
          sucursalId: quote.sucursalId,
          almacenId: quote.almacenId,
          numeroFactura,
          fecha: new Date(),
          fechaVencimiento: quote.fechaVencimiento,
          estado: 'EMITIDA',
          tipoPago: 'CONTADO',
          metodoPago: 'EFECTIVO',
          subtotal: quote.subtotal,
          descuento: quote.descuento,
          itbis: quote.itbis,
          total: quote.total,
          montoPagado: new Prisma.Decimal(0),
          balancePendiente: quote.total,
          moneda: 'DOP',
          tasaCambio: new Prisma.Decimal(1),
          notas: `Generada a partir de la Cotización ${quote.numeroCotizacion}.${quote.notas ? ' ' + quote.notas : ''}`,
          detalles: {
            create: quote.detalles.map((d) => ({
              productoId: d.productoId || '',
              cantidad: d.cantidad,
              precioUnitario: d.precioUnitario,
              tasaItbis: d.tasaItbis,
              descuento: d.descuento,
              porcentajeDescuento: d.porcentajeDescuento,
              itbis: d.itbis,
              subtotal: d.subtotal,
              total: d.total,
            })),
          },
        },
      });

      // 3. Marcar cotización como FACTURADA y enlazar factura
      const updatedQuote = await tx.cotizacion.update({
        where: { id },
        data: {
          estado: 'FACTURADA',
          facturaId: factura.id,
        },
      });

      this.activityLog.log({
        empresaId,
        usuarioId,
        modulo: 'commercial',
        accion: 'CREATE',
        resourceId: factura.id,
        resourceName: factura.numeroFactura,
        resourceType: 'Factura',
        metadata: {
          origen: 'COTIZACION',
          cotizacionId: quote.id,
          numeroCotizacion: quote.numeroCotizacion,
        },
      });

      if (this.notifications) {
        await this.notifications.create({
          empresaId,
          tipo: 'QUOTE_CONVERTED',
          titulo: 'Cotización Facturada',
          mensaje: `Cotización ${quote.numeroCotizacion} convertida a factura ${factura.numeroFactura}.`,
          severidad: 'SUCCESS',
          icono: 'check-circle',
          payload: {
            cotizacionId: quote.id,
            facturaId: factura.id,
            numeroCotizacion: quote.numeroCotizacion,
            numeroFactura: factura.numeroFactura,
          },
          canales: ['IN_APP'],
        });
      }

      return {
        success: true,
        message: `Cotización ${quote.numeroCotizacion} convertida a Factura ${factura.numeroFactura}`,
        quote: updatedQuote,
        invoice: factura,
      };
    });
  }

  /**
   * Compilador de plantilla HTML corporativa para envío de cotizaciones por email
   */
  private buildQuoteEmailHtml(quote: any, empresa: any, customMessage?: string): string {
    const formattedDate = new Date(quote.fecha).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const formattedDueDate = quote.fechaVencimiento
      ? new Date(quote.fechaVencimiento).toLocaleDateString('es-DO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '30 días desde la emisión';

    const formatCurrency = (val: any) => {
      const num = Number(val || 0);
      return 'RD$ ' + num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cotización ${quote.numeroCotizacion}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 650px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: #ffffff; padding: 32px; text-align: left; }
    .header h1 { margin: 0 0 4px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background-color: #f1f5f9; padding: 16px; border-radius: 12px; margin-bottom: 24px; }
    .meta-item { font-size: 12px; }
    .meta-item strong { display: block; color: #64748b; text-transform: uppercase; font-size: 10px; margin-bottom: 2px; }
    .message-box { background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 6px; font-size: 13px; margin-bottom: 24px; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; background-color: #f8fafc; color: #475569; font-weight: 700; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals { width: 260px; margin-left: auto; margin-bottom: 24px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #64748b; }
    .totals-row.grand-total { border-top: 2px solid #e2e8f0; margin-top: 8px; padding-top: 10px; font-size: 16px; font-weight: 800; color: #0f172a; }
    .notes-card { background-color: #f8fafc; border-radius: 10px; padding: 16px; font-size: 12px; color: #64748b; margin-bottom: 24px; }
    .footer { text-align: center; padding: 24px; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${empresa.razonSocial || 'Dolphin ERP'}</h1>
      <p>${empresa.rnc ? `RNC: ${empresa.rnc} · ` : ''}${empresa.telefono ? `Tel: ${empresa.telefono}` : ''}</p>
    </div>

    <div class="content">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px;">
        <div>
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #2563eb;">Propuesta Comercial</span>
          <h2 style="margin: 2px 0 0 0; font-size: 20px; font-weight: 800; color: #0f172a;">Cotización ${quote.numeroCotizacion}</h2>
        </div>
        <div style="text-align: right; font-size: 12px; color: #64748b;">
          Fecha: <strong>${formattedDate}</strong>
        </div>
      </div>

      ${customMessage ? `<div class="message-box">${customMessage}</div>` : ''}

      <div class="meta-grid">
        <div class="meta-item">
          <strong>Preparado Para</strong>
          ${quote.cliente ? quote.cliente.nombreRazonSocial : 'Cliente General'}
          ${quote.cliente?.numeroDocumento ? `<br><span style="color: #64748b; font-family: monospace;">RNC/Céd: ${quote.cliente.numeroDocumento}</span>` : ''}
        </div>
        <div class="meta-item">
          <strong>Validez de la Oferta</strong>
          Hasta el ${formattedDueDate}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Descripción / Ítem</th>
            <th class="text-center" style="width: 50px;">Cant.</th>
            <th class="text-right" style="width: 100px;">Precio Unit.</th>
            <th class="text-right" style="width: 110px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${quote.detalles.map((d: any) => `
            <tr>
              <td>
                <strong>${d.descripcion}</strong>
                ${d.descuento > 0 ? `<br><small style="color: #059669;">Descuento: -${formatCurrency(d.descuento)}</small>` : ''}
              </td>
              <td class="text-center">${d.cantidad}</td>
              <td class="text-right" style="font-family: monospace;">${formatCurrency(d.precioUnitario)}</td>
              <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatCurrency(d.total)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row">
          <span>Subtotal Neto:</span>
          <span style="font-family: monospace;">${formatCurrency(quote.subtotal)}</span>
        </div>
        ${Number(quote.descuento) > 0 ? `
          <div class="totals-row" style="color: #059669;">
            <span>Descuento Total:</span>
            <span style="font-family: monospace;">-${formatCurrency(quote.descuento)}</span>
          </div>
        ` : ''}
        <div class="totals-row">
          <span>ITBIS (18%):</span>
          <span style="font-family: monospace;">${formatCurrency(quote.itbis)}</span>
        </div>
        <div class="totals-row grand-total">
          <span>Total Cotizado:</span>
          <span style="font-family: monospace; color: #1e40af;">${formatCurrency(quote.total)}</span>
        </div>
      </div>

      ${quote.notas || quote.terminosCondiciones ? `
        <div class="notes-card">
          ${quote.notas ? `<p style="margin: 0 0 6px 0;"><strong>Condiciones:</strong> ${quote.notas}</p>` : ''}
          ${quote.terminosCondiciones ? `<p style="margin: 0;"><strong>Términos de Entrega y Pago:</strong> ${quote.terminosCondiciones}</p>` : ''}
        </div>
      ` : ''}

      <div style="text-align: center; margin-top: 32px;">
        <p style="font-size: 13px; color: #475569; margin-bottom: 12px;">¿Deseas aprobar esta cotización o tienes alguna consulta?</p>
        <p style="font-size: 12px; font-weight: 700; color: #1e40af;">Contáctanos respondiendo directamente a este correo o al ${empresa.telefono || 'teléfono de la empresa'}.</p>
      </div>
    </div>

    <div class="footer">
      Este documento es una cotización comercial emitida a través del sistema <strong>Dolphin ERP</strong>.<br>
      © ${new Date().getFullYear()} ${empresa.razonSocial || 'Dolphin ERP'}. Todos los derechos reservados.
    </div>
  </div>
</body>
</html>
    `;
  }
}
