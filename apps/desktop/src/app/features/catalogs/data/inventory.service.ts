import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export type Warehouse = {
  id: string;
  nombre: string;
  tipo: string;
  codigo?: string;
  esPrincipal: boolean;
  sucursal?: { id: string; nombre: string };
}

export type StockItem = {
  id: string;
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  categoria: string;
  unidad: string;
  almacenId: string;
  almacenNombre: string;
  sucursalNombre: string;
  cantidad: number;
  stockMinimo: number;
  stockMaximo?: number;
  costoPromedio?: number;
  actualizadoEn: string;
}

export type ProductStockBreakdown = {
  almacenId: string;
  almacenNombre: string;
  tipo: string;
  sucursalNombre: string;
  cantidad: number;
}

export type KardexMovement = {
  id: string;
  productoId: string;
  productoCodigo: string;
  productoNombre: string;
  tipo: string;
  cantidad: number;
  costoUnitario?: number;
  almacenOrigen?: string;
  almacenDestino?: string;
  referenciaDoc?: string;
  motivo?: string;
  creadoEn: string;
}

export type TransferStockDto = {
  productoId: string;
  almacenOrigenId: string;
  almacenDestinoId: string;
  cantidad: number;
  motivo?: string;
  referenciaDoc?: string;
}

export type AdjustStockDto = {
  productoId: string;
  almacenId: string;
  tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'COMPRA' | 'VENTA';
  cantidad: number;
  costoUnitario?: number;
  motivo?: string;
  referenciaDoc?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/inventory`;

  warehouses = signal<Warehouse[]>([]);
  stocks = signal<StockItem[]>([]);
  kardex = signal<KardexMovement[]>([]);
  isLoading = signal(false);

  getWarehouses() {
    this.isLoading.set(true);
    return this.http.get<Warehouse[]>(`${this.apiUrl}/warehouses`).pipe(
      tap((data) => {
        this.warehouses.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  createWarehouse(data: { nombre: string; sucursalId?: string; tipo?: string; codigo?: string }) {
    return this.http.post<Warehouse>(`${this.apiUrl}/warehouses`, data).pipe(
      tap(() => this.getWarehouses().subscribe())
    );
  }

  getStocks(filter?: { almacenId?: string; productoId?: string; search?: string }) {
    this.isLoading.set(true);
    let params = new HttpParams();
    if (filter?.almacenId) params = params.set('almacenId', filter.almacenId);
    if (filter?.productoId) params = params.set('productoId', filter.productoId);
    if (filter?.search) params = params.set('search', filter.search);

    return this.http.get<StockItem[]>(`${this.apiUrl}/stocks`, { params }).pipe(
      tap((data) => {
        this.stocks.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  getProductStockBreakdown(productoId: string) {
    return this.http.get<ProductStockBreakdown[]>(`${this.apiUrl}/products/${productoId}/breakdown`);
  }

  createTransfer(dto: TransferStockDto) {
    return this.http.post(`${this.apiUrl}/transfers`, dto);
  }

  createAdjustment(dto: AdjustStockDto) {
    return this.http.post(`${this.apiUrl}/adjustments`, dto);
  }

  getKardex(productoId?: string, page = 1, limit = 50) {
    this.isLoading.set(true);
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (productoId) params = params.set('productoId', productoId);

    return this.http.get<{ items: KardexMovement[]; total: number }>(`${this.apiUrl}/kardex`, { params }).pipe(
      tap((res) => {
        this.kardex.set(res.items);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of({ items: [], total: 0 });
      })
    );
  }
}
