import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '@/environments/environment';
import { AuthState } from '../auth/auth.state';

export type AppNotification = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  severidad: string;
  icono?: string;
  creadaEn: string;
  leidaEn?: string | null;
  payload?: Record<string, unknown> | null;
};

export interface NotificationCatalogItem {
  id: string;
  category: string;
  categoryLabel: string;
  name: string;
  description: string;
  icon: string;
  severity: string;
  defaultChannels: string[];
}

export interface UserNotificationPreference {
  tipo: string;
  canal: string;
  habilitado: boolean;
}

type NotificationResponse = {
  items: AppNotification[];
  total: number;
  page: number;
  limit: number;
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthState);
  private readonly _notifications = signal<AppNotification[]>([]);
  private readonly _unreadCount = signal(0);
  private readonly _inAppEnabled = signal(true);
  private eventSource?: EventSource;

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly inAppEnabled = this._inAppEnabled.asReadonly();

  load(unread = false, tipo?: string) {
    let params = new HttpParams().set('limit', 50).set('unread', unread);
    if (tipo) params = params.set('tipo', tipo);
    return this.http.get<NotificationResponse>(`${environment.apiUrl}/notifications`, { params });
  }

  refresh(): void {
    this.load().subscribe({
      next: (response) => {
        this._notifications.set(response.items);
        this._unreadCount.set(response.items.filter((item) => !item.leidaEn).length);
      },
    });
  }

  setItems(items: AppNotification[]): void {
    this._notifications.set(items);
    this._unreadCount.set(items.filter((item) => !item.leidaEn).length);
  }

  unread(): void {
    this.http.get<{ count: number }>(`${environment.apiUrl}/notifications/unread-count`).subscribe({
      next: (response) => this._unreadCount.set(response.count),
    });
  }

  markRead(id: string): void {
    this.http.patch(`${environment.apiUrl}/notifications/${id}/read`, {}).subscribe({
      next: () => {
        this._notifications.update((items) => items.map((item) => {
          if (item.id !== id || item.leidaEn) return item;
          this._unreadCount.update((count) => Math.max(0, count - 1));
          return { ...item, leidaEn: new Date().toISOString() };
        }));
      },
    });
  }

  markAllRead(): void {
    this.http.post(`${environment.apiUrl}/notifications/read-all`, {}).subscribe({
      next: () => {
        this._notifications.update((items) => items.map((item) => ({ ...item, leidaEn: item.leidaEn || new Date().toISOString() })));
        this._unreadCount.set(0);
      },
    });
  }

  delete(id: string): void {
    this.http.delete(`${environment.apiUrl}/notifications/${id}`).subscribe({
      next: () => {
        this._notifications.update((items) => {
          const removed = items.find((item) => item.id === id);
          if (removed && !removed.leidaEn) this._unreadCount.update((count) => Math.max(0, count - 1));
          return items.filter((item) => item.id !== id);
        });
      },
    });
  }

  clearAll(): void {
    this.http.delete<{ count: number }>(`${environment.apiUrl}/notifications`).subscribe({
      next: () => {
        this._notifications.set([]);
        this._unreadCount.set(0);
      },
    });
  }

  loadPreferences(): void {
    this.http.get<Array<{ tipo: string; canal: string; habilitado: boolean }>>(`${environment.apiUrl}/notifications/preferences`).subscribe({
      next: (preferences) => {
        const preference = preferences.find((item) => item.tipo === 'ALL' && item.canal === 'IN_APP');
        this._inAppEnabled.set(preference?.habilitado !== false);
      },
    });
  }

  setInAppEnabled(enabled: boolean): void {
    this.savePreference('ALL', 'IN_APP', enabled).subscribe({
      next: () => {
        this._inAppEnabled.set(enabled);
        if (enabled) this.startRealtime();
        else this.stopRealtime();
      },
    });
  }

  startRealtime(): void {
    const token = this.auth.accessToken();
    if (!token || this.eventSource) return;
    this.eventSource = new EventSource(`${environment.apiUrl}/notifications/stream?access_token=${encodeURIComponent(token)}`);
    this.eventSource.onmessage = (event) => {
      const notification = JSON.parse(event.data) as AppNotification;
      this._notifications.update((items) => [notification, ...items.filter((item) => item.id !== notification.id)]);
      if (!notification.leidaEn) this._unreadCount.update((count) => count + 1);
    };
    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = undefined;
      window.setTimeout(() => this.startRealtime(), 10000);
    };
  }

  stopRealtime(): void {
    this.eventSource?.close();
    this.eventSource = undefined;
  }

  async enableWebPush(publicKey: string): Promise<boolean> {
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    const registration = await navigator.serviceWorker.register('push-sw.js');
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(publicKey),
    });
    await firstValueFrom(this.http.post(`${environment.apiUrl}/notifications/push-subscriptions`, {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: this.arrayBufferToBase64(subscription.getKey('auth')),
      },
      userAgent: navigator.userAgent,
    }));
    return true;
  }

  getCatalog() {
    return this.http.get<NotificationCatalogItem[]>(`${environment.apiUrl}/notifications/catalog`);
  }

  getPreferences() {
    return this.http.get<UserNotificationPreference[]>(`${environment.apiUrl}/notifications/preferences`);
  }

  savePreferencesBatch(preferences: UserNotificationPreference[]) {
    return this.http.post(`${environment.apiUrl}/notifications/preferences/batch`, { preferences });
  }

  resetPreferences() {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/notifications/preferences/reset`, {});
  }

  savePreference(tipo: string, canal: string, habilitado: boolean) {
    return this.http.patch(`${environment.apiUrl}/notifications/preferences`, { tipo, canal, habilitado });
  }

  private urlBase64ToUint8Array(value: string): ArrayBuffer {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map((character) => character.charCodeAt(0))).buffer as ArrayBuffer;
  }

  private arrayBufferToBase64(value: ArrayBuffer | null): string {
    if (!value) return '';
    return btoa(String.fromCharCode(...new Uint8Array(value)));
  }
}
