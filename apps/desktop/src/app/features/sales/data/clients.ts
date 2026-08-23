import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '@/environments/environment';
import { tap, catchError, of } from 'rxjs';

export type Client = {
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
export class ClientsService {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/commercial/clients`;

  clients = signal<Client[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Client[]>(this.apiUrl).pipe(
      tap((data) => {
        this.clients.set(data);
        this.isLoading.set(false);
      }),
      catchError(() => {
        this.isLoading.set(false);
        return of([]);
      })
    );
  }

  findOne(id: string) {
    return this.http.get<Client>(`${this.apiUrl}/${id}`);
  }

  create(client: Partial<Client>) {
    return this.http.post<Client>(this.apiUrl, client).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  update(id: string, client: Partial<Client>) {
    return this.http.patch<Client>(`${this.apiUrl}/${id}`, client).pipe(
      tap(() => this.findAll().subscribe())
    );
  }

  remove(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.findAll().subscribe())
    );
  }
}
