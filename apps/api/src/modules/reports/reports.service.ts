import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DateRangeReportDto,
  TopProductsReportDto,
  InventoryReportDto,
} from './dto/reports.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

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
      if (dto.from) where.fecha.gte = new Date(dto.from);
      if (dto.to) where.fecha.lte = new Date(dto.to);
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
    const periodsMap: Record<string, { date: string; total: number; count: number; itbis: number }> = {};

    for (const inv of invoices) {
      totalVentas = totalVentas.add(inv.total);
      totalItbis = totalItbis.add(inv.itbis);
      totalDescuento = totalDescuento.add(inv.descuento);
      totalSubtotal = totalSubtotal.add(inv.subtotal);

      // Payment method breakdown
      const method = inv.metodoPago || 'EFECTIVO';
      if (!paymentMethods[method]) {
        paymentMethods[method] = { count: 0, total: 0 };
      }
      paymentMethods[method].count += 1;
      paymentMethods[method].total += Number(inv.total);

      // Time series grouping (YYYY-MM-DD or YYYY-MM)
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
    const timeSeries = Object.values(periodsMap).sort((a, b) => a.date.localeCompare(b.date));

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
   * Top Products: Best sellers by volume and gross revenue
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
      if (dto.from) whereInvoice.fecha.gte = new Date(dto.from);
      if (dto.to) whereInvoice.fecha.lte = new Date(dto.to);
    }

    const items = await this.prisma.facturaVentaDetalle.findMany({
      where: {
        factura: whereInvoice,
      },
      select: {
        productoId: true,
        cantidad: true,
        total: true,
        subtotal: true,
        producto: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
            precioVenta: true,
            costo: true,
            categoria: { select: { nombre: true } },
          },
        },
      },
    });

    const productMap: Record<
      string,
      {
        id: string;
        codigo: string;
        nombre: string;
        tipo: string;
        categoria: string;
        cantidadVendida: number;
        totalIngresos: number;
        costoEstimado: number;
        margenEstimado: number;
      }
    > = {};

    for (const item of items) {
      const pid = item.productoId;
      if (!productMap[pid]) {
        productMap[pid] = {
          id: pid,
          codigo: item.producto?.codigo || '',
          nombre: item.producto?.nombre || 'Producto desconocido',
          tipo: item.producto?.tipo || 'PRODUCTO',
          categoria: item.producto?.categoria?.nombre || 'Sin categoría',
          cantidadVendida: 0,
          totalIngresos: 0,
          costoEstimado: 0,
          margenEstimado: 0,
        };
      }

      const qty = Number(item.cantidad);
      const total = Number(item.total);
      const unitCost = Number(item.producto?.costo || 0);

      productMap[pid].cantidadVendida += qty;
      productMap[pid].totalIngresos += total;
      productMap[pid].costoEstimado += unitCost * qty;
    }

    const limit = dto?.limit || 10;
    const sorted = Object.values(productMap)
      .map((p) => ({
        ...p,
        margenEstimado: p.totalIngresos - p.costoEstimado,
      }))
      .sort((a, b) => b.totalIngresos - a.totalIngresos)
      .slice(0, limit);

    return {
      topProducts: sorted,
      totalCount: Object.keys(productMap).length,
    };
  }

  /**
   * Receivables: Outstanding balances, aging buckets, debtor ranking
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
    let totalCorriente = 0; // <= 30 days or not expired
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

      const dueDate = inv.fechaVencimiento ? new Date(inv.fechaVencimiento) : new Date(inv.fecha);
      const diffDays = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));

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
      topDebtors: Object.values(clientsMap).sort((a, b) => b.totalDeuda - a.totalDeuda),
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
   * Inventory Valuation & Low Stock Report
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
    const warehouseBreakdown: Record<string, { almacenId: string; nombre: string; totalItems: number; valorCosto: number }> = {};

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
      if (dto.from) where.fecha.gte = new Date(dto.from);
      if (dto.to) where.fecha.lte = new Date(dto.to);
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
        promedioTicket: c.totalFacturas > 0 ? c.totalVentas / c.totalFacturas : 0,
        porcentajeParticipacion: grandTotal > 0 ? (c.totalVentas / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.totalVentas - a.totalVentas);

    return {
      grandTotal,
      clients,
    };
  }
}
