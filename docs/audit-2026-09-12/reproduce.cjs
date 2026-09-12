// Read-only reproductions against compiled services with in-memory Prisma doubles.
// These assertions confirm CURRENT defects; they are not production acceptance tests.
// Run after npm run build:api: node docs/audit-2026-09-12/reproduce.cjs
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const { Prisma } = require('node:module').createRequire(path.join(root, 'apps/api/package.json'))('@prisma/client');
const D = value => new Prisma.Decimal(value);
const load = file => require(path.join(root, 'apps/api/dist/src/modules', file));
const { CustomerPaymentsService } = load('customer-payments/customer-payments.service.js');
const { PurchasesService } = load('purchases/purchases.service.js');
const { QuotesService } = load('quotes/quotes.service.js');
const { ReportsService } = load('reports/reports.service.js');
const { TenantApiKeyGuard } = load('tenant-api/guards/tenant-api-key.guard.js');
const log = { log: async () => {} };
const results = [];
(async () => {
  let paid, applied = D(0);
  const tx = {
    facturaVenta: {
      findFirst: async () => ({ id: 'invoice', balancePendiente: D(100), estado: 'EMITIDA' }),
      update: async ({ data }) => {
        if (data.balancePendiente) applied = applied.add(data.balancePendiente.decrement);
        return { balancePendiente: D(100).sub(applied) };
      },
    },
    pagoCliente: { findFirst: async () => null, create: async ({ data }) => (paid = { id: 'receipt', ...data }) },
    aplicacionPago: { create: async () => ({}) },
  };
  const service = new CustomerPaymentsService({ cliente: { findFirst: async () => ({ nombreRazonSocial: 'Synthetic client' }) }, $transaction: fn => fn(tx) }, log);
  service.findOne = async () => paid;
  await service.create('tenant', 'user', { clienteId: 'client', monto: 1, aplicaciones: [{ facturaId: 'invoice', monto: 100 }] });
  assert.equal(paid.monto.toString(), '1'); assert.equal(applied.toString(), '100');
  results.push({ finding: 'F01', confirmed: true, received: 1, applied: 100 });

  const supplierPayments = [], purchaseWrites = [];
  const purchase = { id: 'purchase', proveedorId: 'supplier', numeroFactura: 'COM-1', estado: 'REGISTRADA', balancePendiente: D(100), montoPagado: D(0) };
  const supplierTx = {
    pagoProveedor: { create: async ({ data }) => { supplierPayments.push(data); return { id: String(supplierPayments.length), ...data }; } },
    aplicacionPagoProveedor: { create: async () => ({}) },
    facturaCompra: { update: async ({ data }) => { purchaseWrites.push(data); return data; } },
  };
  const purchases = new PurchasesService({ $transaction: fn => fn(supplierTx) }, log);
  purchases.findOne = async () => ({ ...purchase });
  await Promise.all([purchases.registerPayment('tenant','user','purchase',{monto:80,metodo:'EFECTIVO'}), purchases.registerPayment('tenant','user','purchase',{monto:80,metodo:'EFECTIVO'})]);
  assert.equal(supplierPayments.reduce((a,p) => a.add(p.monto), D(0)).toString(), '160');
  assert.equal(purchaseWrites.at(-1).montoPagado.toString(), '80');
  results.push({ finding: 'F02', confirmed: true, paymentsTotal: 160, recordedPaid: 80, recordedBalance: 20, limitation: 'In-memory concurrent service calls; PostgreSQL interleaving still requires integration test' });

  let invoice;
  const quote = { id: 'quote', numeroCotizacion: 'COT-1', estado: 'PENDIENTE', clienteId: null, detalles: [{ productoId: 'product', cantidad: D(1), precioUnitario: D(100), tasaItbis: D(0), descuento:D(0), itbis:D(0), subtotal:D(100), total:D(100) }], total:D(100), subtotal:D(100), descuento:D(0), itbis:D(0) };
  const quoteTx = { facturaVenta: { findFirst: async () => null, create: async ({ data }) => (invoice = { id:'invoice', ...data }) }, cotizacion: { update: async ({ data }) => data } };
  const quotes = new QuotesService({ cotizacion: { findFirst: async () => quote }, $transaction: fn => fn(quoteTx) }, log);
  await quotes.convertToInvoice('tenant','user','quote');
  assert.equal(invoice.estado,'EMITIDA'); assert.equal(invoice.clienteId,null); assert.equal(invoice.ncf,undefined);
  results.push({ finding:'F03', confirmed:true, state:invoice.estado, customer:invoice.clienteId, fiscalNumber:null, inventoryOrOutboxCalls:0 });

  const invoices = [['EMITIDA',100,'DOP'],['BORRADOR',50,'DOP'],['EMITIDA',20,'DOP'],['EMITIDA',10,'USD']].map(([estado,total,moneda],i) => ({ id:String(i), numeroFactura:String(i), fecha:new Date('2026-09-12T12:00:00Z'), estado, total:D(total), subtotal:D(total), descuento:D(0), itbis:D(0), moneda }));
  let filter;
  const reports = new ReportsService({ facturaVenta: { findMany: async ({ where }) => { filter = where; return invoices; } } });
  const report = await reports.getSalesReport('tenant');
  assert.deepEqual(filter.estado,{not:'ANULADA'}); assert.equal(report.summary.totalVentas,180);
  results.push({ finding:'F04', confirmed:true, aggregate:180, includesDraft:true, currencies:['DOP','USD'], note:'Third emitted positive row models a credit note; query does not select document type or original invoice' });

  const guard = new TenantApiKeyGuard({ tenantApiApp: { findUnique: async () => ({ id:'app', estado:'ACTIVO', empresaId:'tenant', empresa:{estado:'ACTIVA',suscripcion:{estado:'CANCELED',plan:{id:'enterprise'}}} }), update: async () => ({}) } });
  const req = { headers:{'x-api-key':'synthetic-audit-key'} };
  assert.equal(await guard.canActivate({switchToHttp:()=>({getRequest:()=>req})}),true);
  results.push({finding:'F05',confirmed:true,subscription:'CANCELED',apiAccess:true});
  console.log(JSON.stringify({mode:'in-memory; no network or database',results},null,2));
})().catch(error => { console.error(error); process.exitCode=1; });


