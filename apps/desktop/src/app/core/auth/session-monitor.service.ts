import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthState } from './auth.state';

@Injectable({
  providedIn: 'root',
})
export class SessionMonitorService {
  private readonly http = inject(HttpClient);
  private readonly state = inject(AuthState);
  private readonly intervalMs = 30000;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    this.stop();
    if (!this.state.isAuthenticated()) return;
    this.check();
    this.timer = setInterval(() => this.check(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private check(): void {
    if (!this.state.isAuthenticated()) {
      this.stop();
      return;
    }
    // Si la sesión fue revocada/expiró, el endpoint devuelve 401 y el
    // interceptor cierra la sesión y redirige al login.
    this.http.get<void>(`${environment.apiUrl}/auth/me`).subscribe({
      error: () => {},
    });
  }
}
