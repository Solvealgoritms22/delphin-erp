import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export type SalesReportSummary = {
  totalVentas: number;
  totalItbis: number;
  totalDescuento: number;
  totalSubtotal: number;
  totalFacturas: number;
  promedioTicket: number;
}

export type PaymentMethodBreakdown = {
  metodo: string;
  count: number;
  total: number;
}

export type SalesTimeSeriesPoint = {
  date: string;
  total: number;
  count: number;
  itbis: number;
}

export type SalesReportResponse = {
  summary: SalesReportSummary;
  paymentMethods: PaymentMethodBreakdown[];
  timeSeries: SalesTimeSeriesPoint[];
}

export type TopProductItem = {
  id?: string;
  productoId?: string;
  codigo: string;
  nombre: string;
  tipo?: string;
  categoria: string;
  marca?: string;
  cantidadVendida: number;
  totalIngresos?: number;
  totalVendido?: number;
  costoEstimado: number;
  margenEstimado: number;
  porcentajeDelTotal?: number;
}

export type TopProductsReportResponse = {
  topProducts: TopProductItem[];
  products: TopProductItem[];
  totalCount?: number;
  grandTotal?: number;
}

export type ReceivablesAging = {
  corriente: number;
  de31a60: number;
  de61a90: number;
  masDe90: number;
}

export type DebtorClientItem = {
  clienteId: string;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  totalDeuda: number;
  facturasPendientes: number;
}

export type ReceivablesInvoiceItem = {
  id: string;
  numeroFactura: string;
  ncf?: string;
  fecha: string;
  fechaVencimiento?: string;
  total: number;
  balancePendiente: number;
  clienteNombre: string;
  clienteDocumento: string;
}

export type ReceivablesReportResponse = {
  summary: {
    totalPendiente: number;
    totalFacturasPendientes: number;
    aging: ReceivablesAging;
  };
  topDebtors: DebtorClientItem[];
  invoices: ReceivablesInvoiceItem[];
}

export type LowStockItem = {
  productoId: string;
  codigo: string;
  nombre: string;
  almacenNombre: string;
  cantidadActual: number;
  stockMinimo: number;
  unidad: string;
}

export type WarehouseStockSummary = {
  almacenId: string;
  nombre: string;
  totalItems: number;
  valorCosto: number;
}

export type InventoryReportResponse = {
  summary: {
    totalItemsDistintos: number;
    totalUnidades: number;
    totalValorCosto: number;
    totalValorVenta: number;
    gananciaPotencial: number;
    alertaBajoStockCount: number;
  };
  lowStockItems: LowStockItem[];
  warehouses: WarehouseStockSummary[];
}

export type ClientSalesItem = {
  clienteId: string;
  nombre: string;
  documento: string;
  email?: string;
  telefono?: string;
  totalVentas: number;
  totalFacturas: number;
  promedioTicket: number;
  porcentajeParticipacion: number;
}

export type SalesByClientResponse = {
  grandTotal: number;
  totalClients?: number;
  clients: ClientSalesItem[];
}

// =========================================================================
// MODELOS FISCALES DGII (606, 607, 608, IT-1)
// =========================================================================

export type Row606 = {
  id: string;
  rncCedula: string;
  tipoId: string;
  tipoGasto: string;
  ncf: string;
  ncfModificado: string;
  fechaComprobante: string;
  fechaPago: string;
  montoServicios: number;
  montoBienes: number;
  totalFacturado: number;
  itbisFacturado: number;
  itbisRetenido: number;
  itbisProporcionalidad: number;
  itbisCosto: number;
  itbisAdelantar: number;
  itbisPercibido: number;
  tipoRetencionIsr: string;
  retencionRenta: number;
  isrPercibido: number;
  formaPago: string;
  proveedorNombre: string;
}

export type Report606Response = {
  periodo: string;
  rncEmpresa: string;
  summary: {
    totalRegistros: number;
    totalMontoServicios: number;
    totalMontoBienes: number;
    totalFacturado: number;
    totalItbisFacturado: number;
    totalItbisRetenido: number;
    totalRetencionRenta: number;
  };
  rows: Row606[];
  txtContent: string;
  filename: string;
}

