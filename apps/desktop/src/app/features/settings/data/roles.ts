import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { tap } from 'rxjs';

export type Role = {
  id: string;
  nombre: string;
  descripcion?: string;
  permissions?: string;
  empresaId: string;
}

export type RolePayload = {
  nombre?: string;
  descripcion?: string;
  name?: string;
  description?: string;
  permissions?: any;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/roles`;

  roles = signal<Role[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<Role[]>(this.apiUrl).pipe(
      tap({
        next: (res) => {
          this.roles.set(res);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  create(data: RolePayload) {
    return this.http.post<Role>(this.apiUrl, data).pipe(
      tap(newRole => this.roles.update(r => [...r, newRole]))
    );
  }

  update(id: string, data: RolePayload) {
    return this.http.patch<Role>(`${this.apiUrl}/${id}`, data).pipe(
      tap(updated => this.roles.update(r => r.map(x => x.id === id ? updated : x)))
    );
  }

  remove(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.roles.update(r => r.filter(x => x.id !== id)))
    );
  }
}
