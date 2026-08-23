import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export type Brand = {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogs/brands`;

  brands = signal<Brand[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Brand[]>(this.apiUrl).pipe(
      tap((data) => {
        this.brands.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  create(data: Partial<Brand>) {
    return this.http.post<Brand>(this.apiUrl, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  update(id: string, data: Partial<Brand>) {
    return this.http.patch<Brand>(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }
}