export type Row607 = {
  id: string;
  rncCedula: string;
  tipoId: string;
  ncf: string;
  ncfModificado: string;
  tipoIngreso: string;
  fechaComprobante: string;
  fechaRetencion: string;
  montoFacturado: number;
  itbisFacturado: number;
  itbisRetenido: number;
  itbisPercibido: number;
  retencionRenta: number;
  isrPercibido: number;
  isc: number;
  otrosImpuestos: number;
  propinaLegal: number;
  montoEfectivo: number;
  montoChequeTransf: number;
  montoTarjeta: number;
  montoCredito: number;
  montoBonos: number;
  montoPermuta: number;
  montoOtrasFormas: number;
  clienteNombre: string;
}

export type Report607Response = {
  periodo: string;
  rncEmpresa: string;
  summary: {
    totalRegistros: number;
    totalMontoFacturado: number;
    totalItbisFacturado: number;
    totalEfectivo: number;
    totalChequeTransf: number;
    totalTarjeta: number;
    totalCredito: number;
  };
  rows: Row607[];
  txtContent: string;
  filename: string;
}

export type Row608 = {
  id: string;
  ncf: string;
  fechaAnulacion: string;
  tipoAnulacion: string;
  motivo: string;
  numeroFactura: string;
}

export type Report608Response = {
  periodo: string;
  rncEmpresa: string;
  summary: {
    totalRegistros: number;
  };
  rows: Row608[];
  txtContent: string;
  filename: string;
}

