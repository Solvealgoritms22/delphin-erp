import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export type SecuritySeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface SecurityLog {
  id: string;
  timestamp: string;
  eventType: string;
  eventIcon: string;
  eventColor: string;
  actionTaken: string;
  sourceIp: string;
  destinationIp: string;
  severity: SecuritySeverity;
  usuarioEmail?: string;
}

interface SecurityLogsResponse {
  items: Array<Omit<SecurityLog, 'eventIcon' | 'eventColor'> & { timestamp: string }>;
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class SecurityLogsService {
  private readonly http = inject(HttpClient);
  private readonly _logs = signal<SecurityLog[]>([]);
  readonly logs = this._logs.asReadonly();

  getLogs(search = '', severity = ''): Observable<SecurityLogsResponse> {
    let params = new HttpParams().set('limit', 100);
    if (search) params = params.set('search', search);
    if (severity) params = params.set('severity', severity);

    return this.http
      .get<SecurityLogsResponse>(`${environment.apiUrl}/security-logs`, { params })
      .pipe(
        tap((response) =>
          this._logs.set(response.items.map((item) => this.decorate(item))),
        ),
      );
  }

  clear(): Observable<{ count: number }> {
    return this.http.delete<{ count: number }>(`${environment.apiUrl}/security-logs`).pipe(
      tap(() => this._logs.set([])),
    );
  }

  private decorate(log: Omit<SecurityLog, 'eventIcon' | 'eventColor'>): SecurityLog {
    const styles: Record<SecuritySeverity, { icon: string; color: string }> = {
      Low: { icon: 'shield-check', color: 'text-emerald-500' },
      Medium: { icon: 'alert-triangle', color: 'text-blue-500' },
      High: { icon: 'shield-alert', color: 'text-amber-500' },
      Critical: { icon: 'shield-x', color: 'text-red-500' },
    };
    return {
      ...log,
      eventIcon: styles[log.severity].icon,
      eventColor: styles[log.severity].color,
    };
  }
}
