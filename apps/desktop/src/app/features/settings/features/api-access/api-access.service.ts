import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export interface TenantApiAppItem {
  id: string;
  nombre: string;
  descripcion?: string | null;
  apiKeyPrefix: string;
  allowedOrigins: string[];
  estado: 'ACTIVO' | 'REVOCADO';
  lastUsedAt?: string | null;
  requestCount: number;
  creadoEn: string;
}

export interface TenantApiAppsResponse {
  isEnterprise: boolean;
  maxAllowedApps: number;
  apps: TenantApiAppItem[];
}

export interface CreateTenantAppDto {
  nombre: string;
  descripcion?: string;
  allowedOrigins?: string[];
}

export interface CreateAppResponse {
  message: string;
  rawApiKey: string;
  app: TenantApiAppItem;
}

@Injectable({
  providedIn: 'root',
})
export class ApiAccessService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/tenant-api/apps`;

  data = signal<TenantApiAppsResponse | null>(null);
  loading = signal<boolean>(false);

  loadApps(): Observable<TenantApiAppsResponse> {
    this.loading.set(true);
    return this.http.get<TenantApiAppsResponse>(this.apiUrl).pipe(
      tap({
        next: (res) => {
          this.data.set(res);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  createApp(dto: CreateTenantAppDto): Observable<CreateAppResponse> {
    return this.http.post<CreateAppResponse>(this.apiUrl, dto).pipe(
      tap((res) => {
        this.data.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            apps: [res.app, ...prev.apps],
          };
        });
      }),
    );
  }

  rotateKey(appId: string): Observable<{ message: string; rawApiKey: string; app: any }> {
    return this.http.post<{ message: string; rawApiKey: string; app: any }>(
      `${this.apiUrl}/${appId}/rotate`,
      {},
    ).pipe(
      tap((res) => {
        this.data.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            apps: prev.apps.map((a) =>
              a.id === appId
                ? { ...a, apiKeyPrefix: res.app.apiKeyPrefix, estado: 'ACTIVO' }
                : a,
            ),
          };
        });
      }),
    );
  }

  revokeApp(appId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${appId}/revoke`, {}).pipe(
      tap(() => {
        this.data.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            apps: prev.apps.map((a) =>
              a.id === appId ? { ...a, estado: 'REVOCADO' } : a,
            ),
          };
        });
      }),
    );
  }

  deleteApp(appId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${appId}`).pipe(
      tap(() => {
        this.data.update((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            apps: prev.apps.filter((a) => a.id !== appId),
          };
        });
      }),
    );
  }
}
