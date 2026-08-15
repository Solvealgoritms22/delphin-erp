import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export interface SecuenciaNCF {
  id: string;
  empresaId: string;
  nombre: string;
  tipo: string; // E31, E32, E34, E44, E45, B01, B02, B04, B14, B15
  prefijo: string;
  numeroActual: number;
  numeroHasta: number;
  fechaVencimiento?: string | null;
  activa: boolean;
  ambiente: string; // TEST | CERT | PROD
  creadoEn: string;
  actualizadoEn: string;
}

export interface CreateSequenceDto {
  nombre: string;
  tipo: string;
  prefijo: string;
  numeroActual?: number;
  numeroHasta?: number;
  fechaVencimiento?: string;
  activa?: boolean;
  ambiente?: string;
}

export interface UpdateSequenceDto {
  nombre?: string;
  numeroActual?: number;
  numeroHasta?: number;
  fechaVencimiento?: string;
  activa?: boolean;
  ambiente?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SequencesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/v1/sequences`;

  sequences = signal<SecuenciaNCF[]>([]);
  loading = signal<boolean>(false);

  findAll(): Observable<SecuenciaNCF[]> {
    this.loading.set(true);
    return this.http.get<SecuenciaNCF[]>(this.apiUrl).pipe(
      tap({
        next: (res) => {
          this.sequences.set(res);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  create(dto: CreateSequenceDto): Observable<SecuenciaNCF> {
    return this.http.post<SecuenciaNCF>(this.apiUrl, dto).pipe(
      tap((created) => {
        this.sequences.update((list) => [...list, created]);
      }),
    );
  }

  update(id: string, dto: UpdateSequenceDto): Observable<SecuenciaNCF> {
    return this.http.put<SecuenciaNCF>(`${this.apiUrl}/${id}`, dto).pipe(
      tap((updated) => {
        this.sequences.update((list) =>
          list.map((item) => (item.id === id ? updated : item)),
        );
      }),
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this.sequences.update((list) => list.filter((item) => item.id !== id));
      }),
    );
  }
}
