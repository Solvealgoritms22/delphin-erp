import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService, AppNotification } from '@core/notifications/notification.service';
import { environment } from '@/environments/environment';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'notifications',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-900 overflow-hidden">
      <!-- Header Estándar Fuse -->
      <header class="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 gap-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'notifications.title' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'notifications.description' | transloco }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            mat-stroked-button
            class="!rounded-xl"
            (click)="goToSettings()"
          >
            <mat-icon svgIcon="sliders-horizontal" class="!w-4 !h-4 mr-2 text-neutral-500 dark:text-neutral-400"></mat-icon>
            <span>{{ 'notifications.configAlerts' | transloco }}</span>
          </button>

          <button
            type="button"
            mat-flat-button
            color="primary"
            class="!rounded-xl !px-4"
            [disabled]="notifications().length === 0 || unreadCount() === 0"
            (click)="markAllRead()"
          >
            <mat-icon svgIcon="check-circle" class="!w-4 !h-4 mr-2"></mat-icon>
            <span>{{ 'notifications.markAllRead' | transloco }}</span>
          </button>
        </div>
      </header>

      <!-- Barra de Filtros -->
      <div class="shrink-0 flex items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-3.5 md:px-8">
        <div class="flex items-center gap-2">
          @for (filter of filters; track filter.value) {
            <button
              type="button"
              mat-button
              class="!rounded-xl !text-xs !font-semibold"
              [class.!bg-primary-50]="activeFilter() === filter.value"
              [class.!text-primary-700]="activeFilter() === filter.value"
              [class.dark:!bg-primary-950/40]="activeFilter() === filter.value"
              [class.dark:!text-primary-400]="activeFilter() === filter.value"
              [class.!text-neutral-600]="activeFilter() !== filter.value"
              [class.dark:!text-neutral-400]="activeFilter() !== filter.value"
              (click)="setFilter(filter.value)"
            >
              <span>{{ (filter.value === 'all' ? 'notifications.allFilter' : 'notifications.unreadFilter') | transloco }}</span>
              @if (filter.value === 'unread' && unreadCount() > 0) {
                <span class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300">
                  {{ unreadCount() }}
                </span>
              }
            </button>
          }
        </div>

        <div class="text-xs text-neutral-400 dark:text-neutral-500">
          {{ 'notifications.showingAlerts' | transloco }} {{ filteredNotifications().length }}
        </div>
      </div>

      <!-- Listado de Notificaciones -->
      <main class="flex-auto min-h-0 overflow-y-auto">
        @if (filteredNotifications().length === 0) {
          <div class="flex min-h-[420px] flex-col items-center justify-center px-6 py-16 text-center">
            <div class="flex size-14 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 mb-4">
              <mat-icon svgIcon="bell-off" class="!w-7 !h-7"></mat-icon>
            </div>
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">
              {{ (activeFilter() === 'unread' ? 'notifications.emptyUnreadTitle' : 'notifications.emptyTitle') | transloco }}
            </h2>
            <p class="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400">
              {{ (activeFilter() === 'unread' ? 'notifications.emptyUnreadDescription' : 'notifications.emptyDescription') | transloco }}
            </p>
          </div>
        } @else {
          <div class="divide-y divide-neutral-100 dark:divide-neutral-800/80">
            @for (notification of filteredNotifications(); track notification.id) {
              <article
                class="flex gap-4 px-6 py-5 transition-colors hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 md:px-8"
                [class.bg-primary-50/30]="!notification.leidaEn"
                [class.dark:bg-primary-950/20]="!notification.leidaEn"
              >
                <!-- Avatar Circular Estándar Fuse -->
                <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300">
                  <mat-icon [svgIcon]="notification.icono || iconFor(notification.tipo)" class="!w-5 !h-5"></mat-icon>
                </div>

                <!-- Contenido -->
                <div class="min-w-0 flex-auto">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <h2 class="text-sm font-semibold text-neutral-900 dark:text-white">
                      {{ getItemTitle(notification) }}
                    </h2>
                    <time class="text-xs text-neutral-400 dark:text-neutral-500">
                      {{ notification.creadaEn | date: 'dd/MM/yyyy · hh:mm a' }}
                    </time>
                  </div>

                  <p class="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    {{ notification.mensaje }}
                  </p>

                  <div class="mt-2.5 flex items-center gap-2">
                    @if (!notification.leidaEn) {
                      <button
                        type="button"
                        mat-button
                        class="!px-3 !py-1 !min-h-[28px] !h-7 !rounded-lg !text-xs !font-medium !text-primary-600 dark:!text-primary-400 hover:!bg-primary-500/10 dark:hover:!bg-primary-500/20"
                        (click)="markRead(notification.id)"
                      >
                        {{ 'notifications.markRead' | transloco }}
                      </button>
                    } @else {
                      <span class="px-2 text-xs text-neutral-400 dark:text-neutral-500 flex items-center gap-1">
                        <mat-icon svgIcon="check-circle" class="!w-3.5 !h-3.5 text-emerald-500"></mat-icon>
                        {{ 'notifications.readStatus' | transloco }}
                      </span>
                    }

                    <button
                      type="button"
                      mat-button
                      class="!px-3 !py-1 !min-h-[28px] !h-7 !rounded-lg !text-xs !font-medium !text-neutral-400 hover:!text-rose-600 dark:hover:!text-rose-400 hover:!bg-rose-500/10 dark:hover:!bg-rose-500/20"
                      (click)="deleteNotification(notification.id)"
                    >
                      {{ 'notifications.delete' | transloco }}
                    </button>
                  </div>
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
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  readonly notifications = this.service.notifications;
  readonly unreadCount = this.service.unreadCount;
  readonly activeFilter = signal<'all' | 'unread'>('all');
  readonly environment = environment;

  readonly filters = [
    { value: 'all' as const },
    { value: 'unread' as const },
  ];

  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    if (this.activeFilter() === 'unread') {
      return list.filter((n) => !n.leidaEn);
    }
    return list;
  });

  ngOnInit(): void {
    this.service.refresh();
    this.service.unread();
    this.service.startRealtime();
  }

  ngOnDestroy(): void {
    this.service.stopRealtime();
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.activeFilter.set(filter);
  }

  markRead(id: string): void {
    this.service.markRead(id);
  }

  markAllRead(): void {
    this.service.markAllRead();
  }

  deleteNotification(id: string): void {
    this.service.delete(id);
  }

  goToSettings(): void {
    this.router.navigate(['/admin/settings/notifications']);
  }

  getItemTitle(notification: AppNotification): string {
    const key = `notificationSettings.items.${notification.tipo}_name`;
    const translated = this.transloco.translate(key);
    return translated !== key ? translated : notification.titulo;
  }

  iconFor(type: string): string {
    if (type.includes('SECURITY') || type.includes('LOGIN')) return 'shield-check';
    if (type.includes('INVOICE') || type.includes('NCF')) return 'file-text';
    if (type.includes('QUOTE')) return 'send';
    if (type.includes('PAYMENT') || type.includes('CXC')) return 'dollar-sign';
    if (type.includes('PURCHASE')) return 'shopping-bag';
    if (type.includes('STOCK') || type.includes('INVENTORY')) return 'package';
    if (type.includes('BACKUP')) return 'database';
    return 'bell';
  }
}

