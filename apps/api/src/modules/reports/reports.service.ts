import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DateRangeReportDto,
  TopProductsReportDto,
  InventoryReportDto,
  TaxReportDto,
} from './dto/reports.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Limpia RNC o Cédula eliminando guiones y espacios
   */
  private cleanDocNumber(doc?: string | null): string {
    if (!doc) return '';
    return doc.replace(/[^0-9A-Za-z]/g, '').trim();
  }

  /**
   * Helper: Determina tipo de documento DGII (1: RNC, 2: Cédula, 3: Pasaporte)
   */
  private getTipoIdentificacion(doc: string): string {
    const clean = this.cleanDocNumber(doc);
    if (clean.length === 9) return '1';
    if (clean.length === 11) return '2';
    if (clean.length > 0) return '3';
    return '';
  }

  /**
   * Helper: Parsea período 'YYYY-MM' o 'YYYYMM' a rango de fechas y string limpio
   */
  private parsePeriod(periodoStr: string) {
    let raw = (periodoStr || '').replace(/[^0-9]/g, '');
    if (raw.length < 6) {
      const now = new Date();
      raw = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    }
    const year = parseInt(raw.substring(0, 4), 10);
    const month = parseInt(raw.substring(4, 6), 10);

    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const periodoClean = `${year}${month.toString().padStart(2, '0')}`;

    return { start, end, periodoClean, year, month };
  }

  /**
   * Helper: Obtiene RNC de la empresa
   */
  private async getEmpresaRnc(empresaId: string): Promise<string> {
    const emp = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { rnc: true, razonSocial: true },
    });
    return this.cleanDocNumber(emp?.rnc) || '000000000';
  }

  /**
   * Helper: Formatea fecha a YYYYMMDD
   */
  private formatDateDgii(d: Date | string | null | undefined): string {
    if (!d) return '';
    const date = new Date(d);
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${y}${m}${day}`;
  }

  /**
   * Sales Report: totals, time-series breakdown, payment methods, status summary
   */
  async getSalesReport(empresaId: string, dto?: DateRangeReportDto) {
    const where: Prisma.FacturaVentaWhereInput = {
      empresaId,
      estado: { not: 'ANULADA' },
    };

    if (dto?.sucursalId) {
      where.sucursalId = dto.sucursalId;
    }

    if (dto?.from || dto?.to) {
      where.fecha = {};
      if (dto.from)
        where.fecha.gte = new Date(
          dto.from.includes('T') ? dto.from : `${dto.from}T00:00:00.000Z`,
        );
      if (dto.to)
        where.fecha.lte = new Date(
          dto.to.includes('T') ? dto.to : `${dto.to}T23:59:59.999Z`,
        );
    }

    const invoices = await this.prisma.facturaVenta.findMany({
      where,
      select: {
        id: true,
        numeroFactura: true,
        fecha: true,
        subtotal: true,
        descuento: true,
        itbis: true,
        total: true,
        estado: true,
        tipoPago: true,
        metodoPago: true,
        moneda: true,
      },
      orderBy: { fecha: 'asc' },
    });

    let totalVentas = new Prisma.Decimal(0);
    let totalItbis = new Prisma.Decimal(0);
    let totalDescuento = new Prisma.Decimal(0);
    let totalSubtotal = new Prisma.Decimal(0);

    const paymentMethods: Record<string, { count: number; total: number }> = {};
    const periodsMap: Record<
      string,
      { date: string; total: number; count: number; itbis: number }
    > = {};

    for (const inv of invoices) {
      totalVentas = totalVentas.add(inv.total);
      totalItbis = totalItbis.add(inv.itbis);
      totalDescuento = totalDescuento.add(inv.descuento);
      totalSubtotal = totalSubtotal.add(inv.subtotal);

      const method = inv.metodoPago || 'EFECTIVO';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].total += Number(inv.total);

      const dateKey = inv.fecha.toISOString().split('T')[0];
      if (!periodsMap[dateKey]) {
        periodsMap[dateKey] = { date: dateKey, total: 0, count: 0, itbis: 0 };
      }
      periodsMap[dateKey].total += Number(inv.total);
      periodsMap[dateKey].count += 1;
      periodsMap[dateKey].itbis += Number(inv.itbis);
    }

    const count = invoices.length;
    const promedioTicket = count > 0 ? Number(totalVentas) / count : 0;
    const timeSeries = Object.values(periodsMap).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return {
      summary: {
        totalVentas: Number(totalVentas),
        totalItbis: Number(totalItbis),
        totalDescuento: Number(totalDescuento),
        totalSubtotal: Number(totalSubtotal),
        totalFacturas: count,
        promedioTicket,
      },
      paymentMethods: Object.entries(paymentMethods).map(([metodo, data]) => ({
        metodo,
        ...data,
      })),
      timeSeries,
    };
  }

  /**
   * Top Selling Products Report
   */
  async getTopProductsReport(empresaId: string, dto?: TopProductsReportDto) {
    const whereInvoice: Prisma.FacturaVentaWhereInput = {
      empresaId,
      estado: { not: 'ANULADA' },
    };

    if (dto?.sucursalId) {
      whereInvoice.sucursalId = dto.sucursalId;
    }

    if (dto?.from || dto?.to) {
      whereInvoice.fecha = {};
      if (dto.from)
        whereInvoice.fecha.gte = new Date(
          dto.from.includes('T') ? dto.from : `${dto.from}T00:00:00.000Z`,
        );
      if (dto.to)
        whereInvoice.fecha.lte = new Date(
          dto.to.includes('T') ? dto.to : `${dto.to}T23:59:59.999Z`,
        );
    }

    const details = await this.prisma.facturaVentaDetalle.findMany({
      where: {
        factura: whereInvoice,
      },
      include: {
        producto: {
          include: {
            categoria: true,
            marca: true,
          },
        },
      },
    });

    const productMap: Record<
      string,
      {
        productoId: string;
        nombre: string;
        codigo: string;
        categoria: string;
        marca: string;
        cantidadVendida: number;
        totalVendido: number;
        costoEstimado: number;
        margenEstimado: number;
      }
    > = {};

    let grandTotal = 0;

    for (const d of details) {
      const pid = d.productoId;
      const qty = Number(d.cantidad);
      const tot = Number(d.total);
      const cost = Number(d.producto?.costo || 0) * qty;

      grandTotal += tot;

      if (!productMap[pid]) {
        productMap[pid] = {
          productoId: pid,
          nombre: d.producto?.nombre || 'Producto desconocido',
          codigo: d.producto?.codigo || '-',
          categoria: d.producto?.categoria?.nombre || 'Sin categoría',
          marca: d.producto?.marca?.nombre || 'Sin marca',
          cantidadVendida: 0,
          totalVendido: 0,
          costoEstimado: 0,
          margenEstimado: 0,
        };
      }

      productMap[pid].cantidadVendida += qty;
      productMap[pid].totalVendido += tot;
      productMap[pid].costoEstimado += cost;
      productMap[pid].margenEstimado =
        productMap[pid].totalVendido - productMap[pid].costoEstimado;
    }

    const limit = dto?.limit || 10;
    const sorted = Object.values(productMap)
      .sort((a, b) => b.totalVendido - a.totalVendido)
      .slice(0, limit)
      .map((p) => ({
        ...p,
        porcentajeDelTotal:
          grandTotal > 0 ? (p.totalVendido / grandTotal) * 100 : 0,
      }));

    return {
      grandTotal,
      products: sorted,
    };
  }

  /**
   * Receivables Report
   */
  async getReceivablesReport(empresaId: string) {
    const invoices = await this.prisma.facturaVenta.findMany({
      where: {
        empresaId,
        estado: { notIn: ['ANULADA', 'PAGADA'] },
        balancePendiente: { gt: 0 },
      },
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
    let totalPendiente = 0;
    let totalCorriente = 0;
    let total31a60 = 0;
    let total61a90 = 0;
    let totalMas90 = 0;

    const clientsMap: Record<
      string,
      {
        clienteId: string;
        nombre: string;
        documento: string;
        telefono?: string;
        email?: string;
        totalDeuda: number;
        facturasPendientes: number;
      }
    > = {};

    for (const inv of invoices) {
      const balance = Number(inv.balancePendiente);
      totalPendiente += balance;

      const dueDate = inv.fechaVencimiento
        ? new Date(inv.fechaVencimiento)
        : new Date(inv.fecha);
      const diffDays = Math.floor(
        (now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24),
      );

      if (diffDays <= 30) {
        totalCorriente += balance;
      } else if (diffDays <= 60) {
        total31a60 += balance;
      } else if (diffDays <= 90) {
        total61a90 += balance;
      } else {
        totalMas90 += balance;
      }

      const cid = inv.clienteId || 'sin_cliente';
      if (!clientsMap[cid]) {
        clientsMap[cid] = {
          clienteId: cid,
          nombre: inv.cliente?.nombreRazonSocial || 'Cliente General',
          documento: inv.cliente?.numeroDocumento || '-',
          telefono: inv.cliente?.telefono || undefined,
          email: inv.cliente?.email || undefined,
          totalDeuda: 0,
          facturasPendientes: 0,
        };
      }
      clientsMap[cid].totalDeuda += balance;
      clientsMap[cid].facturasPendientes += 1;
    }

    return {
      summary: {
        totalPendiente,
        totalFacturasPendientes: invoices.length,
        aging: {
          corriente: totalCorriente,
          de31a60: total31a60,
          de61a90: total61a90,
          masDe90: totalMas90,
        },
      },
      topDebtors: Object.values(clientsMap).sort(
        (a, b) => b.totalDeuda - a.totalDeuda,
      ),
      invoices: invoices.map((i) => ({
        id: i.id,
        numeroFactura: i.numeroFactura,
        ncf: i.ncf,
        fecha: i.fecha,
        fechaVencimiento: i.fechaVencimiento,
        total: Number(i.total),
        balancePendiente: Number(i.balancePendiente),
        clienteNombre: i.cliente?.nombreRazonSocial || 'Cliente General',
        clienteDocumento: i.cliente?.numeroDocumento || '-',
      })),
    };
  }

  /**
   * Inventory Report
   */
  async getInventoryReport(empresaId: string, dto?: InventoryReportDto) {
    const whereStock: Prisma.InventarioStockWhereInput = {
      empresaId,
    };

    if (dto?.almacenId) {
      whereStock.almacenId = dto.almacenId;
    }

    const stocks = await this.prisma.inventarioStock.findMany({
      where: whereStock,
      include: {
        producto: {
          include: {
            categoria: true,
            unidadMedida: true,
          },
        },
        almacen: true,
      },
    });

    let totalValorCosto = 0;
    let totalValorVenta = 0;
    let totalUnidades = 0;
    const lowStockItems: any[] = [];
    const warehouseBreakdown: Record<
      string,
      {
        almacenId: string;
        nombre: string;
        totalItems: number;
        valorCosto: number;
      }
    > = {};

    for (const s of stocks) {
      const qty = Number(s.cantidad);
      const cost = Number(s.producto?.costo || s.costoPromedio || 0);
      const price = Number(s.producto?.precioVenta || 0);
      const minStock = Number(s.stockMinimo || 0);

      totalUnidades += qty;
      totalValorCosto += cost * qty;
      totalValorVenta += price * qty;

      if (qty <= minStock && s.producto?.tipo !== 'SERVICIO') {
        lowStockItems.push({
          productoId: s.productoId,
          codigo: s.producto?.codigo,
          nombre: s.producto?.nombre,
          almacenNombre: s.almacen?.nombre,
          cantidadActual: qty,
          stockMinimo: minStock,
          unidad: s.producto?.unidadMedida?.abreviatura || 'UND',
        });
      }

      const wId = s.almacenId;
      if (!warehouseBreakdown[wId]) {
        warehouseBreakdown[wId] = {
          almacenId: wId,
          nombre: s.almacen?.nombre || 'Almacén',
          totalItems: 0,
          valorCosto: 0,
        };
      }
      warehouseBreakdown[wId].totalItems += qty;
      warehouseBreakdown[wId].valorCosto += cost * qty;
    }

    return {
      summary: {
        totalItemsDistintos: stocks.length,
        totalUnidades,
        totalValorCosto,
        totalValorVenta,
        gananciaPotencial: totalValorVenta - totalValorCosto,
        alertaBajoStockCount: lowStockItems.length,
      },
      lowStockItems,
      warehouses: Object.values(warehouseBreakdown),
    };
  }

  /**
   * Sales by Client Report
   */
  async getSalesByClientReport(empresaId: string, dto?: DateRangeReportDto) {
    const where: Prisma.FacturaVentaWhereInput = {
      empresaId,
      estado: { not: 'ANULADA' },
    };

    if (dto?.from || dto?.to) {
      where.fecha = {};
      if (dto.from)
        where.fecha.gte = new Date(
          dto.from.includes('T') ? dto.from : `${dto.from}T00:00:00.000Z`,
        );
      if (dto.to)
        where.fecha.lte = new Date(
          dto.to.includes('T') ? dto.to : `${dto.to}T23:59:59.999Z`,
        );
    }

    const invoices = await this.prisma.facturaVenta.findMany({
      where,
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
      },
    });

    const clientMap: Record<
      string,
      {
        clienteId: string;
        nombre: string;
        documento: string;
        email?: string;
        telefono?: string;
        totalVentas: number;
        totalFacturas: number;
      }
    > = {};

    let grandTotal = 0;

    for (const inv of invoices) {
      const cid = inv.clienteId || 'sin_cliente';
      const tot = Number(inv.total);
      grandTotal += tot;

      if (!clientMap[cid]) {
        clientMap[cid] = {
          clienteId: cid,
          nombre: inv.cliente?.nombreRazonSocial || 'Cliente General',
          documento: inv.cliente?.numeroDocumento || '-',
          email: inv.cliente?.email || undefined,
          telefono: inv.cliente?.telefono || undefined,
          totalVentas: 0,
          totalFacturas: 0,
        };
      }

      clientMap[cid].totalVentas += tot;
      clientMap[cid].totalFacturas += 1;
    }

    const clients = Object.values(clientMap)
      .map((c) => ({
        ...c,
        promedioTicket:
          c.totalFacturas > 0 ? c.totalVentas / c.totalFacturas : 0,
        porcentajeParticipacion:
          grandTotal > 0 ? (c.totalVentas / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalVentas - a.totalVentas);

    return {
      grandTotal,
      clients,
    };
  }

  // =========================================================================
  // REPORTES FISCALES DGII (REPUBLICA DOMINICANA)
  // =========================================================================

  /**
   * Formato 606: Compras de Bienes y Servicios
   */
  async get606Report(empresaId: string, periodo: string, sucursalId?: string) {
    const { start, end, periodoClean } = this.parsePeriod(periodo);
    const rncEmpresa = await this.getEmpresaRnc(empresaId);

    const where: Prisma.FacturaCompraWhereInput = {
      empresaId,
      estado: { not: 'ANULADA' },
      fecha: { gte: start, lte: end },
    };

    if (sucursalId) {
      where.sucursalId = sucursalId;
    }

    const compras = await this.prisma.facturaCompra.findMany({
      where,
      include: {
        proveedor: true,
        detalles: true,
      },
      orderBy: { fecha: 'asc' },
    });

    let totalMontoServicios = 0;
    let totalMontoBienes = 0;
    let totalFacturado = 0;
    let totalItbisFacturado = 0;
    let totalItbisRetenido = 0;
    let totalRetencionRenta = 0;

    const rows = compras.map((c) => {
      const rncCedula = this.cleanDocNumber(c.proveedor?.numeroDocumento);
      const tipoId = this.getTipoIdentificacion(rncCedula);
      const tipoGasto = c.tipoGasto || '02'; // 02: Gastos por Trabajos, Suministros y Servicios

      // Desglose bienes vs servicios
      let servicios = 0;
      let bienes = 0;
      for (const d of c.detalles) {
        const sub = Number(d.subtotal);
        if (d.afectaInventario) {
          bienes += sub;
        } else {
          servicios += sub;
        }
      }
      if (servicios === 0 && bienes === 0) {
        bienes = Number(c.subtotal);
      }

      const tot = Number(c.total);
      const itb = Number(c.itbis);
      const itbRet = Number(c.itbisRetenido || 0);
      const isrRet = Number(c.retencionRenta || 0);

      totalMontoServicios += servicios;
      totalMontoBienes += bienes;
      totalFacturado += tot;
      totalItbisFacturado += itb;
      totalItbisRetenido += itbRet;
      totalRetencionRenta += isrRet;

      // Mapeo forma de pago 606
      let formaPago = '02'; // Cheque / Transferencia / Depósito
      if (c.tipoPago === 'CREDITO') {
        formaPago = '04'; // Compra a Crédito
      } else if (c.metodoPago === 'EFECTIVO') {
        formaPago = '01'; // Efectivo
      } else if (c.metodoPago === 'TARJETA') {
        formaPago = '03'; // Tarjeta Débito / Crédito
      }

      return {
        id: c.id,
        rncCedula,
        tipoId,
        tipoGasto,
        ncf: c.ncf || '',
        ncfModificado: c.ncfModificado || '',
        fechaComprobante: this.formatDateDgii(c.fecha),
        fechaPago: this.formatDateDgii(c.fecha),
        montoServicios: servicios,
        montoBienes: bienes,
        totalFacturado: tot,
        itbisFacturado: itb,
        itbisRetenido: itbRet,
        itbisProporcionalidad: 0,
        itbisCosto: 0,
        itbisAdelantar: Math.max(0, itb - itbRet),
        itbisPercibido: 0,
        tipoRetencionIsr: isrRet > 0 ? '02' : '',
        retencionRenta: isrRet,
        isrPercibido: 0,
        formaPago,
        proveedorNombre:
          c.proveedor?.nombreRazonSocial || 'Proveedor no registrado',
      };
    });

    // Formato TXT DGII delimitado por pipes
    const header = `606|${rncEmpresa}|${periodoClean}|${rows.length}`;
    const txtLines = rows.map((r) =>
      [
        r.rncCedula,
        r.tipoId,
        r.tipoGasto,
        r.ncf,
        r.ncfModificado,
        r.fechaComprobante,
        r.fechaPago,
        r.montoServicios.toFixed(2),
        r.montoBienes.toFixed(2),
        r.totalFacturado.toFixed(2),
        r.itbisFacturado.toFixed(2),
        r.itbisRetenido.toFixed(2),
        r.itbisProporcionalidad.toFixed(2),
        r.itbisCosto.toFixed(2),
        r.itbisAdelantar.toFixed(2),
        r.itbisPercibido.toFixed(2),
        r.tipoRetencionIsr,
        r.retencionRenta.toFixed(2),
        r.isrPercibido.toFixed(2),
        r.formaPago,
      ].join('|'),
    );

    const txtContent = [header, ...txtLines].join('\r\n');

    return {
      periodo: periodoClean,
      rncEmpresa,
      summary: {
        totalRegistros: rows.length,
        totalMontoServicios,
        totalMontoBienes,
        totalFacturado,
        totalItbisFacturado,
        totalItbisRetenido,
        totalRetencionRenta,
      },
      rows,
      txtContent,
      filename: `DGII_606_${rncEmpresa}_${periodoClean}.txt`,
    };
  }

  /**
   * Formato 607: Ventas de Bienes y Servicios
   */
  async get607Report(empresaId: string, periodo: string, sucursalId?: string) {
    const { start, end, periodoClean } = this.parsePeriod(periodo);
    const rncEmpresa = await this.getEmpresaRnc(empresaId);

    const where: Prisma.FacturaVentaWhereInput = {
      empresaId,
      estado: { not: 'ANULADA' },
      ncf: { not: null },
      fecha: { gte: start, lte: end },
    };

    if (sucursalId) {
      where.sucursalId = sucursalId;
    }

    const ventas = await this.prisma.facturaVenta.findMany({
      where,
      include: {
        cliente: true,
      },
      orderBy: { fecha: 'asc' },
    });

    let totalMontoFacturado = 0;
    let totalItbisFacturado = 0;
    let totalEfectivo = 0;
    let totalChequeTransf = 0;
    let totalTarjeta = 0;
    let totalCredito = 0;

    const rows = ventas.map((v) => {
      const rncCedula = this.cleanDocNumber(v.cliente?.numeroDocumento);
      const tipoId = rncCedula ? this.getTipoIdentificacion(rncCedula) : '';
      const tipoIngreso = '01'; // 01: Ingresos por operaciones (no financieros)

      const sub = Number(v.subtotal);
      const itb = Number(v.itbis);
      const tot = Number(v.total);

      totalMontoFacturado += sub;
      totalItbisFacturado += itb;

      let efectivo = 0;
      let chequeTransf = 0;
      let tarjeta = 0;
      let credito = 0;

      if (v.tipoPago === 'CREDITO') {
        credito = tot;
        totalCredito += tot;
      } else if (v.metodoPago === 'EFECTIVO') {
        efectivo = tot;
        totalEfectivo += tot;
      } else if (v.metodoPago === 'TARJETA') {
        tarjeta = tot;
        totalTarjeta += tot;
      } else {
        chequeTransf = tot;
        totalChequeTransf += tot;
      }

      return {
        id: v.id,
        rncCedula,
        tipoId,
        ncf: v.ncf || '',
        ncfModificado: v.ncfModificado || '',
        tipoIngreso,
        fechaComprobante: this.formatDateDgii(v.fecha),
        fechaRetencion: '',
        montoFacturado: sub,
        itbisFacturado: itb,
        itbisRetenido: 0,
        itbisPercibido: 0,
        retencionRenta: 0,
        isrPercibido: 0,
        isc: 0,
        otrosImpuestos: 0,
        propinaLegal: 0,
        montoEfectivo: efectivo,
        montoChequeTransf: chequeTransf,
        montoTarjeta: tarjeta,
        montoCredito: credito,
        montoBonos: 0,
        montoPermuta: 0,
        montoOtrasFormas: 0,
        clienteNombre: v.cliente?.nombreRazonSocial || 'Consumidor Final',
      };
    });

    const header = `607|${rncEmpresa}|${periodoClean}|${rows.length}`;
    const txtLines = rows.map((r) =>
      [
        r.rncCedula,
        r.tipoId,
        r.ncf,
        r.ncfModificado,
        r.tipoIngreso,
        r.fechaComprobante,
        r.fechaRetencion,
        r.montoFacturado.toFixed(2),
        r.itbisFacturado.toFixed(2),
        r.itbisRetenido.toFixed(2),
        r.itbisPercibido.toFixed(2),
        r.retencionRenta.toFixed(2),
        r.isrPercibido.toFixed(2),
        r.isc.toFixed(2),
        r.otrosImpuestos.toFixed(2),
        r.propinaLegal.toFixed(2),
        r.montoEfectivo.toFixed(2),
        r.montoChequeTransf.toFixed(2),
        r.montoTarjeta.toFixed(2),
        r.montoCredito.toFixed(2),
        r.montoBonos.toFixed(2),
        r.montoPermuta.toFixed(2),
        r.montoOtrasFormas.toFixed(2),
      ].join('|'),
    );

    const txtContent = [header, ...txtLines].join('\r\n');

    return {
      periodo: periodoClean,
      rncEmpresa,
      summary: {
        totalRegistros: rows.length,
        totalMontoFacturado,
        totalItbisFacturado,
        totalEfectivo,
        totalChequeTransf,
        totalTarjeta,
        totalCredito,
      },
      rows,
      txtContent,
      filename: `DGII_607_${rncEmpresa}_${periodoClean}.txt`,
    };
  }

  /**
   * Formato 608: Comprobantes Anulados
   */
  async get608Report(empresaId: string, periodo: string, sucursalId?: string) {
    const { start, end, periodoClean } = this.parsePeriod(periodo);
    const rncEmpresa = await this.getEmpresaRnc(empresaId);

    const where: Prisma.FacturaVentaWhereInput = {
      empresaId,
      estado: 'ANULADA',
      ncf: { not: null },
      fecha: { gte: start, lte: end },
    };

    if (sucursalId) {
      where.sucursalId = sucursalId;
    }

    const anuladas = await this.prisma.facturaVenta.findMany({
      where,
      orderBy: { fecha: 'asc' },
    });

    const rows = anuladas.map((a) => {
      // Tipo Anulación: 05 Corrección de la información, 02 Errores de impresión, 07 Devolución
      const tipoAnulacion = a.motivoModificacion || '05';

      return {
        id: a.id,
        ncf: a.ncf || '',
        fechaAnulacion: this.formatDateDgii(a.actualizadoEn || a.fecha),
        tipoAnulacion,
        motivo: a.notas || 'Factura anulada en sistema',
        numeroFactura: a.numeroFactura,
      };
    });

    const header = `608|${rncEmpresa}|${periodoClean}|${rows.length}`;
    const txtLines = rows.map((r) =>
      [r.ncf, r.fechaAnulacion, r.tipoAnulacion].join('|'),
    );

    const txtContent = [header, ...txtLines].join('\r\n');

    return {
      periodo: periodoClean,
      rncEmpresa,
      summary: {
        totalRegistros: rows.length,
      },
      rows,
      txtContent,
      filename: `DGII_608_${rncEmpresa}_${periodoClean}.txt`,
    };
  }

  /**
   * Borrador de Declaración Jurada IT-1 (Liquidación de ITBIS)
   */
  async getIt1Report(empresaId: string, periodo: string, sucursalId?: string) {
    const { periodoClean, year, month } = this.parsePeriod(periodo);
    const rncEmpresa = await this.getEmpresaRnc(empresaId);

    const [rep606, rep607] = await Promise.all([
      this.get606Report(empresaId, periodo, sucursalId),
      this.get607Report(empresaId, periodo, sucursalId),
    ]);

    // Casillas IT-1 oficiales DGII
    const totalIngresosOperaciones = rep607.summary.totalMontoFacturado;
    const ingresosGravados18 = totalIngresosOperaciones; // En este ERP general todo ingreso con ITBIS
    const itbisFacturadoVentas = rep607.summary.totalItbisFacturado;

    const itbisBienesCompras = rep606.rows.reduce(
      (acc, r) => acc + (r.montoBienes > 0 ? r.itbisFacturado : 0),
      0,
    );
    const itbisServiciosCompras = rep606.rows.reduce(
      (acc, r) => acc + (r.montoServicios > 0 ? r.itbisFacturado : 0),
      0,
    );
    const totalItbisDeducibleCompras = rep606.summary.totalItbisFacturado;
    const itbisRetenidoCompras = rep606.summary.totalItbisRetenido;

    // Liquidación
    const impuestoLiquidado =
      itbisFacturadoVentas - totalItbisDeducibleCompras;
    const itbisAPagar = Math.max(
      0,
      impuestoLiquidado - itbisRetenidoCompras,
    );
    const saldoAFavor = impuestoLiquidado < 0 ? Math.abs(impuestoLiquidado) : 0;

    return {
      periodo: periodoClean,
      year,
      month,
      rncEmpresa,
      operaciones: {
        totalIngresos: totalIngresosOperaciones,
        ingresosExentos: 0,
        ingresosGravados18,
        ingresosGravados16: 0,
        totalItbisCobrado: itbisFacturadoVentas,
      },
      deducciones: {
        itbisComprasLocales: itbisBienesCompras,
        itbisServiciosDeducibles: itbisServiciosCompras,
        totalItbisDeducible: totalItbisDeducibleCompras,
        itbisRetenido: itbisRetenidoCompras,
      },
      liquidacion: {
        impuestoLiquidado,
        itbisAPagar,
        saldoAFavor,
      },
    };
  }
}
