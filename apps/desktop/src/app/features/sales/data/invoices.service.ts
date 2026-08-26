import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export type FacturaVentaDetalle = {
  id: string;
  facturaId: string;
  productoId: string;
  producto?: {
    id: string;
    nombre: string;
    codigo: string;
    precioVenta: number;
    taxRate: number;
    impuesto?: {
      id: string;
      codigo: string;
      nombre: string;
      tasa: number;
    } | null;
  };
  cantidad: number;
  precioUnitario: number;
  tasaItbis: number;
  itbis: number;
  subtotal: number;
  total: number;
}

export type FacturaVenta = {
  id: string;
  empresaId: string;
  sucursalId?: string | null;
  sucursal?: { id: string; nombre: string } | null;
  almacenId?: string | null;
  almacen?: { id: string; nombre: string } | null;
  clienteId?: string | null;
  cliente?: {
    id: string;
    nombreRazonSocial: string;
    numeroDocumento: string;
    telefono?: string;
    email?: string;
    direccion?: string;
  } | null;
  usuarioId?: string | null;
  usuario?: { id: string; email: string; nombre?: string } | null;
  numeroFactura: string;
  ncf?: string | null;
  tipoNcf: string;
  fecha: string;
  fechaVencimiento?: string | null;
  estado: string;
  tipoPago: string;
  metodoPago: string;
  subtotal: number;
  descuento: number;
  itbis: number;
  total: number;
  montoPagado: number;
  balancePendiente: number;
  moneda?: string;
  tasaCambio?: number;
  monedaBase?: string;
  fiscalbridgeStatus?: string | null;
  fiscalbridgeDocId?: string | null;
  fiscalbridgeTrackId?: string | null;
  fiscalbridgeError?: string | null;
  fiscalbridgeQrUrl?: string | null;
  fiscalbridgeSecurityCode?: string | null;
  fiscalbridgeSignDate?: string | null;
  ncfModificado?: string | null;
  facturaOriginalId?: string | null;
  facturaOriginal?: { id: string; numeroFactura: string; ncf?: string | null } | null;
  motivoModificacion?: string | null;
  notas?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  detalles: FacturaVentaDetalle[];
}

export type InvoiceItemDto = {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  tasaItbis?: number;
  impuestoId?: string;
}

export type CreateInvoiceDto = {
  clienteId?: string;
  almacenId?: string;
  sucursalId?: string;
  tipoNcf?: string;
  tipoPago?: string;
  metodoPago?: string;
  ncfModificado?: string;
  motivoModificacion?: string;
  notas?: string;
  items: InvoiceItemDto[];
  moneda?: string;
  esBorrador?: boolean;
  estado?: string;
}

export type CreateCreditNoteLineDto = {
  detalleOriginalId: string;
  cantidad: number;
}

export type CreateCreditNoteDto = {
  facturaOriginalId: string;
  motivoModificacion: string;
  returnToInventory?: boolean;
  notas?: string;
  lines: CreateCreditNoteLineDto[];
}

export type FilterInvoiceDto = {
  search?: string;
  clienteId?: string;
  estado?: string;
  fiscalbridgeStatus?: string;
  tipoNcf?: string;
  tipoPago?: string;
  metodoPago?: string;
  desde?: string;
  hasta?: string;
  minTotal?: number;
  maxTotal?: number;
  // Pagination
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/invoices`;

  invoices = signal<FacturaVenta[]>([]);
  loading = signal<boolean>(false);
  pagination = signal<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
  });

  findAll(filters?: FilterInvoiceDto): Observable<PaginatedResponse<FacturaVenta>> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.clienteId) params = params.set('clienteId', filters.clienteId);
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.fiscalbridgeStatus) params = params.set('fiscalbridgeStatus', filters.fiscalbridgeStatus);
      if (filters.tipoNcf) params = params.set('tipoNcf', filters.tipoNcf);
      if (filters.tipoPago) params = params.set('tipoPago', filters.tipoPago);
      if (filters.metodoPago) params = params.set('metodoPago', filters.metodoPago);
      if (filters.desde) params = params.set('desde', filters.desde);
      if (filters.hasta) params = params.set('hasta', filters.hasta);
      if (filters.minTotal !== undefined) params = params.set('minTotal', String(filters.minTotal));
      if (filters.maxTotal !== undefined) params = params.set('maxTotal', String(filters.maxTotal));
      if (filters.page) params = params.set('page', String(filters.page));
      if (filters.limit) params = params.set('limit', String(filters.limit));
      if (filters.orderBy) params = params.set('orderBy', filters.orderBy);
      if (filters.orderDir) params = params.set('orderDir', filters.orderDir);
    }

    return this.http.get<PaginatedResponse<FacturaVenta>>(this.apiUrl, { params }).pipe(
      tap({
        next: (res) => {
          this.invoices.set(res.data);
          this.pagination.set({ total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages });
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      })
    );
  }


  findOne(id: string): Observable<FacturaVenta> {
    return this.http.get<FacturaVenta>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateInvoiceDto): Observable<FacturaVenta> {
    return this.http.post<FacturaVenta>(this.apiUrl, dto).pipe(
      tap((created) => {
        this.invoices.update((list) => [created, ...list]);
      }),
    );
  }

  createCreditNote(dto: CreateCreditNoteDto): Observable<FacturaVenta> {
    return this.http
      .post<FacturaVenta>(`${environment.apiUrl}/credit-notes`, dto)
      .pipe(
        tap((created) => {
          this.invoices.update((list) => [created, ...list]);
        }),
      );
  }

  sendToFiscalBridge(id: string): Observable<FacturaVenta> {
    return this.http
      .post<FacturaVenta>(`${this.apiUrl}/${id}/send-fiscalbridge`, {})
      .pipe(
        tap((updated) => {
          this.invoices.update((list) =>
            list.map((inv) => (inv.id === id ? updated : inv))
          );
        })
      );
  }

  downloadPdf(id: string, fileName?: string): void {
    this.http
      .get(`${this.apiUrl}/${id}/pdf`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || `Factura_${id}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
      });
  }

  downloadXml(id: string, fileName?: string): void {
    this.http
      .get(`${this.apiUrl}/${id}/xml`, { responseType: 'blob' })
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || `eCF_${id}.xml`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
      });
  }

  cancel(id: string): Observable<FacturaVenta> {
    return this.http.post<FacturaVenta>(`${this.apiUrl}/${id}/cancel`, {}).pipe(
      tap((cancelled) => {
        this.invoices.update((list) =>
          list.map((inv) => (inv.id === id ? cancelled : inv))
        );
      })
    );
  }

  emitDraft(id: string): Observable<FacturaVenta> {
    return this.http.post<FacturaVenta>(`${this.apiUrl}/${id}/emit`, {}).pipe(
      tap((emitted) => {
        this.invoices.update((list) =>
          list.map((inv) => (inv.id === id ? emitted : inv))
        );
      })
    );
  }
}