export type ReportIt1Response = {
  periodo: string;
  year: number;
  month: number;
  rncEmpresa: string;
  operaciones: {
    totalIngresos: number;
    ingresosExentos: number;
    ingresosGravados18: number;
    ingresosGravados16: number;
    totalItbisCobrado: number;
  };
  deducciones: {
    itbisComprasLocales: number;
    itbisServiciosDeducibles: number;
    totalItbisDeducible: number;
    itbisRetenido: number;
  };
  liquidacion: {
    impuestoLiquidado: number;
    itbisAPagar: number;
    saldoAFavor: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  salesReport = signal<SalesReportResponse>({
    summary: { totalVentas: 0, totalItbis: 0, totalDescuento: 0, totalSubtotal: 0, totalFacturas: 0, promedioTicket: 0 },
    paymentMethods: [],
    timeSeries: [],
  });
  topProductsReport = signal<TopProductsReportResponse>({
    products: [],
    topProducts: [],
    totalCount: 0,
    grandTotal: 0,
  });
  receivablesReport = signal<ReceivablesReportResponse>({
    summary: {
      totalPendiente: 0,
      totalFacturasPendientes: 0,
      aging: { corriente: 0, de31a60: 0, de61a90: 0, masDe90: 0 },
    },
    topDebtors: [],
    invoices: [],
  });
  inventoryReport = signal<InventoryReportResponse>({
    summary: {
      totalItemsDistintos: 0,
      totalUnidades: 0,
      totalValorCosto: 0,
      totalValorVenta: 0,
      gananciaPotencial: 0,
      alertaBajoStockCount: 0,
    },
    lowStockItems: [],
    warehouses: [],
  });
  salesByClientReport = signal<SalesByClientResponse>({
    clients: [],
    totalClients: 0,
    grandTotal: 0,
  });

  report606 = signal<Report606Response | null>(null);
  report607 = signal<Report607Response | null>(null);
  report608 = signal<Report608Response | null>(null);
  reportIt1 = signal<ReportIt1Response | null>(null);

  loading = signal<boolean>(false);

  getSalesReport(filters?: { from?: string; to?: string; sucursalId?: string; groupBy?: string }): Observable<SalesReportResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.sucursalId) params = params.set('sucursalId', filters.sucursalId);
    if (filters?.groupBy) params = params.set('groupBy', filters.groupBy);

    return this.http.get<SalesReportResponse>(`${this.apiUrl}/sales`, { params }).pipe(
      tap({
        next: (data) => {
          this.salesReport.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getTopProducts(filters?: { from?: string; to?: string; limit?: number; sucursalId?: string }): Observable<TopProductsReportResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    if (filters?.limit) params = params.set('limit', String(filters.limit));
    if (filters?.sucursalId) params = params.set('sucursalId', filters.sucursalId);

    return this.http.get<any>(`${this.apiUrl}/top-products`, { params }).pipe(
      tap({
        next: (data) => {
          const rawList = data.products || data.topProducts || [];
          const list: TopProductItem[] = rawList.map((p: any) => ({
            ...p,
            totalIngresos: p.totalIngresos ?? p.totalVendido ?? 0,
            totalVendido: p.totalVendido ?? p.totalIngresos ?? 0,
          }));
          const normalized: TopProductsReportResponse = {
            products: list,
            topProducts: list,
            totalCount: data.totalCount ?? list.length,
            grandTotal: data.grandTotal ?? 0,
          };
          this.topProductsReport.set(normalized);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getReceivables(): Observable<ReceivablesReportResponse> {
    this.loading.set(true);
    return this.http.get<ReceivablesReportResponse>(`${this.apiUrl}/receivables`).pipe(
      tap({
        next: (data) => {
          this.receivablesReport.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getInventory(filters?: { almacenId?: string; categoriaId?: string }): Observable<InventoryReportResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.almacenId) params = params.set('almacenId', filters.almacenId);
    if (filters?.categoriaId) params = params.set('categoriaId', filters.categoriaId);

    return this.http.get<InventoryReportResponse>(`${this.apiUrl}/inventory`, { params }).pipe(
      tap({
        next: (data) => {
          this.inventoryReport.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getSalesByClient(filters?: { from?: string; to?: string }): Observable<SalesByClientResponse> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);

    return this.http.get<SalesByClientResponse>(`${this.apiUrl}/sales-by-client`, { params }).pipe(
      tap({
        next: (data) => {
          this.salesByClientReport.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  // =========================================================================
  // METODOS FISCALES DGII
  // =========================================================================

  get606(periodo: string, sucursalId?: string): Observable<Report606Response> {
    this.loading.set(true);
    let params = new HttpParams().set('periodo', periodo);
    if (sucursalId) params = params.set('sucursalId', sucursalId);

    return this.http.get<Report606Response>(`${this.apiUrl}/tax/606`, { params }).pipe(
      tap({
        next: (data) => {
          this.report606.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  get607(periodo: string, sucursalId?: string): Observable<Report607Response> {
    this.loading.set(true);
    let params = new HttpParams().set('periodo', periodo);
    if (sucursalId) params = params.set('sucursalId', sucursalId);

    return this.http.get<Report607Response>(`${this.apiUrl}/tax/607`, { params }).pipe(
      tap({
        next: (data) => {
          this.report607.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  get608(periodo: string, sucursalId?: string): Observable<Report608Response> {
    this.loading.set(true);
    let params = new HttpParams().set('periodo', periodo);
    if (sucursalId) params = params.set('sucursalId', sucursalId);

    return this.http.get<Report608Response>(`${this.apiUrl}/tax/608`, { params }).pipe(
      tap({
        next: (data) => {
          this.report608.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getIt1(periodo: string, sucursalId?: string): Observable<ReportIt1Response> {
    this.loading.set(true);
    let params = new HttpParams().set('periodo', periodo);
    if (sucursalId) params = params.set('sucursalId', sucursalId);

    return this.http.get<ReportIt1Response>(`${this.apiUrl}/tax/it1`, { params }).pipe(
      tap({
        next: (data) => {
          this.reportIt1.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  downloadTaxTxt(type: '606' | '607' | '608', periodo: string) {
    const url = `${this.apiUrl}/tax/download/${type}?periodo=${periodo}`;
    window.open(url, '_blank');
  }
}
