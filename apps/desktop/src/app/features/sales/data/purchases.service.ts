import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';
import { Supplier } from './suppliers.service';
import { Product } from '../../catalogs/data/products.service';

export interface FacturaCompraDetalle {
  id: string;
  facturaCompraId: string;
  productoId?: string | null;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  descuento: number;
  tasaItbis: number;
  itbis: number;
  subtotal: number;
  total: number;
  afectaInventario: boolean;
  producto?: Product | null;
}

export interface PagoProveedor {
  id: string;
  empresaId: string;
  proveedorId: string;
  usuarioId: string;
  moneda: string;
  monto: number;
  tasaCambio: number;
  metodo: string;
  referencia?: string | null;
  fechaPago: string;
  estado: string;
  notas?: string | null;
  creadoEn: string;
}

export interface AplicacionPagoProveedor {
  id: string;
  pagoId: string;
  facturaCompraId: string;
  monto: number;
  creadoEn: string;
  pago?: PagoProveedor;
}

export interface FacturaCompra {
  id: string;
  empresaId: string;
  sucursalId?: string | null;
  almacenId?: string | null;
  proveedorId: string;
  usuarioId?: string | null;
  numeroFactura: string;
  ncf?: string | null;
  ncfModificado?: string | null;
  tipoNcf?: string | null;
  tipoGasto?: string | null;
  fecha: string;
  fechaVencimiento?: string | null;
  estado: 'REGISTRADA' | 'PAGADA_PARCIAL' | 'PAGADA' | 'ANULADA';
  tipoPago: 'CONTADO' | 'CREDITO';
  metodoPago: string;
  subtotal: number;
  descuento: number;
  itbis: number;
  itbisRetenido: number;
  retencionRenta: number;
  total: number;
  montoPagado: number;
  balancePendiente: number;
  moneda: string;
  tasaCambio: number;
  notas?: string | null;
  creadoEn: string;
  actualizadoEn: string;
  proveedor?: Supplier;
  almacen?: { id: string; nombre: string } | null;
  sucursal?: { id: string; nombre: string } | null;
  usuario?: { id: string; email: string; nombre?: string | null } | null;
  detalles: FacturaCompraDetalle[];
  pagosAplicados?: AplicacionPagoProveedor[];
}

export interface PurchaseItemDto {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  descuento?: number;
  tasaItbis?: number;
  afectaInventario?: boolean;
}

export interface CreatePurchaseDto {
  proveedorId: string;
  almacenId?: string;
  sucursalId?: string;
  numeroFactura?: string;
  ncf?: string;
  tipoNcf?: string;
  ncfModificado?: string;
  tipoGasto?: string;
  fecha?: string;
  fechaVencimiento?: string;
  tipoPago: 'CONTADO' | 'CREDITO';
  metodoPago?: string;
  descuento?: number;
  itbisRetenido?: number;
  retencionRenta?: number;
  notas?: string;
  items: PurchaseItemDto[];
}

export interface CreateSupplierPaymentDto {
  monto: number;
  metodo: string;
  referencia?: string;
  fechaPago?: string;
  notas?: string;
}

export interface FilterPurchasesDto {
  search?: string;
  proveedorId?: string;
  estado?: string;
  tipoPago?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
}

export interface PurchaseMetrics {
  totalComprasMes: number;
  cantidadComprasMes: number;
  totalCxPPendiente: number;
  facturasPendientesCount: number;
  totalVencido: number;
  facturasVencidasCount: number;
}

export interface PurchasesResponse {
  data: FacturaCompra[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  metrics: PurchaseMetrics;
}

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/purchases`;

  purchases = signal<FacturaCompra[]>([]);
  metrics = signal<PurchaseMetrics>({
    totalComprasMes: 0,
    cantidadComprasMes: 0,
    totalCxPPendiente: 0,
    facturasPendientesCount: 0,
    totalVencido: 0,
    facturasVencidasCount: 0,
  });
  totalCount = signal(0);
  isLoading = signal(false);

  findAll(filter?: FilterPurchasesDto) {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (filter) {
      if (filter.search) params = params.set('search', filter.search);
      if (filter.proveedorId) params = params.set('proveedorId', filter.proveedorId);
      if (filter.estado) params = params.set('estado', filter.estado);
      if (filter.tipoPago) params = params.set('tipoPago', filter.tipoPago);
      if (filter.desde) params = params.set('desde', filter.desde);
      if (filter.hasta) params = params.set('hasta', filter.hasta);
      if (filter.page) params = params.set('page', filter.page.toString());
      if (filter.limit) params = params.set('limit', filter.limit.toString());
    }

    return this.http.get<PurchasesResponse>(this.apiUrl, { params }).pipe(
      tap((res) => {
        this.purchases.set(res.data);
        this.totalCount.set(res.total);
        if (res.metrics) {
          this.metrics.set(res.metrics);
        }
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          metrics: {
            totalComprasMes: 0,
            cantidadComprasMes: 0,
            totalCxPPendiente: 0,
            facturasPendientesCount: 0,
            totalVencido: 0,
            facturasVencidasCount: 0,
          },
        });
      }),
    );
  }

  findOne(id: string) {
    return this.http.get<FacturaCompra>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreatePurchaseDto) {
    return this.http.post<FacturaCompra>(this.apiUrl, dto).pipe(
      tap(() => this.findAll().subscribe()),
    );
  }

  registerPayment(id: string, dto: CreateSupplierPaymentDto) {
    return this.http.post<{ pago: PagoProveedor; updatedPurchase: FacturaCompra }>(
      `${this.apiUrl}/${id}/payments`,
      dto,
    ).pipe(
      tap(() => this.findAll().subscribe()),
    );
  }

  cancel(id: string, motivo?: string) {
    return this.http.patch<FacturaCompra>(`${this.apiUrl}/${id}/cancel`, { motivo }).pipe(
      tap(() => this.findAll().subscribe()),
    );
  }
}
