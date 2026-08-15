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
  private readonly intervalMs = 10000;
  private timer: ReturnType<typeof setInterval> | null = null;
  private boundFocus: (() => void) | null = null;
  private boundVisibility: (() => void) | null = null;

  start(): void {
    this.stop();
    if (!this.state.isAuthenticated()) return;
    this.check();
    this.timer = setInterval(() => this.check(), this.intervalMs);

    if (typeof window !== 'undefined') {
      this.boundFocus = () => this.check();
      this.boundVisibility = () => {
        if (document.visibilityState === 'visible') {
          this.check();
        }
      };
      window.addEventListener('focus', this.boundFocus);
      document.addEventListener('visibilitychange', this.boundVisibility);
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (typeof window !== 'undefined') {
      if (this.boundFocus) {
        window.removeEventListener('focus', this.boundFocus);
        this.boundFocus = null;
      }
      if (this.boundVisibility) {
        document.removeEventListener('visibilitychange', this.boundVisibility);
        this.boundVisibility = null;
      }
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
