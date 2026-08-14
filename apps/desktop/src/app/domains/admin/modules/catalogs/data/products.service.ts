import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of, switchMap } from 'rxjs';

export interface Product {
  id: string;
  tipo: string;
  codigo: string;
  codigoBarras: string;
  nombre: string;
  descripcion: string;
  precioVenta: number;
  costo: number;
  estado: string;
  categoria?: any;
  marca?: any;
  unidadMedida?: any;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogs/products`;
  private readonly catalogsUrl = `${environment.apiUrl}/catalogs`;

  products = signal<Product[]>([]);
  isLoading = signal(false);

  // Dropdown catalogs
  categories = signal<any[]>([]);
  brands = signal<any[]>([]);
  units = signal<any[]>([]);

  findAll() {
    this.isLoading.set(true);
    // Fetch products
    return this.http.get<Product[]>(this.apiUrl).pipe(
      tap((data) => {
        this.products.set(data);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  loadCatalogs() {
    this.http.get<any[]>(`${this.catalogsUrl}/categories`).subscribe({ next: data => this.categories.set(data), error: () => {} });
    this.http.get<any[]>(`${this.catalogsUrl}/brands`).subscribe({ next: data => this.brands.set(data), error: () => {} });
    this.http.get<any[]>(`${this.catalogsUrl}/units`).subscribe({ next: data => this.units.set(data), error: () => {} });
  }

  create(product: Partial<Product>) {
    return this.http.post<Product>(this.apiUrl, product).pipe(
      // switchMap chains the refresh properly — no nested subscribe
      switchMap(() => this.findAll())
    );
  }
}
