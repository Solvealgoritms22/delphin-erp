import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export interface SalesReportSummary {
  totalVentas: number;
  totalItbis: number;
  totalDescuento: number;
  totalSubtotal: number;
  totalFacturas: number;
  promedioTicket: number;
}

export interface PaymentMethodBreakdown {
  metodo: string;
  count: number;
  total: number;
}

export interface SalesTimeSeriesPoint {
  date: string;
  total: number;
  count: number;
  itbis: number;
}

export interface SalesReportResponse {
  summary: SalesReportSummary;
  paymentMethods: PaymentMethodBreakdown[];
  timeSeries: SalesTimeSeriesPoint[];
}

export interface TopProductItem {
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

export interface TopProductsReportResponse {
  topProducts: TopProductItem[];
  totalCount: number;
}

export interface ReceivablesAging {
  corriente: number;
  de31a60: number;
  de61a90: number;
  masDe90: number;
}

export interface DebtorClientItem {
  clienteId: string;
  nombre: string;
  documento: string;
  telefono?: string;
  email?: string;
  totalDeuda: number;
  facturasPendientes: number;
}

export interface ReceivablesInvoiceItem {
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

export interface ReceivablesReportResponse {
  summary: {
    totalPendiente: number;
    totalFacturasPendientes: number;
    aging: ReceivablesAging;
  };
  topDebtors: DebtorClientItem[];
  invoices: ReceivablesInvoiceItem[];
}

export interface LowStockItem {
  productoId: string;
  codigo: string;
  nombre: string;
  almacenNombre: string;
  cantidadActual: number;
  stockMinimo: number;
  unidad: string;
}

export interface WarehouseStockSummary {
  almacenId: string;
  nombre: string;
  totalItems: number;
  valorCosto: number;
}

export interface InventoryReportResponse {
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

export interface ClientSalesItem {
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

export interface SalesByClientResponse {
  grandTotal: number;
  clients: ClientSalesItem[];
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reports`;

  salesReport = signal<SalesReportResponse | null>(null);
  topProductsReport = signal<TopProductsReportResponse | null>(null);
  receivablesReport = signal<ReceivablesReportResponse | null>(null);
  inventoryReport = signal<InventoryReportResponse | null>(null);
  salesByClientReport = signal<SalesByClientResponse | null>(null);
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

    return this.http.get<TopProductsReportResponse>(`${this.apiUrl}/top-products`, { params }).pipe(
      tap({
        next: (data) => {
          this.topProductsReport.set(data);
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
}
