import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export interface FacturaVentaDetalle {
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

export interface FacturaVenta {
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
  estado: string; // EMITIDA | PAGADA | ANULADA
  tipoPago: string; // CONTADO | CREDITO
  metodoPago: string; // EFECTIVO | TARJETA | TRANSFERENCIA | CHEQUE
  subtotal: number;
  descuento: number;
  itbis: number;
  total: number;
  montoPagado: number;
  balancePendiente: number;
  moneda?: string;
  tasaCambio?: number;
  monedaBase?: string;
  fiscalbridgeStatus?: string | null; // NOT_TRANSMITTED | PENDING | SENT | FAILED | ACCEPTED | REJECTED
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

export interface InvoiceItemDto {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  tasaItbis?: number;
  impuestoId?: string;
}

export interface CreateInvoiceDto {
  clienteId?: string;
  almacenId?: string;
  sucursalId?: string;
  tipoNcf: string;
  tipoPago?: string;
  metodoPago?: string;
  ncfModificado?: string;
  motivoModificacion?: string;
  notas?: string;
  items: InvoiceItemDto[];
  moneda?: string;
}

export interface CreateCreditNoteLineDto {
  detalleOriginalId: string;
  cantidad: number;
}

export interface CreateCreditNoteDto {
  facturaOriginalId: string;
  motivoModificacion: string;
  returnToInventory?: boolean;
  notas?: string;
  lines: CreateCreditNoteLineDto[];
}

export interface FilterInvoiceDto {
  search?: string;
  clienteId?: string;
  estado?: string;
  fiscalbridgeStatus?: string;
  tipoNcf?: string;
  desde?: string;
  hasta?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InvoicesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/invoices`;

  invoices = signal<FacturaVenta[]>([]);
  loading = signal<boolean>(false);

  findAll(filters?: FilterInvoiceDto): Observable<FacturaVenta[]> {
    this.loading.set(true);
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.clienteId)
        params = params.set('clienteId', filters.clienteId);
      if (filters.estado) params = params.set('estado', filters.estado);
      if (filters.fiscalbridgeStatus)
        params = params.set('fiscalbridgeStatus', filters.fiscalbridgeStatus);
      if (filters.tipoNcf) params = params.set('tipoNcf', filters.tipoNcf);
      if (filters.desde) params = params.set('desde', filters.desde);
      if (filters.hasta) params = params.set('hasta', filters.hasta);
    }

    return this.http.get<FacturaVenta[]>(this.apiUrl, { params }).pipe(
      tap({
        next: (res) => {
          this.invoices.set(res);
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
}
