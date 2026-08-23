import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { tap } from 'rxjs';

export type User = {
  id: string;
  email: string;
  name?: string;
  estado: string;
  roleId?: string;
  empresaIds?: string[];
  isOwner?: boolean;
  avatar?: string;
  lastOnlineDate?: string;
  lastOnlineTime?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  users = signal<User[]>([]);
  isLoading = signal(false);

  findAll() {
    this.isLoading.set(true);
    return this.http.get<User[]>(this.apiUrl).pipe(
      tap({
        next: (res) => {
          this.users.set(res);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
      })
    );
  }

  findAssignableCompanies() {
    return this.http.get<Array<{ id: string; razonSocial: string; rnc?: string | null }>>(`${this.apiUrl}/available-companies`);
  }

  create(data: Partial<User>) {
    return this.http.post<User>(this.apiUrl, data).pipe(
      tap(newUser => this.users.update(u => [...u, newUser]))
    );
  }

  update(id: string, data: Partial<User>) {
    return this.http.patch<User>(`${this.apiUrl}/${id}`, data).pipe(
      tap(updated => this.users.update(u => u.map(x => x.id === id ? updated : x)))
    );
  }

  resendInvitation(id: string) {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/${id}/resend-invitation`, {});
  }

  remove(id: string) {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.users.update(u => u.filter(x => x.id !== id)))
    );
  }
}
