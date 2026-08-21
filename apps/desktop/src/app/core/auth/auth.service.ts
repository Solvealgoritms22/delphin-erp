import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, map, catchError, finalize } from 'rxjs';
import { AuthState } from './auth.state';
import { AuthResponse, LoginCredentials, User } from './auth.types';
import { SessionMonitorService } from './session-monitor.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private state = inject(AuthState);
  private http = inject(HttpClient);
  private sessionMonitor = inject(SessionMonitorService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  /**
   * Real login calling the NestJS API
   */
  signIn(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http.post<{ access_token: string, user: any }>(`${this.apiUrl}/login`, credentials).pipe(
      map(response => {
        const user: User = {
          id: response.user.sub || response.user.id,
          name: response.user.name || response.user.email.split('@')[0],
          email: response.user.email,
           avatar: response.user.avatar || '',
           mustChangePassword: response.user.mustChangePassword === true,
          role: response.user.roleId || 'ADMIN',
          plan: response.user.plan || 'Starter',
          empresaId: response.user.empresaId,
          permissions: response.user.permissions || [],
          sessionId: response.user.sessionId,
        };
        return {
          accessToken: response.access_token,
          user
        };
      }),
      tap((response) => this.state.setSession(response.user, response.accessToken, response.user.empresaId)),
      tap(() => this.sessionMonitor.start())
    );
  }

  /**
   * Switch the active tenant (company) for the current user
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
   * Get all empresas for the current logged-in user
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

  startGoogleSignIn(): void {
    if (typeof window !== 'undefined') {
      window.location.href = `${environment.apiUrl}/auth/google`;
    }
  }

  completeGoogleSetup(data: {
    code: string;
    acceptedPolicies: boolean;
    companyName?: string;
    rnc?: string;
  }): Observable<AuthResponse> {
    return this.http.post<{ access_token: string; user: any }>(`${this.apiUrl}/google/complete`, data).pipe(
      map((response) => {
        const user: User = {
          id: response.user.sub || response.user.id,
          name: response.user.name || response.user.email.split('@')[0],
          email: response.user.email,
          avatar: response.user.avatar || '',
          mustChangePassword: response.user.mustChangePassword === true,
          role: response.user.roleId || 'ADMIN',
          plan: response.user.plan || 'Starter',
          empresaId: response.user.empresaId,
          permissions: response.user.permissions || [],
        };
        return { accessToken: response.access_token, user };
      }),
      tap((response) => {
        this.state.setSession(response.user, response.accessToken, response.user.empresaId);
        this.sessionMonitor.start();
      }),
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
   * Sign out the user: revokes the server-side session and clears local state
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
