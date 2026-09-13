import { ReportsService } from './reports.service';
import { Prisma } from '@prisma/client';

describe('Receivables currency', () => {
  it('converts balances, aging, debtors and document rows consistently', async () => {
    const invoice = { id: 'a', clienteId: 'c', fecha: new Date(), balancePendiente: new Prisma.Decimal(10), total: new Prisma.Decimal(10), moneda: 'USD', tasaCambio: new Prisma.Decimal(60), facturaOriginalId: null };
    const service = new ReportsService({ facturaVenta: { findMany: jest.fn().mockResolvedValue([invoice]) } } as any);
    const result = await service.getReceivablesReport('tenant');
    expect(result.summary.totalPendiente).toBe(600);
    expect(result.summary.aging.corriente).toBe(600);
    expect(result.topDebtors[0].totalDeuda).toBe(600);
    expect(result.invoices[0].balancePendiente).toBe(600);
  });
  it('rejects foreign documents with invalid exchange rates', async () => {
    const service = new ReportsService({ facturaVenta: { findMany: jest.fn().mockResolvedValue([{ balancePendiente: 10, moneda: 'USD', tasaCambio: 0 }]) } } as any);
    await expect(service.getReceivablesReport('tenant')).rejects.toThrow();
  });

  it('reconciles sales, payment methods and customer totals across currencies and credit notes', async () => {
    const base = { clienteId: 'a', fecha: new Date('2026-09-01'), moneda: 'DOP', tasaCambio: new Prisma.Decimal(1), total: new Prisma.Decimal(100), subtotal: new Prisma.Decimal(100), itbis: new Prisma.Decimal(0), descuento: new Prisma.Decimal(0), tipoPago: 'CREDITO', facturaOriginalId: null };
    const invoices = [base, { ...base, clienteId: 'b', moneda: 'USD', tasaCambio: new Prisma.Decimal(60), total: new Prisma.Decimal(10), fecha: new Date('2026-09-02') }, { ...base, facturaOriginalId: 'original', total: new Prisma.Decimal(20) }];
    const db = { facturaVenta: { findMany: jest.fn().mockResolvedValue(invoices) } };
    const service = new ReportsService(db as any);
    const sales = await service.getSalesReport('tenant', { from: '2026-09-01', to: '2026-09-30' });
    const clients = await service.getSalesByClientReport('tenant');
    expect(sales.summary.totalVentas).toBe(680);
    expect(sales.paymentMethods.reduce((sum, row) => sum + row.total, 0)).toBe(680);
    expect(sales.timeSeries.reduce((sum, row) => sum + row.total, 0)).toBe(680);
    expect(clients.grandTotal).toBe(680);
    expect(clients.clients.map(row => row.totalVentas)).toEqual([600, 80]);
    expect(db.facturaVenta.findMany.mock.calls[0][0].where.estado.notIn).toContain('BORRADOR');
  });
  it('values inventory using the warehouse cost, including an explicit zero', async () => {
    const stocks = [{ productoId: 'a', almacenId: 'w', cantidad: 5, costoPromedio: 0, stockMinimo: 10, producto: { costo: 100, precioVenta: 150, tipo: 'PRODUCTO' } }, { productoId: 'b', almacenId: 'w', cantidad: 2, costoPromedio: 30, stockMinimo: 0, producto: { costo: 100, precioVenta: 150 } }];
    const report = await new ReportsService({ inventarioStock: { findMany: jest.fn().mockResolvedValue(stocks) } } as any).getInventoryReport('tenant');
    expect(report.summary.totalValorCosto).toBe(60);
    expect(report.warehouses[0].valorCosto).toBe(60);
    expect(report.summary.alertaBajoStockCount).toBe(1);
  });
  it('ranks products using signed historical exchange rates', async () => {
    const invoice = { moneda: 'USD', tasaCambio: new Prisma.Decimal(60), facturaOriginalId: null };
    const rows = [{ productoId: 'a', cantidad: 2, total: new Prisma.Decimal(10), factura: invoice }, { productoId: 'b', cantidad: 1, total: new Prisma.Decimal(4), factura: invoice }, { productoId: 'a', cantidad: 1, total: new Prisma.Decimal(2), factura: { ...invoice, facturaOriginalId: 'original' } }];
    const result = await new ReportsService({ facturaVentaDetalle: { findMany: jest.fn().mockResolvedValue(rows) } } as any).getTopProductsReport('tenant');
    expect(result.grandTotal).toBe(720);
    expect(result.products[0].totalVendido).toBe(480);
    expect(result.products[0].cantidadVendida).toBe(1);
  });
});
