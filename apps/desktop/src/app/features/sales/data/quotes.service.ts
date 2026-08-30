import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export type CotizacionDetalle = {
  id: string;
  cotizacionId: string;
  productoId?: string | null;
  producto?: {
    id: string;
    nombre: string;
    codigo: string;
    precioVenta: number;
    taxRate: number;
    enOferta?: boolean;
    precioOferta?: number | null;
    descuentoPorcentaje?: number | null;
  } | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  porcentajeDescuento?: number;
  tasaItbis: number;
  itbis: number;
  subtotal: number;
  total: number;
};

export type Cotizacion = {
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
  facturaId?: string | null;
  numeroCotizacion: string;
  fecha: string;
  fechaVencimiento?: string | null;
  estado: 'BORRADOR' | 'ENVIADA' | 'ACEPTADA' | 'FACTURADA' | 'RECHAZADA' | 'VENCIDA' | string;
  subtotal: number;
  descuento: number;
  itbis: number;
  total: number;
  moneda: string;
  tasaCambio: number;
  notas?: string | null;
  terminosCondiciones?: string | null;
  enviadaPorEmail: boolean;
  fechaEnvioEmail?: string | null;
  emailDestino?: string | null;
  detalles: CotizacionDetalle[];
  creadoEn: string;
  actualizadoEn: string;
};

export type CreateQuoteItemDto = {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento?: number;
  porcentajeDescuento?: number;
  tasaItbis?: number;
};

export type CreateQuoteDto = {
  clienteId?: string;
  sucursalId?: string;
  almacenId?: string;
  numeroCotizacion?: string;
  fecha?: string;
  fechaVencimiento?: string;
  notas?: string;
  terminosCondiciones?: string;
  descuento?: number;
  items: CreateQuoteItemDto[];
};

export type FilterQuotesDto = {
  page?: number;
  limit?: number;
  search?: string;
  estado?: string;
  clienteId?: string;
  from?: string;
  to?: string;
};

export type SendQuoteEmailDto = {
  recipientEmail?: string;
  customSubject?: string;
  customMessage?: string;
  saveEmailToClient?: boolean;
};

export type QuoteMetrics = {
  totalCotizaciones: number;
  totalEnviadas: number;
  totalAceptadas: number;
  totalFacturadas: number;
  totalBorradores: number;
  totalPendientes: number;
  montoTotalCotizado: number;
};

export type SmtpStatusResponse = {
  smtpConfigured: boolean;
  smtpHost: string | null;
  smtpFrom: string | null;
  smtpUser: string | null;
  smtpEnabled: boolean;
  ownerName: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class QuotesService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/quotes`;

  quotes = signal<Cotizacion[]>([]);
  loading = signal<boolean>(false);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(20);
  totalPages = signal<number>(1);

  metrics = signal<QuoteMetrics>({
    totalCotizaciones: 0,
    totalEnviadas: 0,
    totalAceptadas: 0,
    totalFacturadas: 0,
    totalBorradores: 0,
    totalPendientes: 0,
    montoTotalCotizado: 0,
  });

  smtpStatus = signal<SmtpStatusResponse>({
    smtpConfigured: false,
    smtpHost: null,
    smtpFrom: null,
    smtpUser: null,
    smtpEnabled: false,
    ownerName: null,
  });

  getQuotes(filter?: FilterQuotesDto): Observable<{
    data: Cotizacion[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    this.loading.set(true);
    let params = new HttpParams();

    if (filter) {
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.limit) params = params.set('limit', filter.limit.toString());
      if (filter.search) params = params.set('search', filter.search);
      if (filter.estado) params = params.set('estado', filter.estado);
      if (filter.clienteId) params = params.set('clienteId', filter.clienteId);
      if (filter.from) params = params.set('from', filter.from);
      if (filter.to) params = params.set('to', filter.to);
    }

    return this.http
      .get<{
        data: Cotizacion[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(this.baseUrl, { params })
      .pipe(
        tap({
          next: (res) => {
            this.quotes.set(res.data);
            this.total.set(res.total);
            this.page.set(res.page);
            this.limit.set(res.limit);
            this.totalPages.set(res.totalPages);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          },
        }),
      );
  }

  getMetrics(): Observable<QuoteMetrics> {
    return this.http.get<QuoteMetrics>(`${this.baseUrl}/metrics`).pipe(
      tap((res) => {
        this.metrics.set(res);
      }),
    );
  }

  getSmtpStatus(): Observable<SmtpStatusResponse> {
    return this.http.get<SmtpStatusResponse>(`${this.baseUrl}/smtp-status`).pipe(
      tap((res) => {
        this.smtpStatus.set(res);
      }),
    );
  }

  getQuoteById(id: string): Observable<Cotizacion> {
    return this.http.get<Cotizacion>(`${this.baseUrl}/${id}`);
  }

  createQuote(dto: CreateQuoteDto): Observable<Cotizacion> {
    return this.http.post<Cotizacion>(this.baseUrl, dto);
  }

  updateQuote(id: string, dto: Partial<CreateQuoteDto>): Observable<Cotizacion> {
    return this.http.patch<Cotizacion>(`${this.baseUrl}/${id}`, dto);
  }

  deleteQuote(id: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  sendQuoteEmail(id: string, dto: SendQuoteEmailDto): Observable<{
    success: boolean;
    message: string;
    quote: Cotizacion;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      quote: Cotizacion;
    }>(`${this.baseUrl}/${id}/send-email`, dto);
  }

  convertToInvoice(id: string): Observable<{
    success: boolean;
    message: string;
    quote: Cotizacion;
    invoice: any;
  }> {
    return this.http.post<{
      success: boolean;
      message: string;
      quote: Cotizacion;
      invoice: any;
    }>(`${this.baseUrl}/${id}/convert-to-invoice`, {});
  }
}
