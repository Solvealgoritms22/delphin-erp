import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@core/notifications/notification.service';
import { environment } from '@/environments/environment';
import { TranslocoPipe } from '@jsverse/transloco';
import { BellIcon, CheckCheckIcon } from 'ng-animated-icons';

@Component({
  selector: 'notifications',
  standalone: true,
   imports: [CommonModule, MatButtonModule, MatIconModule, TranslocoPipe, BellIcon, CheckCheckIcon],
  template: `
    <div class="flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-900 overflow-hidden">
      <header class="shrink-0 flex flex-col gap-1 border-b border-neutral-200 px-6 py-8 dark:border-neutral-800 md:px-8">
        <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'extras.notifications.title' | transloco }}</h1>
        <p class="text-sm text-neutral-500 dark:text-neutral-400">{{ 'extras.notifications.description' | transloco }}</p>
      </header>

      <div class="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4 dark:border-neutral-800 md:px-8">
        <div class="flex items-center gap-2">
          @for (filter of filters; track filter.value) {
            <button type="button" mat-button [class.!bg-blue-50]="activeFilter() === filter.value" [class.!text-blue-700]="activeFilter() === filter.value" (click)="setFilter(filter.value)">
              {{ filter.label }}
            </button>
          }
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" mat-stroked-button class="!rounded-xl" [disabled]="!environment.webPushPublicKey" (click)="enableWebPush()">
            <i-bell [size]="16" class="mr-2" />
             {{ 'extras.notifications.enable' | transloco }}
          </button>
          <button type="button" mat-stroked-button class="!rounded-xl" [disabled]="notifications().length === 0" (click)="markAllRead()">
            <i-check-check [size]="16" class="mr-2" />
           {{ 'extras.notifications.markAll' | transloco }}
          </button>
        </div>
      </div>

      <main class="flex-auto min-h-0 overflow-y-auto">
        @if (notifications().length === 0) {
          <div class="flex min-h-[520px] flex-col items-center justify-center px-6 py-16 text-center">
            <img class="mb-6 h-36 w-auto select-none pointer-events-none drop-shadow-xs" src="illustrations/18.svg" alt="No notifications">
             <h2 class="text-xl font-bold text-neutral-900 dark:text-white">{{ 'extras.notifications.emptyTitle' | transloco }}</h2>
             <p class="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">{{ 'extras.notifications.emptyDescription' | transloco }}</p>
          </div>
        } @else {
          <div class="divide-y divide-neutral-100 dark:divide-neutral-800">
            @for (notification of notifications(); track notification.id) {
              <article class="flex gap-4 px-6 py-5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40 md:px-8" [class.bg-blue-50\/40]="!notification.leidaEn">
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
                  <mat-icon [svgIcon]="notification.icono || iconFor(notification.tipo)" class="icon-size-5"></mat-icon>
                </div>
                <div class="min-w-0 flex-auto">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h2 class="font-semibold text-neutral-900 dark:text-white">{{ notification.titulo }}</h2>
                    <time class="text-xs text-neutral-500" [dateTime]="notification.creadaEn">{{ notification.creadaEn | date: 'dd/MM/yyyy HH:mm' }}</time>
                  </div>
                  <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{{ notification.mensaje }}</p>
                  @if (!notification.leidaEn) {
                    <button type="button" mat-button class="!mt-2 !px-0 !text-blue-600" (click)="markRead(notification.id)">
                       {{ 'extras.notifications.markRead' | transloco }}
                    </button>
                  }
                </div>
              </article>
            }
          </div>
        }
      </main>
    </div>
  `,
})
export default class Notifications implements OnInit, OnDestroy {
  private readonly service = inject(NotificationService);
  readonly notifications = this.service.notifications;
  readonly filters = [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
  ];
  readonly activeFilter = signal('all');
  readonly environment = environment;

  ngOnInit(): void {
    this.service.refresh();
    this.service.unread();
    this.service.startRealtime();
  }

  ngOnDestroy(): void {
    this.service.stopRealtime();
  }

  setFilter(filter: string): void {
    this.activeFilter.set(filter);
    this.service.load(filter === 'unread').subscribe({
      next: (response) => this.service.setItems(response.items),
    });
  }

  markRead(id: string): void {
    this.service.markRead(id);
  }

  markAllRead(): void {
    this.service.markAllRead();
  }

  async enableWebPush(): Promise<void> {
    const enabled = await this.service.enableWebPush(environment.webPushPublicKey);
    if (enabled) this.service.savePreference('ALL', 'WEB_PUSH', true).subscribe();
  }

  iconFor(type: string): string {
    if (type.includes('SECURITY')) return 'shield-alert';
    if (type.includes('BILLING') || type.includes('PAYMENT')) return 'credit-card';
    if (type.includes('INVENTORY')) return 'box';
    return 'bell';
  }
}
