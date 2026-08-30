import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Strict Read-Only Database Tools for the ERP AI Agent.
 * ALL operations are strictly READ-ONLY and strictly filtered by empresaId.
 * No mutation (create, update, delete, upsert) methods exist here.
 */
@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get basic overview of the company, subscription, and branch count
   */
  async getCompanyOverview(empresaId: string) {
    this.logger.debug(
      `[AI-TOOL] getCompanyOverview for empresaId: ${empresaId}`,
    );
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        suscripcion: {
          include: {
            plan: true,
          },
        },
        sucursales: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            telefono: true,
            estado: true,
          },
        },
        _count: {
          select: {
            productos: true,
            clientes: true,
            proveedores: true,
            membresias: true,
            sucursales: true,
          },
        },
      },
    });

    if (!empresa) {
      return { error: 'Empresa no encontrada o no asignada.' };
    }

    return {
      razonSocial: empresa.razonSocial,
      rnc: empresa.rnc,
      pais: empresa.pais,
      telefono: empresa.telefono,
      email: empresa.email,
      estado: empresa.estado,
      creadoEn: empresa.creadoEn,
      plan: empresa.suscripcion?.plan?.nombre || 'Free / Starter',
      planEstado: empresa.suscripcion?.estado || 'ACTIVE',
      sucursales: empresa.sucursales,
      resumenConteos: {
        totalProductos: empresa._count.productos,
        totalClientes: empresa._count.clientes,
        totalProveedores: empresa._count.proveedores,
        totalUsuarios: empresa._count.membresias,
        totalSucursales: empresa._count.sucursales,
      },
    };
  }

  /**
   * Get executive KPIs and distribution metrics
   */
  async getExecutiveMetrics(empresaId: string) {
    this.logger.debug(
      `[AI-TOOL] getExecutiveMetrics for empresaId: ${empresaId}`,
    );
    const [
      totalProductos,
      totalClientes,
      totalProveedores,
      totalUsuarios,
      categorias,
      recentActivity,
    ] = await Promise.all([
      this.prisma.producto.count({ where: { empresaId } }),
      this.prisma.cliente.count({ where: { empresaId } }),
      this.prisma.proveedor.count({ where: { empresaId } }),
      this.prisma.membresia.count({ where: { empresaId } }),
      this.prisma.categoria.findMany({
        where: { empresaId },
        select: {
          nombre: true,
          _count: { select: { productos: true } },
        },
      }),
      this.prisma.activityLog.findMany({
        where: { empresaId },
        orderBy: { creadoEn: 'desc' },
        take: 5,
        select: {
          modulo: true,
          accion: true,
          resourceName: true,
          usuarioNombre: true,
          creadoEn: true,
        },
      }),
    ]);

    return {
      metricasGenerales: {
        totalProductos,
        totalClientes,
        totalProveedores,
        totalUsuarios,
      },
      distribucionCategorias: categorias.map((c) => ({
        categoria: c.nombre,
        productos: c._count.productos,
      })),
      actividadReciente: recentActivity,
    };
  }

  /**
   * Query catalog products with prices and categories
   */
  async queryProducts(
    empresaId: string,
    params?: { search?: string; categoria?: string; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(
      `[AI-TOOL] queryProducts for empresaId: ${empresaId}, limit: ${limit}`,
    );

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: 'insensitive' } },
        { codigo: { contains: params.search, mode: 'insensitive' } },
        { descripcion: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.categoria) {
      where.categoria = {
        nombre: { contains: params.categoria, mode: 'insensitive' },
      };
    }

    const productos = await this.prisma.producto.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        precioVenta: true,
        costo: true,
        taxRate: true,
        estado: true,
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
        unidadMedida: { select: { abreviatura: true, nombre: true } },
      },
    });

    return {
      totalEncontrados: productos.length,
      productos: productos.map((p) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        precioVenta: p.precioVenta,
        costo: p.costo,
        impuesto: p.taxRate ? `${p.taxRate.toString()}%` : '0%',
        categoria: p.categoria?.nombre || 'Sin categoría',
        marca: p.marca?.nombre || 'Sin marca',
        unidad: p.unidadMedida?.abreviatura || 'Und',
        estado: p.estado,
      })),
    };
  }

  /**
   * Query commercial clients
   */
  async queryClients(
    empresaId: string,
    params?: { search?: string; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(`[AI-TOOL] queryClients for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { telefono: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const clientes = await this.prisma.cliente.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombreRazonSocial: true,
        tipoDocumento: true,
        numeroDocumento: true,
        email: true,
        telefono: true,
        direccion: true,
        pais: true,
        estado: true,
      },
    });

    return {
      totalEncontrados: clientes.length,
      clientes: clientes.map((c) => ({
        nombre: c.nombreRazonSocial,
        documento: `${c.tipoDocumento}: ${c.numeroDocumento}`,
        email: c.email || 'N/A',
        telefono: c.telefono || 'N/A',
        direccion: c.direccion || 'N/A',
        pais: c.pais,
        estado: c.estado,
      })),
    };
  }

  /**
   * Query commercial suppliers
   */
  async querySuppliers(
    empresaId: string,
    params?: { search?: string; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(`[AI-TOOL] querySuppliers for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { telefono: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const proveedores = await this.prisma.proveedor.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombreRazonSocial: true,
        tipoDocumento: true,
        numeroDocumento: true,
        email: true,
        telefono: true,
        direccion: true,
        estado: true,
      },
    });

    return {
      totalEncontrados: proveedores.length,
      proveedores: proveedores.map((p) => ({
        nombre: p.nombreRazonSocial,
        documento: `${p.tipoDocumento}: ${p.numeroDocumento}`,
        email: p.email || 'N/A',
        telefono: p.telefono || 'N/A',
        direccion: p.direccion || 'N/A',
        estado: p.estado,
      })),
    };
  }

  /**
   * Query branches / locations
   */
  async queryBranches(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryBranches for empresaId: ${empresaId}`);
    const sucursales = await this.prisma.sucursal.findMany({
      where: { empresaId },
      orderBy: { creadoEn: 'asc' },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        direccion: true,
        telefono: true,
        email: true,
        estado: true,
      },
    });

    return {
      totalSucursales: sucursales.length,
      sucursales,
    };
  }

  /**
   * Query activity & audit logs
   */
  async queryActivityLogs(
    empresaId: string,
    params?: { limit?: number; module?: string; action?: string },
  ) {
    const limit = Math.min(params?.limit || 15, 30);
    this.logger.debug(
      `[AI-TOOL] queryActivityLogs for empresaId: ${empresaId}`,
    );

    const where: any = { empresaId };
    if (params?.module) {
      where.modulo = { contains: params.module, mode: 'insensitive' };
    }
    if (params?.action) {
      where.accion = params.action;
    }

    const logs = await this.prisma.activityLog.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        modulo: true,
        accion: true,
        resourceName: true,
        resourceType: true,
        usuarioNombre: true,
        usuarioEmail: true,
        ipAddress: true,
        creadoEn: true,
      },
    });

    return {
      totalLogs: logs.length,
      logs: logs.map((l) => ({
        fecha: l.creadoEn.toISOString(),
        modulo: l.modulo,
        accion: l.accion,
        recurso: l.resourceName || l.resourceType || 'General',
        usuario: l.usuarioNombre || l.usuarioEmail || 'Sistema',
        ip: l.ipAddress || 'Interna',
      })),
    };
  }

  /**
   * Query users and roles in this tenant
   */
  async queryTeamMembers(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryTeamMembers for empresaId: ${empresaId}`);
    const membresias = await this.prisma.membresia.findMany({
      where: { empresaId },
      select: {
        id: true,
        estado: true,
        role: { select: { nombre: true, descripcion: true } },
        usuario: {
          select: {
            nombre: true,
            email: true,
            ultimoAcceso: true,
            isVerified: true,
          },
        },
      },
    });

    return {
      totalMiembros: membresias.length,
      miembros: membresias.map((m) => ({
        nombre: m.usuario.nombre || 'Sin nombre',
        email: m.usuario.email,
        rol: m.role?.nombre || 'Sin rol',
        estado: m.estado,
        verificado: m.usuario.isVerified ? 'Sí' : 'No',
        ultimoAcceso: m.usuario.ultimoAcceso?.toISOString() || 'Nunca',
      })),
    };
  }

  /**
   * Query sales and POS invoices
   */
  async querySalesAndInvoices(
    empresaId: string,
    params?: { search?: string; limit?: number; estado?: string },
  ) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(`[AI-TOOL] querySalesAndInvoices for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.estado) {
      where.estado = params.estado;
    }
    if (params?.search) {
      where.OR = [
        { numeroFactura: { contains: params.search, mode: 'insensitive' } },
        { ncf: { contains: params.search, mode: 'insensitive' } },
        { cliente: { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [invoices, totalVentasCount, sumVentas] = await Promise.all([
      this.prisma.facturaVenta.findMany({
        where,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          cliente: { select: { nombreRazonSocial: true, numeroDocumento: true } },
          detalles: {
            take: 5,
            select: {
              cantidad: true,
              precioUnitario: true,
              total: true,
              producto: { select: { nombre: true, codigo: true } },
            },
          },
        },
      }),
      this.prisma.facturaVenta.count({ where: { empresaId, estado: { not: 'ANULADA' } } }),
      this.prisma.facturaVenta.aggregate({
        where: { empresaId, estado: { not: 'ANULADA' } },
        _sum: { total: true, subtotal: true, itbis: true },
      }),
    ]);

    return {
      resumenVentasGlobal: {
        totalFacturasEmitidas: totalVentasCount,
        montoTotalFacturado: sumVentas._sum.total ? Number(sumVentas._sum.total) : 0,
        subtotalTotal: sumVentas._sum.subtotal ? Number(sumVentas._sum.subtotal) : 0,
        itbisTotal: sumVentas._sum.itbis ? Number(sumVentas._sum.itbis) : 0,
      },
      facturasRecientes: invoices.map((inv) => ({
        id: inv.id,
        numero: inv.numeroFactura,
        ncf: inv.ncf || 'Sin NCF',
        tipoNcf: inv.tipoNcf || 'N/A',
        fecha: inv.fecha.toISOString().split('T')[0],
        cliente: inv.cliente?.nombreRazonSocial || 'Cliente General',
        total: Number(inv.total),
        subtotal: Number(inv.subtotal),
        itbis: Number(inv.itbis),
        estado: inv.estado,
        metodoPago: inv.metodoPago || 'EFECTIVO',
        tipoPago: inv.tipoPago || 'CONTADO',
        items: inv.detalles.map((d) => `${d.cantidad}x ${d.producto?.nombre || 'Artículo'} (RD$ ${Number(d.total)})`),
      })),
    };
  }

  /**
   * Query quotes / cotizaciones
   */
  async queryQuotes(
    empresaId: string,
    params?: { search?: string; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 15, 30);
    this.logger.debug(`[AI-TOOL] queryQuotes for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { numeroCotizacion: { contains: params.search, mode: 'insensitive' } },
        { cliente: { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const quotes = await this.prisma.cotizacion.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      include: {
        cliente: { select: { nombreRazonSocial: true } },
      },
    });

    return {
      totalCotizaciones: quotes.length,
      cotizaciones: quotes.map((q) => ({
        numero: q.numeroCotizacion,
        cliente: q.cliente?.nombreRazonSocial || 'Cliente General',
        fecha: q.fecha.toISOString().split('T')[0],
        fechaVencimiento: q.fechaVencimiento ? q.fechaVencimiento.toISOString().split('T')[0] : 'N/A',
        total: Number(q.total),
        estado: q.estado,
      })),
    };
  }

  /**
   * Query purchases and accounts payable (CxP)
   */
  async queryPurchases(
    empresaId: string,
    params?: { search?: string; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 15, 30);
    this.logger.debug(`[AI-TOOL] queryPurchases for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { numeroFactura: { contains: params.search, mode: 'insensitive' } },
        { ncf: { contains: params.search, mode: 'insensitive' } },
        { proveedor: { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [purchases, pendingPurchases] = await Promise.all([
      this.prisma.facturaCompra.findMany({
        where,
        take: limit,
        orderBy: { creadoEn: 'desc' },
        include: {
          proveedor: { select: { nombreRazonSocial: true, numeroDocumento: true } },
        },
      }),
      this.prisma.facturaCompra.aggregate({
        where: { empresaId, balancePendiente: { gt: 0 } },
        _sum: { balancePendiente: true },
        _count: true,
      }),
    ]);

    return {
      resumenCuentasPorPagar: {
        totalPendientePago: pendingPurchases._sum.balancePendiente ? Number(pendingPurchases._sum.balancePendiente) : 0,
        facturasPendientesCount: pendingPurchases._count || 0,
      },
      comprasRecientes: purchases.map((p) => ({
        numero: p.numeroFactura,
        ncf: p.ncf || 'Sin NCF',
        proveedor: p.proveedor?.nombreRazonSocial || 'Proveedor General',
        fecha: p.fecha.toISOString().split('T')[0],
        total: Number(p.total),
        balancePendiente: Number(p.balancePendiente),
        estado: p.estado,
      })),
    };
  }

  /**
   * Query accounts receivable (CxC / Cuentas por Cobrar)
   */
  async queryReceivables(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryReceivables for empresaId: ${empresaId}`);

    const pendingInvoices = await this.prisma.facturaVenta.findMany({
      where: {
        empresaId,
        estado: { not: 'ANULADA' },
        balancePendiente: { gt: 0 },
      },
      orderBy: { fechaVencimiento: 'asc' },
      take: 20,
      include: {
        cliente: { select: { nombreRazonSocial: true, telefono: true, email: true } },
      },
    });

    const sumPending = pendingInvoices.reduce((acc, inv) => acc + Number(inv.balancePendiente), 0);

    return {
      totalPorCobrar: sumPending,
      totalFacturasPorCobrar: pendingInvoices.length,
      facturasPendientes: pendingInvoices.map((inv) => ({
        numero: inv.numeroFactura,
        ncf: inv.ncf || 'N/A',
        cliente: inv.cliente?.nombreRazonSocial || 'Cliente General',
        telefono: inv.cliente?.telefono || 'N/A',
        total: Number(inv.total),
        balancePendiente: Number(inv.balancePendiente),
        fechaEmision: inv.fecha.toISOString().split('T')[0],
        fechaVencimiento: inv.fechaVencimiento ? inv.fechaVencimiento.toISOString().split('T')[0] : 'Sin vencimiento',
      })),
    };
  }

  /**
   * Query inventory stock levels, warehouses, and low stock warnings
   */
  async queryInventoryStock(
    empresaId: string,
    params?: { search?: string; lowStockOnly?: boolean; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 25, 50);
    this.logger.debug(`[AI-TOOL] queryInventoryStock for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.producto = {
        OR: [
          { nombre: { contains: params.search, mode: 'insensitive' } },
          { codigo: { contains: params.search, mode: 'insensitive' } },
        ],
      };
    }

    const inventoryItems = await this.prisma.inventarioStock.findMany({
      where,
      take: limit,
      include: {
        producto: {
          select: {
            nombre: true,
            codigo: true,
            precioVenta: true,
            costo: true,
            categoria: { select: { nombre: true } },
          },
        },
        almacen: { select: { nombre: true } },
      },
    });

    const lowStock = inventoryItems.filter(
      (item) => Number(item.cantidad) <= Number(item.stockMinimo),
    );

    const itemsToReturn = params?.lowStockOnly ? lowStock : inventoryItems;

    return {
      totalItemsAnalizados: inventoryItems.length,
      alertasBajoStockCount: lowStock.length,
      inventario: itemsToReturn.map((item) => ({
        producto: item.producto.nombre,
        codigo: item.producto.codigo,
        categoria: item.producto.categoria?.nombre || 'General',
        almacen: item.almacen.nombre,
        cantidadActual: Number(item.cantidad),
        stockMinimo: Number(item.stockMinimo),
        bajoStock: Number(item.cantidad) <= Number(item.stockMinimo),
        precioVenta: Number(item.producto.precioVenta),
        costo: Number(item.producto.costo),
      })),
    };
  }

  /**
   * Query active commercial promotions
   */
  async queryPromotions(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryPromotions for empresaId: ${empresaId}`);

    const promotions = await this.prisma.promocion.findMany({
      where: { empresaId, estado: 'ACTIVA' },
    });

    return {
      totalPromocionesActivas: promotions.length,
      promociones: promotions.map((p) => ({
        nombre: p.nombre,
        tipo: p.tipoDescuento,
        valorDescuento: p.tipoDescuento === 'PORCENTAJE' ? `${p.valorDescuento}%` : `RD$ ${p.valorDescuento}`,
        alcance: p.alcance,
        fechaInicio: p.fechaInicio.toISOString().split('T')[0],
        fechaFin: p.fechaFin ? p.fechaFin.toISOString().split('T')[0] : 'Indefinido',
      })),
    };
  }

  /**
   * Query DGII Fiscal NCF Sequences
   */
  async queryFiscalSequences(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryFiscalSequences for empresaId: ${empresaId}`);

    const secuencias = await this.prisma.secuenciaNCF.findMany({
      where: { empresaId },
      orderBy: { tipo: 'asc' },
    });

    return {
      totalSecuencias: secuencias.length,
      secuencias: secuencias.map((s) => {
        const remaining = s.numeroHasta - s.numeroActual;
        return {
          nombre: s.nombre,
          tipo: s.tipo,
          prefijo: s.prefijo,
          numeroActual: s.numeroActual,
          numeroFinal: s.numeroHasta,
          disponibles: remaining,
          alertaAgotamiento: remaining < 50,
          fechaVencimiento: s.fechaVencimiento ? s.fechaVencimiento.toISOString().split('T')[0] : 'Sin vencimiento',
          estado: s.activa ? 'ACTIVA' : 'INACTIVA',
        };
      }),
    };
  }
}

