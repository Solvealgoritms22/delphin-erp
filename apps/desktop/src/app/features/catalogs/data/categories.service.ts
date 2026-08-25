import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export type Category = {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  color?: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class CategoriesService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogs/categories`;

  categories = signal<Category[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Category[]>(this.apiUrl).pipe(
      tap((data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  create(data: Partial<Category>) {
    return this.http.post<Category>(this.apiUrl, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  update(id: string, data: Partial<Category>) {
    return this.http.patch<Category>(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }
}
