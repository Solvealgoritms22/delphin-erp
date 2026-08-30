import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export type Promocion = {
  id: string;
  empresaId: string;
  nombre: string;
  descripcion?: string | null;
  codigoCupon?: string | null;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_FIJO';
  valorDescuento: number;
  alcance: 'TODOS' | 'CATEGORIA' | 'MARCA' | 'PRODUCTOS';
  categoriaId?: string | null;
  categoria?: { id: string; nombre: string } | null;
  marcaId?: string | null;
  marca?: { id: string; nombre: string } | null;
  fechaInicio: string;
  fechaFin: string;
  cantidadMinima?: number | null;
  montoMinimo?: number | null;
  limiteUsos?: number | null;
  usosActuales: number;
  esAcumulable: boolean;
  prioridad: number;
  estado: 'ACTIVO' | 'INACTIVO' | 'EXPIRADO' | 'PAUSADO';
  estadoEfectivo?: 'ACTIVO' | 'INACTIVO' | 'EXPIRADO' | 'PAUSADO' | 'PROGRAMADO';
  creadoEn: string;
  actualizadoEn: string;
  productos?: {
    id: string;
    productoId: string;
    producto?: {
      id: string;
      codigo: string;
      nombre: string;
      precioVenta: number;
    };
  }[];
  _count?: {
    detallesFactura: number;
    productos: number;
  };
};

export type CreatePromotionDto = {
  nombre: string;
  descripcion?: string;
  codigoCupon?: string;
  tipoDescuento: 'PORCENTAJE' | 'MONTO_FIJO' | 'PRECIO_FIJO';
  valorDescuento: number;
  alcance: 'TODOS' | 'CATEGORIA' | 'MARCA' | 'PRODUCTOS';
  categoriaId?: string;
  marcaId?: string;
  productoIds?: string[];
  fechaInicio: string;
  fechaFin: string;
  cantidadMinima?: number;
  montoMinimo?: number;
  limiteUsos?: number;
  esAcumulable?: boolean;
  prioridad?: number;
  estado?: 'ACTIVO' | 'INACTIVO' | 'PAUSADO';
};

export type UpdatePromotionDto = Partial<CreatePromotionDto>;

export type FilterPromotionsDto = {
  search?: string;
  estado?: string;
  alcance?: string;
  categoriaId?: string;
  marcaId?: string;
  productoId?: string;
};

export type EvaluatedLineResult = {
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  cantidad: number;
  precioLista: number;
  descuentoUnitario: number;
  descuentoTotal: number;
  porcentajeDescuento: number;
  precioFinalUnitario: number;
  subtotalBruto: number;
  subtotalNeto: number;
  promocionId: string | null;
  promocionNombre: string | null;
  tipoDescuentoAplicado: string | null;
  descuentoExcedeMaximo: boolean;
};

export type EvaluatedCartResult = {
  items: EvaluatedLineResult[];
  subtotalBrutoTotal: number;
  descuentoTotal: number;
  subtotalNetoTotal: number;
  promocionesAplicadas: {
    id: string;
    nombre: string;
    ahorro: number;
  }[];
};

@Injectable({
  providedIn: 'root',
})
export class PromotionsService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/promotions`;

  promotions = signal<Promocion[]>([]);
  loading = signal<boolean>(false);

  loadAll(filter?: FilterPromotionsDto): Observable<Promocion[]> {
    this.loading.set(true);
    let params = new HttpParams();

    if (filter) {
      Object.entries(filter).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          params = params.set(key, String(val));
        }
      });
    }

    return this.http.get<Promocion[]>(this.apiUrl, { params }).pipe(
      tap({
        next: (data) => {
          this.promotions.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getById(id: string): Observable<Promocion> {
    return this.http.get<Promocion>(`${this.apiUrl}/${id}`);
  }

  create(dto: CreatePromotionDto): Observable<Promocion> {
    return this.http.post<Promocion>(this.apiUrl, dto).pipe(
      tap((created) => {
        this.promotions.update((list) => [created, ...list]);
      }),
    );
  }

  update(id: string, dto: UpdatePromotionDto): Observable<Promocion> {
    return this.http.put<Promocion>(`${this.apiUrl}/${id}`, dto).pipe(
      tap((updated) => {
        this.promotions.update((list) =>
          list.map((p) => (p.id === id ? updated : p)),
        );
      }),
    );
  }

  toggleStatus(id: string): Observable<Promocion> {
    return this.http.patch<Promocion>(`${this.apiUrl}/${id}/status`, {}).pipe(
      tap((updated) => {
        this.promotions.update((list) =>
          list.map((p) => (p.id === id ? { ...p, estado: updated.estado, estadoEfectivo: updated.estado } : p)),
        );
      }),
    );
  }

  delete(id: string): Observable<{ message: string; id: string }> {
    return this.http.delete<{ message: string; id: string }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.promotions.update((list) => list.filter((p) => p.id !== id));
      }),
    );
  }

  evaluate(dto: {
    items: {
      productoId: string;
      cantidad: number;
      precioUnitario?: number;
      descuentoManual?: number;
    }[];
    codigoCupon?: string;
    clienteId?: string;
  }): Observable<EvaluatedCartResult> {
    return this.http.post<EvaluatedCartResult>(`${this.apiUrl}/evaluate`, dto);
  }
}
