import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of, switchMap } from 'rxjs';

export type ProductInsumo = {
  id?: string;
  productoPadreId?: string;
  insumoProductoId: string;
  cantidad: number;
  costoUnitario?: number | null;
  unidadMedidaId?: string | null;
  notas?: string | null;
  insumoProducto?: Product;
  unidadMedida?: any;
};

export type Product = {
  id: string;
  tipo: string;
  codigo: string;
  codigoBarras?: string | null;
  nombre: string;
  descripcion?: string | null;
  precioVenta: number;
  costo?: number | null;
  estado: string;
  categoriaId?: string | null;
  marcaId?: string | null;
  unidadMedidaId?: string | null;
  categoria?: any;
  marca?: any;
  unidadMedida?: any;
  tags?: string | null;
  imagenes?: string | null;
  taxRate?: number;
  impuestoId?: string | null;
  impuesto?: {
    id: string;
    codigo: string;
    nombre: string;
    tasa: number;
  } | null;
  stocks?: Array<{
    id: string;
    almacenId: string;
    cantidad: number;
    stockMinimo?: number;
    almacen?: {
      id: string;
      nombre: string;
      esPrincipal?: boolean;
    };
  }>;
  insumos?: ProductInsumo[];
};

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogs/products`;
  private readonly catalogsUrl = `${environment.apiUrl}/catalogs`;
  private readonly inventoryUrl = `${environment.apiUrl}/inventory`;

  products = signal<Product[]>([]);
  isLoading = signal(false);

  // Dropdown catalogs
  categories = signal<any[]>([]);
  brands = signal<any[]>([]);
  units = signal<any[]>([]);
  warehouses = signal<any[]>([]);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Product[]>(this.apiUrl).pipe(
      tap((data) => {
        this.products.set(data);
        this.isLoading.set(false);
      }),
      catchError((_err) => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  findOne(id: string) {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getNextCode(tipo = 'PRODUCTO') {
    return this.http.get<{ code: string }>(`${this.apiUrl}/next-code`, {
      params: { tipo },
    });
  }

  loadCatalogs() {
    this.http
      .get<any[]>(`${this.catalogsUrl}/categories`)
      .subscribe({
        next: (data) => this.categories.set(data),
        error: () => {},
      });
    this.http
      .get<any[]>(`${this.catalogsUrl}/brands`)
      .subscribe({ next: (data) => this.brands.set(data), error: () => {} });
    this.http
      .get<any[]>(`${this.catalogsUrl}/units`)
      .subscribe({ next: (data) => this.units.set(data), error: () => {} });
    this.http
      .get<any[]>(`${this.inventoryUrl}/warehouses`)
      .subscribe({
        next: (data) => this.warehouses.set(data),
        error: () => {},
      });
  }

  create(product: Partial<Product> & { insumos?: any[] }) {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      switchMap(() => this.findAll())
    );
  }

  update(id: string, product: Partial<Product> & { insumos?: any[] }) {
    return this.http.patch<Product>(`${this.apiUrl}/${id}`, product).pipe(
      switchMap(() => this.findAll())
    );
  }

  remove(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      switchMap(() => this.findAll())
    );
  }

  delete(id: string) {
    return this.remove(id);
  }
}
