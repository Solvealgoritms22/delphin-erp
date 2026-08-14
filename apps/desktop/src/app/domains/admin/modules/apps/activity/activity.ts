import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { environment } from '@/environments/environment';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

interface ActivityItem {
  id: string;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  modulo: string;
  accion: string;
  resourceId: string | null;
  resourceName: string | null;
  resourceType: string | null;
  metadata: Record<string, any> | null;
  creadoEn: string;
}

const MODULE_CONFIG: Record<string, { icon: string; color: string; label: string; bgColor: string }> = {
  products:   { icon: 'package',       color: 'text-blue-500',   bgColor: 'bg-blue-50 dark:bg-blue-500/10',    label: 'activity.modules.products'   },
  clients:    { icon: 'users',         color: 'text-green-500',  bgColor: 'bg-green-50 dark:bg-green-500/10',  label: 'activity.modules.clients'    },
  suppliers:  { icon: 'truck',         color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10',label: 'activity.modules.suppliers' },
  users:      { icon: 'user-cog',      color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-500/10',label: 'activity.modules.users'    },
  billing:    { icon: 'credit-card',   color: 'text-pink-500',   bgColor: 'bg-pink-50 dark:bg-pink-500/10',    label: 'activity.modules.billing' },
  auth:       { icon: 'log-in',        color: 'text-teal-500',   bgColor: 'bg-teal-50 dark:bg-teal-500/10',    label: 'activity.modules.auth'      },
  roles:      { icon: 'shield-check',  color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-500/10',label: 'activity.modules.roles'       },
  sucursales: { icon: 'store',         color: 'text-amber-500',  bgColor: 'bg-amber-50 dark:bg-amber-500/10',  label: 'activity.modules.branches'  },
};

const ACTION_CONFIG: Record<string, { label: string; verb: string; bg: string; text: string }> = {
  CREATE: { label: 'Creó',         verb: 'creó',          bg: 'bg-green-100 dark:bg-green-500/20',   text: 'text-green-700 dark:text-green-400'   },
  UPDATE: { label: 'Actualizó',    verb: 'actualizó',     bg: 'bg-blue-100 dark:bg-blue-500/20',    text: 'text-blue-700 dark:text-blue-400'     },
  DELETE: { label: 'Eliminó',      verb: 'eliminó',       bg: 'bg-red-100 dark:bg-red-500/20',      text: 'text-red-700 dark:text-red-400'       },
  LOGIN:  { label: 'Inició sesión',verb: 'inició sesión', bg: 'bg-teal-100 dark:bg-teal-500/20',   text: 'text-teal-700 dark:text-teal-400'     },
  LOGOUT: { label: 'Cerró sesión', verb: 'cerró sesión',  bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300'},
  EXPORT: { label: 'Exportó',      verb: 'exportó',       bg: 'bg-yellow-100 dark:bg-yellow-500/20',text: 'text-yellow-700 dark:text-yellow-400'  },
};

@Component({
  selector: 'app-activity',
  standalone: true,
  imports: [CommonModule, DatePipe, MatIconModule, MatButtonModule, MatSlideToggleModule, FormsModule, TranslocoPipe],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <!-- Page header (Pinned) -->
      <div class="shrink-0 flex items-center justify-between px-6 sm:px-10 py-6 border-b border-neutral-100 dark:border-neutral-800">
         <div>
           <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">{{ 'activity.title' | transloco }}</h1>
           <p class="text-sm text-neutral-500 mt-0.5">{{ 'activity.description' | transloco }}</p>
         </div>
         <button mat-stroked-button type="button" (click)="clearActivity()" [disabled]="isLoading() || items().length === 0"
           class="!rounded-xl !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400">
           <mat-icon svgIcon="trash" class="icon-size-4 mr-2"></mat-icon>
           {{ 'activity.clear' | transloco }}
         </button>
      </div>

      <div class="flex flex-auto min-h-0 overflow-hidden">

        <!-- Main content (central scroll) -->
        <div class="flex flex-col flex-1 min-h-0 overflow-y-auto px-6 sm:px-10 py-6 pb-16">

          <!-- Toolbar -->
          <div class="flex items-center justify-between mb-8 gap-4 flex-wrap">
            <div class="flex items-center gap-3 flex-wrap">
              <!-- Module filter -->
              <select
                [(ngModel)]="selectedModule"
                (ngModelChange)="onFilterChange()"
                class="text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                 <option value="">{{ 'activity.allModules' | transloco }}</option>
                @for (entry of moduleEntries; track entry[0]) {
                  <option [value]="entry[0]">{{ entry[1].label }}</option>
                }
              </select>

              <!-- Action filter -->
              <select
                [(ngModel)]="selectedAction"
                (ngModelChange)="onFilterChange()"
                class="text-sm rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                 <option value="">{{ 'activity.allActions' | transloco }}</option>
                @for (entry of actionEntries; track entry[0]) {
                  <option [value]="entry[0]">{{ entry[1].label }}</option>
                }
              </select>

              @if (selectedModule || selectedAction || selectedYear) {
                <button
                  (click)="clearFilters()"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                 >{{ 'common.clearFilters' | transloco }}</button>
              }
            </div>

            <!-- Auto refresh -->
            <div class="flex items-center gap-2 text-sm text-neutral-500">
               <span class="select-none">{{ 'activity.autoRefresh' | transloco }}</span>
              <mat-slide-toggle [(ngModel)]="autoRefresh" (change)="onAutoRefreshChange()" color="primary" />
              @if (autoRefresh) {
                 <span class="text-xs text-blue-500 animate-pulse">● {{ 'activity.live' | transloco }}</span>
              }
            </div>
          </div>

          <!-- Skeleton loading -->
          @if (isLoading() && items().length === 0) {
            <div class="flex flex-col gap-0">
              @for (i of [1,2,3,4,5,6]; track i) {
                <div class="flex gap-4 py-4 animate-pulse">
                  <div class="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0"></div>
                  <div class="flex flex-col gap-2 flex-1 pt-1">
                    <div class="h-4 rounded-lg bg-neutral-200 dark:bg-neutral-700" [style.width]="(60 + i * 5) + '%'"></div>
                    <div class="flex gap-2">
                      <div class="h-3 w-28 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                      <div class="h-3 w-16 rounded-full bg-neutral-100 dark:bg-neutral-800"></div>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- Empty state -->
          @if (!isLoading() && items().length === 0) {
            <div class="flex flex-col items-center justify-center py-24 text-center">
              <div class="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
                <mat-icon svgIcon="activity" class="!w-8 !h-8 !text-[32px] text-neutral-400"></mat-icon>
              </div>
              <p class="text-lg font-semibold text-neutral-700 dark:text-neutral-300">Sin actividad registrada</p>
              <p class="text-sm text-neutral-400 mt-1 max-w-xs">
                Las acciones realizadas en productos, clientes y demás módulos aparecerán aquí automáticamente.
              </p>
            </div>
          }

          <!-- Activity timeline -->
          @if (items().length > 0) {
            <div class="relative">
              <!-- Vertical line -->
              <div class="absolute left-[17px] top-5 bottom-5 w-px bg-neutral-200 dark:bg-neutral-700 z-0"></div>

              <div class="flex flex-col">
                @for (item of items(); track item.id; let isLast = $last) {
                  <div class="flex gap-4 group py-3.5">
                    <!-- Module icon bubble -->
                    <div
                      class="relative z-10 flex items-center justify-center w-9 h-9 rounded-full border-2 border-white dark:border-neutral-900 shadow-sm shrink-0"
                      [ngClass]="getModule(item.modulo).bgColor"
                    >
                      <mat-icon
                        [svgIcon]="getModule(item.modulo).icon"
                        class="!w-4 !h-4 !text-[16px] shrink-0"
                        [class]="getModule(item.modulo).color"
                      ></mat-icon>
                    </div>

                    <!-- Content -->
                    <div class="flex flex-col flex-1 min-w-0 pt-1">
                      <!-- Description line -->
                      <p class="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                        <span class="font-semibold">{{ item.usuarioNombre || item.usuarioEmail || 'Sistema' }}</span>
                        <span class="text-neutral-400 mx-1.5">·</span>
                        <span class="text-neutral-500">{{ getAction(item.accion).verb }}</span>
                        @if (item.resourceType) {
                          <span class="text-neutral-500 ml-1 lowercase">{{ item.resourceType }}</span>
                        }
                        @if (item.resourceName) {
                          <span class="font-semibold text-blue-600 dark:text-blue-400 ml-1">{{ item.resourceName }}</span>
                        }
                      </p>

                      <!-- Timestamp & badges -->
                      <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span class="text-xs text-neutral-400">
                          {{ item.creadoEn | date:'d MMM y' }}, {{ item.creadoEn | date:'shortTime' }}
                        </span>
                        <span
                          class="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full font-semibold tracking-wide"
                          [ngClass]="[getAction(item.accion).bg, getAction(item.accion).text]"
                        >
                          {{ getAction(item.accion).label }}
                        </span>
                        <span class="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium">
                          {{ getModule(item.modulo).label }}
                        </span>
                      </div>

                      <!-- Metadata card -->
                      @if (item.metadata && hasMetadata(item.metadata)) {
                        <div class="mt-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 divide-y divide-neutral-100 dark:divide-neutral-700 max-w-sm overflow-hidden">
                          @for (entry of metadataEntries(item.metadata); track entry[0]) {
                            <div class="flex items-center gap-3 px-3 py-2 text-xs">
                              <span class="text-neutral-400 shrink-0 capitalize w-24 truncate">{{ entry[0] }}</span>
                              <span class="font-medium text-neutral-700 dark:text-neutral-300 break-all">{{ entry[1] }}</span>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Load more -->
              @if (hasMore()) {
                <div class="flex justify-center mt-6 pb-4">
                  <button
                    (click)="loadMore()"
                    [disabled]="isLoading()"
                    class="px-6 py-2.5 text-sm font-medium rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    @if (isLoading()) {
                      <span class="inline-block w-4 h-4 border-2 border-neutral-300 border-t-blue-500 rounded-full animate-spin"></span>
                    }
                    {{ isLoading() ? 'Cargando...' : 'Cargar más' }}
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <!-- Right sidebar — year navigation -->
        <div class="hidden lg:flex flex-col shrink-0 w-20 border-l border-neutral-100 dark:border-neutral-800 py-8 px-3 gap-1.5 overflow-y-auto">
          <p class="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2 px-1">Año</p>
          <button
            (click)="selectedYear = null; onFilterChange()"
            class="text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors text-left"
            [class.bg-blue-100]="selectedYear === null"
            [class.text-blue-700]="selectedYear === null"
            [class.dark:bg-blue-500/20]="selectedYear === null"
            [class.dark:text-blue-400]="selectedYear === null"
            [class.text-neutral-500]="selectedYear !== null"
            [class.hover:bg-neutral-100]="selectedYear !== null"
            [class.dark:hover:bg-neutral-800]="selectedYear !== null"
          >
            Todo
          </button>
          @for (year of years(); track year) {
            <button
              (click)="selectedYear = year; onFilterChange()"
              class="text-xs font-semibold py-1.5 px-2 rounded-lg transition-colors text-left"
              [class.bg-blue-100]="selectedYear === year"
              [class.text-blue-700]="selectedYear === year"
              [class.dark:bg-blue-500/20]="selectedYear === year"
              [class.dark:text-blue-400]="selectedYear === year"
              [class.text-neutral-500]="selectedYear !== year"
              [class.hover:bg-neutral-100]="selectedYear !== year"
              [class.dark:hover:bg-neutral-800]="selectedYear !== year"
            >
              {{ year }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
})
export default class ActivityComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private transloco = inject(TranslocoService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  items = signal<ActivityItem[]>([]);
  years = signal<number[]>([]);
  isLoading = signal(true);
  currentPage = signal(1);
  totalItems = signal(0);
  hasMore = computed(() => this.items().length < this.totalItems());

  selectedModule = '';
  selectedAction = '';
  selectedYear: number | null = null;
  autoRefresh = false;
  private refreshInterval: any;

  readonly moduleEntries = Object.entries(MODULE_CONFIG);
  readonly actionEntries = Object.entries(ACTION_CONFIG);

  getModule(modulo: string) {
    const module = MODULE_CONFIG[modulo] ?? { icon: 'activity', color: 'text-neutral-500', bgColor: 'bg-neutral-100 dark:bg-neutral-800', label: modulo };
    return { ...module, label: this.transloco.translate(module.label) };
  }

  getAction(accion: string) {
    return ACTION_CONFIG[accion] ?? { label: accion, verb: accion.toLowerCase(), bg: 'bg-neutral-100 dark:bg-neutral-700', text: 'text-neutral-600 dark:text-neutral-300' };
  }

  hasMetadata(meta: Record<string, any> | null): boolean {
    return !!meta && Object.keys(meta).length > 0;
  }

  metadataEntries(meta: Record<string, any>): [string, any][] {
    return Object.entries(meta).slice(0, 5);
  }

  ngOnInit() {
    this.load(true);
    this.loadYears();
  }

  ngOnDestroy() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  onFilterChange() {
    this.load(true);
  }

  clearFilters() {
    this.selectedModule = '';
    this.selectedAction = '';
    this.selectedYear = null;
    this.load(true);
  }

  clearActivity() {
    this.dialog.open(ConfirmDialogComponent, {
      width: 'min(460px, calc(100vw - 32px))',
      data: {
        title: 'Limpiar actividad',
        message: 'Se eliminarán permanentemente todos los registros de actividad de la empresa activa. Esta acción no se puede deshacer.',
        confirmLabel: 'Limpiar actividad',
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.isLoading.set(true);
      this.http.delete<{ count: number }>(`${environment.apiUrl}/activity`).subscribe({
        next: (result) => {
          this.items.set([]);
          this.totalItems.set(0);
          this.isLoading.set(false);
          this.loadYears();
          this.snackBar.open(`${result.count} registros eliminados`, 'Cerrar', { duration: 3000 });
        },
        error: () => {
          this.isLoading.set(false);
          this.snackBar.open('No se pudo limpiar la actividad', 'Cerrar', { duration: 4000 });
        },
      });
    });
  }

  onAutoRefreshChange() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    if (this.autoRefresh) {
      this.refreshInterval = setInterval(() => this.load(false), 15000);
    }
  }

  loadMore() {
    this.currentPage.update(p => p + 1);
    this.load(false, true);
  }

  private load(reset = false, append = false) {
    if (reset) {
      this.currentPage.set(1);
      this.items.set([]);
    }
    this.isLoading.set(true);

    const params: Record<string, string> = {
      page: String(this.currentPage()),
      limit: '25',
    };
    if (this.selectedModule) params['modulo'] = this.selectedModule;
    if (this.selectedAction) params['accion'] = this.selectedAction;
    if (this.selectedYear) params['year'] = String(this.selectedYear);

    const query = new URLSearchParams(params).toString();
    this.http.get<any>(`${environment.apiUrl}/activity?${query}`).subscribe({
      next: (res) => {
        this.totalItems.set(res.total);
        if (append) {
          this.items.update(prev => [...prev, ...res.items]);
        } else {
          this.items.set(res.items);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadYears() {
    this.http.get<number[]>(`${environment.apiUrl}/activity/years`).subscribe({
      next: (years) => this.years.set(years),
      error: () => {},
    });
  }
}
