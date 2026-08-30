import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of, Observable } from 'rxjs';
import { Client } from './clients';

export interface AplicacionPagoCliente {
  id: string;
  pagoId: string;
  facturaId: string;
  monto: number;
  creadoEn: string;
  factura?: {
    id: string;
    numeroFactura: string;
    ncf?: string | null;
    fecha?: string;
    fechaVencimiento?: string | null;
    total: number;
    montoPagado: number;
    balancePendiente: number;
    estado: string;
  };
}

export interface PagoCliente {
  id: string;
  empresaId: string;
  numeroRecibo?: string | null;
  clienteId: string;
  moneda: string;
  monto: number;
  tasaCambio: number;
  metodo: string;
  referencia?: string | null;
  fechaPago: string;
  estado: 'REGISTRADO' | 'ANULADO';
  usuarioId: string;
  notas?: string | null;
  creadoEn: string;
  cliente?: Client;
  usuario?: { id: string; email: string; nombre?: string | null } | null;
  aplicaciones: AplicacionPagoCliente[];
}

export interface PendingInvoice {
  id: string;
  numeroFactura: string;
  ncf?: string | null;
  tipoNcf?: string | null;
  fecha: string;
  fechaVencimiento?: string | null;
  estado: string;
  tipoPago: string;
  total: number;
  montoPagado: number;
  balancePendiente: number;
  moneda: string;
  clienteId?: string | null;
  cliente?: {
    id: string;
    nombreRazonSocial: string;
    numeroDocumento?: string | null;
    telefono?: string | null;
    email?: string | null;
  } | null;
  diasVencido: number;
  enMora: boolean;
}

export interface ReceivablesMetrics {
  totalPorCobrar: number;
  facturasPendientesCount: number;
  totalVencido: number;
  facturasVencidasCount: number;
  cobradoMes: number;
  cobrosMesCount: number;
  clientesConSaldoCount: number;
  totalCobrosHistoricos: number;
}

export interface PaymentApplicationDto {
  facturaId: string;
  monto: number;
}

export interface CreateCustomerPaymentDto {
  clienteId: string;
  monto?: number;
  facturaId?: string;
  aplicaciones?: PaymentApplicationDto[];
  metodo?: string;
  moneda?: string;
  tasaCambio?: number;
  referencia?: string;
  fechaPago?: string | Date;
  notas?: string;
}

export interface FilterCustomerPaymentsDto {
  search?: string;
  clienteId?: string;
  metodo?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerPaymentsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/customer-payments`;

  payments = signal<PagoCliente[]>([]);
  pendingInvoices = signal<PendingInvoice[]>([]);
  metrics = signal<ReceivablesMetrics>({
    totalPorCobrar: 0,
    facturasPendientesCount: 0,
    totalVencido: 0,
    facturasVencidasCount: 0,
    cobradoMes: 0,
    cobrosMesCount: 0,
    clientesConSaldoCount: 0,
    totalCobrosHistoricos: 0,
  });
  isLoading = signal<boolean>(false);
  totalCount = signal<number>(0);

  findAll(filter?: FilterCustomerPaymentsDto): Observable<{ data: PagoCliente[]; total: number }> {
    this.isLoading.set(true);

    let params = new HttpParams();
    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.clienteId && filter.clienteId !== 'ALL')
        params = params.set('clienteId', filter.clienteId);
      if (filter.metodo && filter.metodo !== 'ALL')
        params = params.set('metodo', filter.metodo);
      if (filter.estado && filter.estado !== 'ALL')
        params = params.set('estado', filter.estado);
      if (filter.desde) params = params.set('desde', filter.desde);
      if (filter.hasta) params = params.set('hasta', filter.hasta);
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.limit) params = params.set('limit', filter.limit.toString());
    }

    return this.http.get<{ data: PagoCliente[]; total: number }>(this.apiUrl, { params }).pipe(
      tap((res) => {
        this.payments.set(res.data || []);
        this.totalCount.set(res.total || 0);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        this.payments.set([]);
        return of({ data: [], total: 0 });
      }),
    );
  }

  getMetrics(): Observable<ReceivablesMetrics> {
    return this.http.get<ReceivablesMetrics>(`${this.apiUrl}/metrics`).pipe(
      tap((metrics) => {
        if (metrics) {
          this.metrics.set(metrics);
        }
      }),
    );
  }

  getPendingInvoices(clienteId?: string): Observable<PendingInvoice[]> {
    let params = new HttpParams();
    if (clienteId && clienteId !== 'ALL') {
      params = params.set('clienteId', clienteId);
    }

    return this.http
      .get<PendingInvoice[]>(`${this.apiUrl}/pending-invoices`, { params })
      .pipe(
        tap((invoices) => {
          this.pendingInvoices.set(invoices || []);
        }),
      );
  }

  findOne(id: string): Observable<PagoCliente> {
    return this.http.get<PagoCliente>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreateCustomerPaymentDto): Observable<PagoCliente> {
    return this.http.post<PagoCliente>(this.apiUrl, dto);
  }

  cancel(id: string): Observable<PagoCliente> {
    return this.http.post<PagoCliente>(`${this.apiUrl}/${id}/cancel`, {});
  }
}
