import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { User } from './auth.types';

@Injectable({
  providedIn: 'root',
})
export class AuthState {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _user = signal<User | null>(null);
  private readonly _accessToken = signal<string | null>(null);
  private readonly _empresaId = signal<string | null>(null);

  // Computed state
  readonly user = this._user.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly empresaId = this._empresaId.asReadonly();
  readonly isAuthenticated = computed(() => !!this._accessToken());

  constructor() {
    this.loadFromStorage();
  }

  setSession(user: User, token: string, empresaId?: string | null): void {
    this._user.set(user);
    this._accessToken.set(token);
    if (empresaId !== undefined) this._empresaId.set(empresaId);
    this.saveToStorage(user, token);
  }

  setUser(user: User): void {
    this._user.set(user);
    const token = this._accessToken();
    if (token) {
      this.saveToStorage(user, token);
    }
  }

  clearSession(): void {
    this._user.set(null);
    this._accessToken.set(null);
    this._empresaId.set(null);
    if (this.isBrowser) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_token');
    }
  }

  private loadFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      const token = localStorage.getItem('auth_token');
      const user = localStorage.getItem('auth_user');

      if (token && user) {
        // Prevent an old oversized JWT from breaking every API request.
        if (token.length > 8192) {
          this.clearSession();
          return;
        }
        this._accessToken.set(token);
        const parsed: User | null = JSON.parse(user);
        this._user.set(parsed);
        if (parsed?.empresaId) this._empresaId.set(parsed.empresaId);
      }
    } catch (e) {
      this.clearSession();
    }
  }

  private saveToStorage(user: User, token: string): void {
    if (this.isBrowser) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
  }
}
