import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { CustomerPaymentsService } from '../src/modules/customer-payments/customer-payments.service';
import { PurchasesService } from '../src/modules/purchases/purchases.service';
import { QuotesService } from '../src/modules/quotes/quotes.service';
import { ReportsService } from '../src/modules/reports/reports.service';
const url = process.env.TEST_DATABASE_URL;
if (url && !/^dolphin_test_/.test(new URL(url).pathname.slice(1))) throw new Error('Isolated database required');
(url ? describe : describe.skip)('Business integrity on PostgreSQL', () => {
  let db: PrismaClient; let company: any; let user: any; let client: any; let supplier: any;
  const activity = { log: jest.fn().mockResolvedValue(undefined) };
  beforeAll(async () => { db = new PrismaClient({ datasources: { db: { url } } }); await db.$connect(); });
  afterAll(async () => { await db?.$disconnect(); });
  beforeEach(async () => {
    user = await db.usuario.create({ data: { email: randomUUID()+'@example.invalid', passwordHash: '!test' } });
    const plan = await db.plan.create({ data: { id: randomUUID(), nombre: 'Test', precioMensual: 1, precioAnual: 12, maxUsuarios: 2, maxSucursales: 1, maxProductos: 2 } });
    company = await db.empresa.create({ data: { razonSocial: 'Test', propietarioId: user.id, membresias: { create: { usuarioId: user.id } }, suscripcion: { create: { planId: plan.id, estado: 'ACTIVE', fechaRenovacion: new Date(Date.now()+86400000) } } } });
    client = await db.cliente.create({ data: { empresaId: company.id, nombreRazonSocial: 'Client', numeroDocumento: randomUUID() } });
    supplier = await db.proveedor.create({ data: { empresaId: company.id, nombreRazonSocial: 'Supplier', numeroDocumento: randomUUID() } });
  });
  const invoice = (extra = {}) => db.facturaVenta.create({ data: { empresaId: company.id, clienteId: client.id, numeroFactura: 'FAC-'+randomUUID(), subtotal: 100, itbis: 0, total: 100, balancePendiente: 100, tipoPago: 'CREDITO', estado: 'EMITIDA', ...extra } });
  it('rejects mismatched receipt amounts and cross-currency applications', async () => {
    const inv = await invoice(); const service = new CustomerPaymentsService(db as any, activity as any);
    await expect(service.create(company.id,user.id,{clienteId:client.id,monto:1,aplicaciones:[{facturaId:inv.id,monto:100}]} as any)).rejects.toThrow();
    await expect(service.create(company.id,user.id,{clienteId:client.id,monto:10,moneda:'USD',facturaId:inv.id} as any)).rejects.toThrow();
    expect(await db.pagoCliente.count({where:{empresaId:company.id}})).toBe(0);
  });
  it('accepts only one of two concurrent customer payments exceeding the balance', async () => {
    const inv=await invoice(); const service=new CustomerPaymentsService(db as any,activity as any);
    const results=await Promise.allSettled([1,2].map(()=>service.create(company.id,user.id,{clienteId:client.id,monto:80,facturaId:inv.id} as any)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const stored=await db.facturaVenta.findUniqueOrThrow({where:{id:inv.id}});expect(Number(stored.balancePendiente)).toBe(20);expect(Number(stored.montoPagado)).toBe(80);
  });
  it('reverses a receipt only once under concurrent cancellation', async () => {
    const inv=await invoice(); const service=new CustomerPaymentsService(db as any,activity as any);
    const receipt=await service.create(company.id,user.id,{clienteId:client.id,monto:80,facturaId:inv.id} as any);
    const results=await Promise.allSettled([1,2].map(()=>service.cancel(company.id,user.id,receipt.id)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(Number((await db.facturaVenta.findUniqueOrThrow({where:{id:inv.id}})).balancePendiente)).toBe(100);
  });
  it('serializes supplier payments and rejects cancellation of paid purchases', async () => {
    const purchase=await db.facturaCompra.create({data:{empresaId:company.id,proveedorId:supplier.id,numeroFactura:randomUUID(),subtotal:100,total:100,balancePendiente:100,tipoPago:'CREDITO'}});
    const service=new PurchasesService(db as any,activity as any);
    const results=await Promise.allSettled([1,2].map(()=>service.registerPayment(company.id,user.id,purchase.id,{monto:80,metodo:'EFECTIVO'} as any)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(Number((await db.facturaCompra.findUniqueOrThrow({where:{id:purchase.id}})).balancePendiente)).toBe(20);
    await expect(service.cancel(company.id,user.id,purchase.id)).rejects.toThrow();
  });
  it('allocates global discount before computing mixed-rate taxes', async () => {
    const service=new PurchasesService(db as any,activity as any);
    const purchase=await service.create(company.id,user.id,{proveedorId:supplier.id,tipoPago:'CREDITO',descuento:20,items:[{descripcion:'A',cantidad:1,costoUnitario:100,tasaItbis:18},{descripcion:'B',cantidad:1,costoUnitario:100,tasaItbis:0}]} as any);
    expect(Number(purchase.itbis)).toBe(16.2);expect(Number(purchase.total)).toBe(196.2);
    expect(purchase.detalles.reduce((n,d)=>n+Number(d.total),0)).toBe(196.2);
  });
  it('converts a quotation once to an unissued draft', async () => {
    const quote=await db.cotizacion.create({data:{empresaId:company.id,clienteId:client.id,numeroCotizacion:randomUUID(),estado:'ACEPTADA',subtotal:100,total:100}});
    const service=new QuotesService(db as any,activity as any,{} as any,{} as any);
    const results=await Promise.allSettled([1,2].map(()=>service.convertToInvoice(company.id,user.id,quote.id)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    const stored=await db.facturaVenta.findFirstOrThrow({where:{empresaId:company.id}});
    expect(stored.estado).toBe('BORRADOR');expect(stored.ncf).toBeNull();expect(Number(stored.balancePendiente)).toBe(0);
  });
  it('excludes drafts, subtracts credit notes and converts stored USD amounts', async () => {
    const original=await invoice();await invoice({estado:'BORRADOR',total:50});await invoice({facturaOriginalId:original.id,total:20});await invoice({moneda:'USD',tasaCambio:60,total:10});
    const report=await new ReportsService(db as any).getSalesReport(company.id);
    expect(report.summary.totalVentas).toBe(680);expect(report.moneda).toBe('DOP');
  });
  it('reserves branch quota atomically including direct service writes', async () => {
    const results=await Promise.allSettled([1,2].map(n=>db.sucursal.create({data:{empresaId:company.id,nombre:'Branch '+n}})));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(await db.sucursal.count({where:{empresaId:company.id}})).toBe(1);
  });
});
