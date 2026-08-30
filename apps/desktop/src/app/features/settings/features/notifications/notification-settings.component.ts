import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SkeletonComponent } from '@shared/components/skeleton/skeleton.component';
import {
  NotificationCatalogItem,
  NotificationService,
  UserNotificationPreference,
} from '@core/notifications/notification.service';

interface CategoryGroup {
  category: string;
  items: NotificationCatalogItem[];
}

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  host: { class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden' },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslocoPipe,
    SkeletonComponent,
  ],
  template: `
    <div class="flex h-full w-full min-w-0 flex-col bg-white dark:bg-neutral-900 overflow-hidden">
      <!-- Header Estándar Fuse -->
      <header class="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 gap-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'notificationSettings.title' | transloco }}
          </h1>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'notificationSettings.description' | transloco }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            mat-stroked-button
            type="button"
            class="!rounded-xl"
            (click)="resetToDefaults()"
            [disabled]="loading() || saving()"
          >
            <mat-icon svgIcon="refresh-cw" class="!w-4 !h-4 mr-2 text-neutral-500"></mat-icon>
            <span>{{ 'notificationSettings.reset' | transloco }}</span>
          </button>

          <button
            mat-stroked-button
            type="button"
            class="!rounded-xl"
            (click)="requestPushPermission()"
            [disabled]="loading()"
          >
            <mat-icon svgIcon="smartphone" class="!w-4 !h-4 mr-2 text-blue-500"></mat-icon>
            <span>{{ 'notificationSettings.enablePush' | transloco }}</span>
          </button>

          <button
            mat-flat-button
            color="primary"
            type="button"
            class="!rounded-xl !px-5"
            (click)="saveChanges()"
            [disabled]="loading() || saving() || !isDirty()"
          >
            <mat-icon [svgIcon]="saving() ? 'refresh-cw' : 'check-circle'" class="!w-4 !h-4 mr-2" [class.animate-spin]="saving()"></mat-icon>
            <span>{{ (saving() ? 'notificationSettings.saving' : 'notificationSettings.saveChanges') | transloco }}</span>
          </button>
        </div>
      </header>

      <!-- Contenido Principal -->
      <main class="flex-auto min-h-0 overflow-y-auto p-6 md:p-8">
        <div class="w-full space-y-6">
          @if (loading()) {
            <div class="space-y-6">
              <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
                <app-skeleton type="text" width="30%" height="1.5rem" />
                <app-skeleton type="text" width="60%" height="1rem" />
                <div class="space-y-3 pt-4">
                  <app-skeleton type="rect" height="3.5rem" />
                  <app-skeleton type="rect" height="3.5rem" />
                  <app-skeleton type="rect" height="3.5rem" />
                </div>
              </div>
            </div>
          } @else {
            @for (group of categories(); track group.category) {
              <div class="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
                <!-- Cabecera de Categoría con Columnas -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 gap-4">
                  <h2 class="text-base font-bold text-neutral-900 dark:text-white">
                    {{ ('notificationSettings.categories.' + group.category) | transloco }}
                  </h2>

                  <!-- Nombres de Canales alineados con los toggles -->
                  <div class="hidden sm:flex items-center gap-6 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    <span class="w-12 text-center">{{ 'notificationSettings.inAppChannel' | transloco }}</span>
                    <span class="w-12 text-center">{{ 'notificationSettings.emailChannel' | transloco }}</span>
                    <span class="w-12 text-center">{{ 'notificationSettings.pushChannel' | transloco }}</span>
                  </div>
                </div>

                <!-- Filas de Eventos -->
                <div class="divide-y divide-neutral-100 dark:divide-neutral-800/80">
                  @for (item of group.items; track item.id) {
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4 hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors">
                      <div class="min-w-0 flex-1">
                        <h3 class="text-sm font-semibold text-neutral-900 dark:text-white">
                          {{ getItemName(item) }}
                        </h3>
                        <p class="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                          {{ getItemDescription(item) }}
                        </p>
                      </div>

                      <!-- 3 Toggles de Canales -->
                      <div class="flex items-center justify-end gap-6 shrink-0">
                        <div class="w-12 flex items-center justify-center">
                          <mat-slide-toggle
                            [checked]="isChannelEnabled(item.id, 'IN_APP')"
                            (change)="onToggle(item.id, 'IN_APP', $event.checked)"
                            color="primary"
                            [matTooltip]="'notificationSettings.appTooltip' | transloco"
                          ></mat-slide-toggle>
                        </div>

                        <div class="w-12 flex items-center justify-center">
                          <mat-slide-toggle
                            [checked]="isChannelEnabled(item.id, 'EMAIL')"
                            (change)="onToggle(item.id, 'EMAIL', $event.checked)"
                            color="primary"
                            [matTooltip]="'notificationSettings.emailTooltip' | transloco"
                          ></mat-slide-toggle>
                        </div>

                        <div class="w-12 flex items-center justify-center">
                          <mat-slide-toggle
                            [checked]="isChannelEnabled(item.id, 'PUSH')"
                            (change)="onToggle(item.id, 'PUSH', $event.checked)"
                            color="primary"
                            [matTooltip]="'notificationSettings.pushTooltip' | transloco"
                          ></mat-slide-toggle>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
})
export default class NotificationSettingsComponent implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly catalog = signal<NotificationCatalogItem[]>([]);
  readonly preferences = signal<Map<string, boolean>>(new Map());
  private initialPreferences = new Map<string, boolean>();

  readonly categories = computed<CategoryGroup[]>(() => {
    const items = this.catalog();
    const map = new Map<string, CategoryGroup>();

    for (const item of items) {
      if (!map.has(item.category)) {
        map.set(item.category, {
          category: item.category,
          items: [],
        });
      }
      map.get(item.category)!.items.push(item);
    }

    return Array.from(map.values());
  });

  readonly isDirty = computed(() => {
    const current = this.preferences();
    if (current.size !== this.initialPreferences.size) return true;
    for (const [key, value] of current.entries()) {
      if (this.initialPreferences.get(key) !== value) return true;
    }
    return false;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.notificationService.getCatalog().subscribe({
      next: (catalog) => {
        this.catalog.set(catalog);
        this.notificationService.getPreferences().subscribe({
          next: (userPrefs) => {
            const map = new Map<string, boolean>();

            // Aplicar defaults desde catálogo
            for (const item of catalog) {
              map.set(`${item.id}:IN_APP`, item.defaultChannels.includes('IN_APP'));
              map.set(`${item.id}:EMAIL`, item.defaultChannels.includes('EMAIL'));
              map.set(`${item.id}:PUSH`, item.defaultChannels.includes('PUSH'));
            }

            // Sobrescribir con las preferencias guardadas en DB
            for (const p of userPrefs) {
              if (p.tipo !== 'ALL') {
                map.set(`${p.tipo}:${p.canal}`, p.habilitado);
              }
            }

            this.preferences.set(new Map(map));
            this.initialPreferences = new Map(map);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  getItemName(item: NotificationCatalogItem): string {
    const key = `notificationSettings.items.${item.id}_name`;
    const translated = this.transloco.translate(key);
    return translated !== key ? translated : item.name;
  }

  getItemDescription(item: NotificationCatalogItem): string {
    const key = `notificationSettings.items.${item.id}_desc`;
    const translated = this.transloco.translate(key);
    return translated !== key ? translated : item.description;
  }

  isChannelEnabled(tipo: string, canal: string): boolean {
    return this.preferences().get(`${tipo}:${canal}`) ?? false;
  }

  onToggle(tipo: string, canal: string, enabled: boolean): void {
    const map = new Map(this.preferences());
    map.set(`${tipo}:${canal}`, enabled);
    this.preferences.set(map);
  }

  resetToDefaults(): void {
    this.saving.set(true);
    this.notificationService.resetPreferences().subscribe({
      next: () => {
        this.snackBar.open(
          this.transloco.translate('notificationSettings.resetSuccess'),
          this.transloco.translate('common.close'),
          {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          },
        );
        this.loadData();
        this.saving.set(false);
      },
      error: () => {
        this.snackBar.open(
          this.transloco.translate('notificationSettings.resetError'),
          this.transloco.translate('common.close'),
          {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          },
        );
        this.saving.set(false);
      },
    });
  }

  async requestPushPermission(): Promise<void> {
    if (!('Notification' in window)) {
      this.snackBar.open(
        this.transloco.translate('notificationSettings.pushNotSupported'),
        this.transloco.translate('common.close'),
        {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        },
      );
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.snackBar.open(
        this.transloco.translate('notificationSettings.pushSuccess'),
        this.transloco.translate('common.close'),
        {
          duration: 3500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        },
      );
      new Notification('Dolphin ERP', {
        body: this.transloco.translate('notificationSettings.pushTestBody'),
        icon: 'favicon.ico',
      });
    } else {
      this.snackBar.open(
        this.transloco.translate('notificationSettings.pushDenied'),
        this.transloco.translate('common.close'),
        {
          duration: 4000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        },
      );
    }
  }

  saveChanges(): void {
    this.saving.set(true);
    const list: UserNotificationPreference[] = [];

    for (const [key, habilitado] of this.preferences().entries()) {
      const [tipo, canal] = key.split(':');
      if (tipo && canal) {
        list.push({ tipo, canal, habilitado });
      }
    }

    this.notificationService.savePreferencesBatch(list).subscribe({
      next: () => {
        this.initialPreferences = new Map(this.preferences());
        this.saving.set(false);
        this.snackBar.open(
          this.transloco.translate('notificationSettings.saveSuccess'),
          this.transloco.translate('common.close'),
          {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          },
        );
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open(
          this.transloco.translate('notificationSettings.saveError'),
          this.transloco.translate('common.close'),
          {
            duration: 3500,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          },
        );
      },
    });
  }
}


