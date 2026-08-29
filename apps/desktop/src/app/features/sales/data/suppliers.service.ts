import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface Supplier {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombreRazonSocial: string;
  pais?: string;
  logo?: string | null;
  email?: string;
  telefono?: string;
  direccion?: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/commercial/suppliers`;

  suppliers = signal<Supplier[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Supplier[]>(this.apiUrl).pipe(
      tap((data) => {
        this.suppliers.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      }),
    );
  }

  findOne(id: string) {
    return this.http.get<Supplier>(`${this.apiUrl}/${id}`);
  }

  create(supplier: Partial<Supplier>) {
    return this.http.post<Supplier>(this.apiUrl, supplier).pipe(
      tap(() => this.findAll().subscribe()),
    );
  }

  update(id: string, supplier: Partial<Supplier>) {
    return this.http.patch<Supplier>(`${this.apiUrl}/${id}`, supplier).pipe(
      tap(() => this.findAll().subscribe()),
    );
  }

  remove(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.findAll().subscribe()),
    );
  }
}
