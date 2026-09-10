import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError, finalize, firstValueFrom, switchMap, EMPTY } from 'rxjs';
import { AuthState } from './auth.state';
import { AuthResponse, LoginCredentials, User } from './auth.types';
import { SessionMonitorService } from './session-monitor.service';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';
import { environment } from '@/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private state = inject(AuthState);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);
  readonly googleLoading = signal(false);
  private googleAttempt = 0;
  private http = inject(HttpClient);
  private sessionMonitor = inject(SessionMonitorService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  /**
   * Real login calling the NestJS API.
   */
  private receiveLogin(response: any): Observable<AuthResponse> {
    if (response.mfaRequired) {
      sessionStorage.setItem('mfa_challenge', JSON.stringify({ token: response.challengeToken, expiresAt: response.expiresAt }));
      void this.router.navigateByUrl('/auth/mfa');
      return EMPTY;
    }
    const user: User = {
      id: response.user.sub || response.user.id, name: response.user.name || response.user.email.split('@')[0],
      email: response.user.email, avatar: response.user.avatar || '', mustChangePassword: response.user.mustChangePassword === true,
      role: response.user.roleId || 'ADMIN', plan: response.user.plan || 'Starter',
      empresaId: response.user.empresaId, permissions: response.user.permissions || [], sessionId: response.user.sessionId,
    };
    this.state.setSession(user, response.access_token, user.empresaId);
    this.sessionMonitor.start();
    sessionStorage.removeItem('mfa_challenge');
    return of({ accessToken: response.access_token, user });
  }

  signIn(credentials: LoginCredentials): Observable<AuthResponse> {
    sessionStorage.removeItem('mfa_challenge');
    return this.http.post(this.apiUrl + '/login', credentials).pipe(switchMap(response => this.receiveLogin(response)));
  }

  verifyMfa(code: string): Observable<AuthResponse> {
    let challenge: {token?: string} = {};
    try { challenge = JSON.parse(sessionStorage.getItem('mfa_challenge') || '{}'); } catch {}
    return this.http.post(this.apiUrl + '/mfa/verify', {challengeToken: challenge.token || '', code})
      .pipe(switchMap(response => this.receiveLogin(response)));
  }

  /**
   * Switch the active tenant (company) for the current user.
   */
  switchTenant(empresaId: string): Observable<any> {
    return this.http.post<{ access_token: string, user: any }>(`${this.apiUrl}/switch-tenant`, { empresaId }).pipe(
      tap(response => {
        const currentUser = this.state.user();
        if (currentUser) {
          const updated: User = {
            ...currentUser,
            empresaId: response.user.empresaId,
            name: response.user.name || currentUser.name,
            avatar: response.user.avatar || currentUser.avatar,
            mustChangePassword: response.user.mustChangePassword === true,
            plan: response.user.plan || currentUser.plan,
            permissions: response.user.permissions || currentUser.permissions || [],
            sessionId: response.user.sessionId || currentUser.sessionId,
          };
          this.state.setSession(updated, response.access_token, response.user.empresaId);
        }
      })
    );
  }

  /**
   * Get all empresas for the current logged-in user.
   */
  getMyEmpresas(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/empresas/me`);
  }

  signUp(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  verifyOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, { email, otp });
  }

  verifyAccount(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-account`, { email, otp });
  }

  resendVerification(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-verification`, { email });
  }

  resetPassword(email: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { email, otp, newPassword });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.apiUrl}/password`, {
      currentPassword,
      newPassword,
    });
  }

  async startGoogleSignIn(): Promise<void> {
    if (this.googleLoading() || typeof window === 'undefined') return;
    this.googleLoading.set(true);
    const attempt = ++this.googleAttempt;
    const bridge = (window as unknown as { dolphinWindow?: { openExternal(url: string): void } }).dolphinWindow;
    const popup = bridge ? null : window.open('about:blank', 'dolphin-google', 'width=520,height=720');
    try {
      if (!bridge && !popup) throw new Error('popup_blocked');
      const verifier = this.base64url(crypto.getRandomValues(new Uint8Array(32)));
      const challenge = this.base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
      const flow = await firstValueFrom(this.http.post<{ flowId: string; url: string }>(this.apiUrl + '/google/start', { challenge }));
      const target = new URL(flow.url);
      if (target.origin !== 'https://accounts.google.com') throw new Error('invalid_provider');
      if (bridge) bridge.openExternal(target.href);
      else if (popup) { popup.opener = null; popup.location.href = target.href; }
      const expiresAt = Date.now() + 10 * 60_000;
      while (attempt === this.googleAttempt && Date.now() < expiresAt) {
        const result = await firstValueFrom(this.http.post<{ status: string; needsCompany?: boolean; needsPolicies?: boolean }>(
          this.apiUrl + '/google/status', { flowId: flow.flowId, verifier }));
        if (result.status === 'ready') {
          popup?.close();
          sessionStorage.setItem('google_setup', JSON.stringify({ flowId: flow.flowId, verifier, expiresAt, ...result }));
          if (!result.needsCompany && !result.needsPolicies) {
            const response = await firstValueFrom(this.completeGoogleSetup({ acceptedPolicies: false }), { defaultValue: null });
            if (response) await this.router.navigateByUrl(response.user.mustChangePassword ? '/auth/change-password' : '/admin/dashboards');
          } else await this.router.navigateByUrl('/auth/google/setup');
          return;
        }
        if (popup?.closed) throw new Error('cancelled');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      throw new Error('expired');
    } catch {
      popup?.close();
      sessionStorage.removeItem('google_setup');
      this.snackBar.open(this.transloco.translate('auth.googleSetup.error'), this.transloco.translate('common.close'), {
        duration: 6000, horizontalPosition: 'center', verticalPosition: 'bottom',
      });
    } finally { this.googleLoading.set(false); }
  }

  private base64url(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  googleSetup() {
    try {
      const setup = JSON.parse(sessionStorage.getItem('google_setup') || 'null');
      return setup?.expiresAt > Date.now() ? setup as { flowId: string; verifier: string; needsCompany: boolean; needsPolicies: boolean } : null;
    } catch { return null; }
  }

  completeGoogleSetup(data: {
    acceptedPolicies: boolean;
    companyName?: string;
    rnc?: string;
  }): Observable<AuthResponse> {
    return this.http.post(this.apiUrl + '/google/complete', { ...data, flowId: this.googleSetup()?.flowId, verifier: this.googleSetup()?.verifier }).pipe(
      tap(() => sessionStorage.removeItem('google_setup')),
      switchMap(response => this.receiveLogin(response)),
    );
  }

  acceptInvitation(data: {
    token: string;
    newPassword: string;
    confirmPassword: string;
    acceptedPolicies: boolean;
  }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/invitations/accept`, data);
  }

  /**
   * Sign out the user: revokes the server-side session and clears local state.
   */
  signOut(): Observable<boolean> {
    return this.http.post<void>(`${this.apiUrl}/logout`, {}).pipe(
      catchError(() => of(undefined)),
      finalize(() => {
        this.sessionMonitor.stop();
        this.state.clearSession();
      }),
      map(() => true),
    );
  }
}
