import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface Unit {
  id: string;
  nombre: string;
  abreviatura: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class UnitsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogs/units`;

  units = signal<Unit[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Unit[]>(this.apiUrl).pipe(
      tap((data) => {
        this.units.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  create(data: Partial<Unit>) {
    return this.http.post<Unit>(this.apiUrl, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  update(id: string, data: Partial<Unit>) {
    return this.http.patch<Unit>(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => this.findAll().subscribe())
    );
  }
}
