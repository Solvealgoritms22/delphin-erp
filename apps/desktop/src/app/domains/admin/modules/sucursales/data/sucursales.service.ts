import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface Sucursal {
  id: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  ciudad?: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class SucursalesService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/sucursales`;

  sucursales = signal<Sucursal[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<{ value: Sucursal[] }>(this.apiUrl).pipe(
      tap((data) => {
        this.sucursales.set(data?.value ?? []);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([] as Sucursal[]);
      })
    );
  }

  create(data: Partial<Sucursal>) {
    return this.http.post<Sucursal>(this.apiUrl, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  update(id: string, data: Partial<Sucursal>) {
    return this.http.patch<Sucursal>(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  remove(id: string) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.findAll().subscribe())
    );
  }
}
