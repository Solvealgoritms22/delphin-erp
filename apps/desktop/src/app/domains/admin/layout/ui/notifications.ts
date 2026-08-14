import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatDialog } from '@angular/material/dialog';
import { format } from 'date-fns';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { BellIcon } from 'ng-animated-icons';

@Component({
  selector: 'notifications',
  imports: [
    MatIconButton,
    MatIcon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButton,
    MatDivider,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    TranslocoPipe,
    BellIcon,
  ],
  template: `
    <button
      matIconButton
      class="relative"
      cdkOverlayOrigin
      (click)="toggle()"
      #trigger="cdkOverlayOrigin"
    >
      <i-bell [size]="20" />
      @if (unreadCount() > 0) {
        <span class="pointer-events-none absolute right-0.5 top-0.5 z-20 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-white dark:ring-neutral-900 shadow-xs">
          {{ unreadCount() > 99 ? '99+' : unreadCount() }}
        </span>
      }
    </button>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="trigger"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayBackdropClass]="'transparent'.split(' ')"
      (detach)="toggle(false)"
      (backdropClick)="toggle(false)"
    >
      <div
        class="z-10 flex max-h-120 w-full max-w-xs flex-col overflow-y-auto rounded-lg bg-white shadow-(--mat-sys-level2) dark:bg-neutral-800"
      >
        <!-- Header -->
        <div class="flex flex-col bg-neutral-100 dark:bg-neutral-800">
          <div class="flex items-center p-4 pb-0 pl-6">
            <div class="flex items-center gap-x-3">
              <mat-icon
                class="size-4.5"
                svgIcon="bell"
              />
              <div class="text-xl font-semibold tracking-tighter">
                 {{ 'notifications.title' | transloco }}
              </div>
            </div>
            <div class="flex-auto"></div>
            <button
              matIconButton
              [matMenuTriggerFor]="notificationsMenu"
            >
              <mat-icon svgIcon="ellipsis-vertical" />
            </button>
            <mat-menu #notificationsMenu="matMenu">
               <button mat-menu-item (click)="markAllRead()">
                <mat-icon svgIcon="check-check" />
                 {{ 'notifications.markAllRead' | transloco }}
               </button>
               <button mat-menu-item (click)="clearAll()">
                 <mat-icon svgIcon="trash-2" />
                  {{ 'notifications.clearAll' | transloco }}
               </button>
               <button mat-menu-item (click)="toggleInApp()">
                 <mat-icon [svgIcon]="inAppEnabled() ? 'bell-off' : 'bell'" />
                  {{ (inAppEnabled() ? 'notifications.disable' : 'notifications.enable') | transloco }}
               </button>
            </mat-menu>
          </div>

          <!-- Filters -->
          <div class="flex items-center gap-x-2 px-6 pt-3 pb-4">
            @for (filter of filters; track filter.value) {
              <button
                [matButton]="
                  currentFilter().value === filter.value ? 'filled' : 'text'
                "
                class="small"
                (click)="setFilter(filter)"
              >
                 {{ filter.label | transloco }}
              </button>
            }
          </div>
          <mat-divider />
        </div>

        <!-- List -->
        <div class="flex flex-col">
          @if (notifications().length === 0) {
            <div class="flex min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
              <img class="mb-4 h-20 w-auto select-none pointer-events-none drop-shadow-xs" src="illustrations/18.svg" [alt]="'notifications.emptyTitle' | transloco">
              <div class="text-sm font-semibold text-neutral-900 dark:text-white">{{ 'notifications.emptyTitle' | transloco }}</div>
              <p class="mt-1 max-w-[220px] text-xs text-neutral-500 dark:text-neutral-400">
                 {{ 'notifications.emptyDescription' | transloco }}
              </p>
            </div>
          } @else {
            @for (
              notification of notifications();
              track notification.id;
              let last = $last
            ) {
            <div class="flex gap-x-2 py-3 pr-4 pl-6" [class.opacity-60]="!!notification.leidaEn">
              <div class="flex-auto">
                @if (notification.titulo) {
                  <div class="font-semibold">{{ notification.titulo }}</div>
                }
                <div class="line-clamp-2">{{ notification.mensaje }}</div>
                 <div class="mt-1 text-xs text-neutral-500" [title]="exactTime(notification.creadaEn)">
                   {{ exactTime(notification.creadaEn) }}
                </div>
              </div>
              <button
                matIconButton
                [matMenuTriggerFor]="notificationActions"
              >
                <mat-icon svgIcon="ellipsis-vertical" />
              </button>
              <mat-menu #notificationActions="matMenu">
                <button mat-menu-item (click)="markRead(notification.id)">
                  <mat-icon svgIcon="list-check" />
                   {{ 'notifications.markRead' | transloco }}
                </button>
                 <button mat-menu-item (click)="deleteNotification(notification.id)">
                  <mat-icon svgIcon="trash" />
                   {{ 'common.delete' | transloco }}
                </button>
              </mat-menu>
            </div>

            @if (!last) {
              <mat-divider
                class="[--mat-divider-color:var(--color-neutral-200)] dark:[--mat-divider-color:var(--color-neutral-700)]"
              />
            }
            }
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class Notifications implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);
  // State
  protected open = signal(false);
  protected filters = [
    {
      value: 'all',
       label: 'notifications.all',
    },
    {
      value: 'system',
       label: 'notifications.system',
    },
  ];
  protected currentFilter = signal<{ value: string; label: string }>({
    value: 'all',
     label: 'notifications.all',
  });

  // Data
  protected notifications = this.notificationService.notifications;
  protected unreadCount = this.notificationService.unreadCount;
  protected inAppEnabled = this.notificationService.inAppEnabled;

  ngOnInit(): void {
    this.notificationService.refresh();
    this.notificationService.unread();
    this.notificationService.loadPreferences();
    this.notificationService.startRealtime();
  }

  ngOnDestroy(): void {
    this.notificationService.stopRealtime();
  }

  toggle(force: boolean | null = null) {
    this.open.update((value) => {
      if (force === null) {
        return !value;
      }

      return force;
    });
  }

  exactTime(time: string): string {
    const date = new Date(time);
    return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : format(date, 'dd/MM/yyyy HH:mm');
  }

  markRead(id: string): void {
    this.notificationService.markRead(id);
  }

  markAllRead(): void {
    this.notificationService.markAllRead();
  }

  setFilter(filter: { value: string; label: string }): void {
    this.currentFilter.set(filter);
    const tipo = filter.value === 'system' ? 'SYSTEM' : undefined;
    this.notificationService.load(filter.value === 'unread', tipo).subscribe({
      next: (response) => this.notificationService.setItems(response.items),
    });
  }

  deleteNotification(id: string): void {
    this.notificationService.delete(id);
  }

  clearAll(): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: 'min(440px, calc(100vw - 32px))',
      data: {
         title: this.transloco.translate('notifications.clearAll'),
         message: this.transloco.translate('notifications.clearAllMessage'),
         confirmLabel: this.transloco.translate('notifications.clearAll'),
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) this.notificationService.clearAll();
    });
  }

  toggleInApp(): void {
    this.notificationService.setInAppEnabled(!this.inAppEnabled());
  }
}
