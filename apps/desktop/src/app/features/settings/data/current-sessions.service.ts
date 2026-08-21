import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '@/environments/environment';

export interface SessionLog {
  id: string;
  personName: string;
  personAvatar: string;
  browserName: string;
  osName: string;
  browserIcon: string;
  ipAddress: string;
  locationCountry: string;
  locationFlagUrl?: string;
  isActive: boolean;
  isCurrent: boolean;
  lastSeenAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CurrentSessionsService {
  private readonly http = inject(HttpClient);
  private readonly _sessions = signal<SessionLog[]>([]);
  readonly sessions = this._sessions.asReadonly();

  getSessions(): Observable<SessionLog[]> {
    return this.http.get<SessionLog[]>(`${environment.apiUrl}/sessions`).pipe(
      tap((sessions) => this._sessions.set(sessions.map((session) => this.decorate(session)))),
    );
  }

  revoke(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/sessions/${id}`).pipe(
      tap(() => this.removeLocal(id)),
    );
  }

  revokeOthers(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/sessions/revoke-others`, {}).pipe(
      tap(() => this._sessions.update((sessions) => sessions.filter((session) => session.isCurrent))),
    );
  }

  private removeLocal(id: string): void {
    this._sessions.update((sessions) =>
      sessions.map((session) =>
        session.id === id ? { ...session, isActive: false } : session,
      ),
    );
  }

  private decorate(session: SessionLog): SessionLog {
    const browserIcons: Record<string, string> = {
      Chrome: 'globe',
      Firefox: 'globe',
      Safari: 'compass',
      Edge: 'compass',
    };
    return {
      ...session,
      personAvatar: session.personAvatar || '',
      browserIcon: browserIcons[session.browserName] || 'monitor',
    };
  }
}
