import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SecurityLog, SecurityLogsService } from '../../data/security-logs.service';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-security-logs',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslocoPipe,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">

      <!-- Standard Clean Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
            {{ 'securityLogs.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'securityLogs.description' | transloco }}
          </p>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">

        <!-- Filter Bar -->
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <!-- Left: Search Box + Severity Filters -->
          <div class="flex min-w-[260px] flex-1 items-center gap-3">
            <div class="relative w-full max-w-md">
              <mat-icon
                svgIcon="search"
                class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
              ></mat-icon>
              <input
                type="text"
                [placeholder]="'securityLogs.search' | transloco"
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
                class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
              />
              @if (searchQuery()) {
                <button
                  type="button"
                  (click)="searchQuery.set('')"
                  class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <mat-icon svgIcon="x" class="icon-size-3.5"></mat-icon>
                </button>
              }
            </div>

            <!-- Severity Filter Menu -->
            <button
              [matMenuTriggerFor]="severityMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
              [class.border-blue-500]="severity() !== ''"
              [class.text-blue-600]="severity() !== ''"
              [class.dark:text-blue-400]="severity() !== ''"
            >
              <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
              <span>{{ severity() ? getSeverityLabel(severity()) : ('securityLogs.allSeverities' | transloco) }}</span>
              @if (severity() !== '') {
                <span class="size-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  1
                </span>
              }
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
            </button>
            <mat-menu #severityMenu="matMenu">
              <button mat-menu-item (click)="setSeverity('')">{{ 'securityLogs.allSeverities' | transloco }}</button>
              <button mat-menu-item (click)="setSeverity('Critical')">
                <span class="inline-flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
                  <span class="size-2 rounded-full bg-rose-500"></span>
                  {{ 'securityLogs.critical' | transloco }}
                </span>
              </button>
              <button mat-menu-item (click)="setSeverity('High')">
                <span class="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium">
                  <span class="size-2 rounded-full bg-orange-500"></span>
                  {{ 'securityLogs.high' | transloco }}
                </span>
              </button>
              <button mat-menu-item (click)="setSeverity('Medium')">
                <span class="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                  <span class="size-2 rounded-full bg-amber-500"></span>
                  {{ 'securityLogs.medium' | transloco }}
                </span>
              </button>
              <button mat-menu-item (click)="setSeverity('Low')">
                <span class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                  <span class="size-2 rounded-full bg-blue-500"></span>
                  {{ 'securityLogs.low' | transloco }}
                </span>
              </button>
            </mat-menu>
          </div>

          <!-- Right: Push Alerts Toggle + Actions Menu -->
          <div class="flex items-center gap-3 sm:gap-4 shrink-0">
            <div class="flex items-center gap-2 whitespace-nowrap shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span>{{ 'securityLogs.pushAlerts' | transloco }}</span>
              <mat-slide-toggle [checked]="pushAlerts()" (change)="togglePushAlerts($event.checked)"></mat-slide-toggle>
            </div>

            <button
              [matMenuTriggerFor]="actionsMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <span>{{ 'securityLogs.actions' | transloco }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
            </button>

            <mat-menu #actionsMenu="matMenu" class="!rounded-2xl !p-1.5 min-w-56">
              <button mat-menu-item (click)="loadLogs()" [disabled]="loading()">
                <mat-icon svgIcon="refresh-cw" class="icon-size-4 mr-2 text-neutral-500"></mat-icon>
                <span class="text-sm">{{ 'securityLogs.refresh' | transloco }}</span>
              </button>
              <button mat-menu-item (click)="clearLogs()" [disabled]="loading() || logs().length === 0" class="!text-red-600 dark:!text-red-400">
                <mat-icon svgIcon="trash" class="icon-size-4 mr-2 text-red-500"></mat-icon>
                <span class="text-sm font-medium">{{ 'securityLogs.clear' | transloco }}</span>
              </button>
            </mat-menu>
          </div>
        </div>

        <!-- Dismissible Active Filter Chips -->
        @if (severity()) {
          <div class="flex flex-wrap items-center gap-2 px-6 md:px-8 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 text-xs animate-fadeIn">
            <span class="text-neutral-400 font-medium mr-1">{{ 'securityLogs.activeFilters' | transloco }}:</span>

            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50 font-medium shadow-2xs">
              <span>{{ 'securityLogs.severity' | transloco }}: {{ getSeverityLabel(severity()) }}</span>
              <button type="button" (click)="setSeverity('')" class="hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                <mat-icon svgIcon="x" class="icon-size-3"></mat-icon>
              </button>
            </span>

            <button
              type="button"
              (click)="setSeverity('')"
              class="text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1 cursor-pointer"
            >
              {{ 'securityLogs.clearAll' | transloco }}
            </button>
          </div>
        }

        <!-- Security Logs Table Grid -->
        <div class="grid">
          <div
            class="security-logs-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div>{{ 'securityLogs.user' | transloco }}</div>
            <div class="hidden sm:block">{{ 'securityLogs.timestamp' | transloco }}</div>
            <div>{{ 'securityLogs.eventType' | transloco }}</div>
            <div class="hidden lg:block">{{ 'securityLogs.actionTaken' | transloco }}</div>
            <div class="hidden md:block">{{ 'securityLogs.sourceIp' | transloco }}</div>
            <div class="hidden xl:block">{{ 'securityLogs.destinationIp' | transloco }}</div>
            <div>{{ 'securityLogs.severity' | transloco }}</div>
            <div class="text-right">{{ 'securityLogs.actions' | transloco }}</div>
          </div>

          @if (loading()) {
            <app-table-skeleton [gridClass]="'security-logs-grid'" [rows]="6" />
          } @else if (filteredLogs().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'securityLogs.noMatches' | transloco"
                [description]="searchQuery() || severity() ? ('securityLogs.noMatchesDescription' | transloco) : ('securityLogs.emptyDescription' | transloco)"
                [actionLabel]="searchQuery() || severity() ? ('securityLogs.clearFilters' | transloco) : undefined"
                actionIcon="refresh-cw"
                (action)="clearFilters()"
              />
            </div>
          } @else {
            @for (log of paginatedLogs(); track log.id) {
              <div
                class="security-logs-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
              >
                <!-- Usuario -->
                <div class="flex items-center gap-2.5 min-w-0 pr-2">
                  @if (log.usuarioAvatar && !failedAvatars().has(log.id)) {
                    <img [src]="log.usuarioAvatar" referrerpolicy="no-referrer" (error)="markAvatarFailed(log.id)" [alt]="log.usuarioNombre || 'Usuario'" class="size-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 select-none" />
                  } @else {
                    <div class="size-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-neutral-200/60 dark:border-neutral-700/60 select-none" [ngClass]="getAvatarColor(log.usuarioNombre || log.usuarioEmail)">
                      {{ getInitials(log.usuarioNombre || log.usuarioEmail) }}
                    </div>
                  }
                  <div class="flex flex-col min-w-0">
                    <span class="font-bold text-neutral-900 dark:text-white truncate">{{ log.usuarioNombre || log.usuarioEmail || ('securityLogs.system' | transloco) }}</span>
                    @if (log.usuarioNombre && log.usuarioEmail) {
                      <span class="text-xs text-neutral-400 truncate">{{ log.usuarioEmail }}</span>
                    }
                  </div>
                </div>

                <!-- Timestamp -->
                <div class="hidden sm:block font-medium text-xs whitespace-nowrap text-neutral-600 dark:text-neutral-400 font-mono">
                  {{ log.timestamp | date:'d MMM y, HH:mm:ss' }}
                </div>

                <!-- Event Type -->
                <div class="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs truncate">
                  <mat-icon [svgIcon]="log.eventIcon" [class]="log.eventColor + ' !w-4 !h-4 shrink-0'"></mat-icon>
                  <span class="truncate">{{ log.eventType }}</span>
                </div>

                <!-- Action Taken -->
                <div class="hidden lg:block text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  {{ log.actionTaken }}
                </div>

                <!-- Source IP -->
                <div class="hidden md:block font-mono text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  {{ log.sourceIp }}
                </div>

                <!-- Destination IP -->
                <div class="hidden xl:block font-mono text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  {{ log.destinationIp }}
                </div>

                <!-- Severity Badge -->
                <div>
                  <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold border"
                    [ngClass]="{
                      'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20': log.severity === 'Critical',
                      'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border-orange-200/60 dark:border-orange-500/20': log.severity === 'High',
                      'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-200/60 dark:border-amber-500/20': log.severity === 'Medium',
                      'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border-blue-200/60 dark:border-blue-500/20': log.severity === 'Low'
                    }">
                    {{ getSeverityLabel(log.severity) }}
                  </span>
                </div>

                <!-- Actions -->
                <div class="flex items-center justify-end gap-1">
                  <button
                    mat-icon-button
                    type="button"
                    [matTooltip]="'securityLogs.copy' | transloco"
                    (click)="copyLog(log)"
                    class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
                  >
                    <mat-icon svgIcon="clipboard-list" class="icon-size-4.5"></mat-icon>
                  </button>
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer / Pagination -->
        <div class="flex items-center justify-between px-6 md:px-8 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-500">
          <div class="flex items-center gap-2">
            <span>{{ 'securityLogs.rowsPerPage' | transloco }}:</span>
            <button
              type="button"
              [matMenuTriggerFor]="pageSizeMenu"
              class="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors shadow-2xs cursor-pointer"
            >
              <span>{{ pageSize() }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3 text-neutral-400"></mat-icon>
            </button>
            <mat-menu #pageSizeMenu="matMenu" class="min-w-[80px]">
              @for (size of [10, 25, 50]; track size) {
                <button
                  mat-menu-item
                  (click)="pageSize.set(size)"
                  class="flex items-center justify-between !h-9 text-xs"
                  [class.font-bold]="size === pageSize()"
                >
                  <span>{{ size }}</span>
                  @if (size === pageSize()) {
                    <mat-icon svgIcon="check" class="!h-3.5 !w-3.5 !text-[14px] text-blue-600 dark:text-blue-400 ml-2"></mat-icon>
                  }
                </button>
              }
            </mat-menu>
          </div>
          <div>
             {{ 'securityLogs.visibleOf' | transloco: { visible: paginatedLogs().length, total: filteredLogs().length } }}
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [
    `
      .security-logs-grid {
        grid-template-columns: minmax(180px, 1.8fr) minmax(140px, 1.3fr) minmax(140px, 1.3fr) minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(110px, 1fr) minmax(100px, 0.9fr) minmax(60px, 0.6fr);
      }
      @media (max-width: 1280px) {
        .security-logs-grid {
          grid-template-columns: minmax(170px, 1.8fr) minmax(130px, 1.3fr) minmax(130px, 1.3fr) minmax(120px, 1.2fr) minmax(100px, 1fr) minmax(90px, 0.9fr) minmax(60px, 0.6fr);
        }
      }
      @media (max-width: 1024px) {
        .security-logs-grid {
          grid-template-columns: minmax(160px, 1.8fr) minmax(130px, 1.3fr) minmax(130px, 1.3fr) minmax(100px, 1fr) minmax(90px, 0.9fr) minmax(60px, 0.6fr);
        }
      }
      @media (max-width: 768px) {
        .security-logs-grid {
          grid-template-columns: minmax(150px, 2fr) minmax(120px, 1.3fr) minmax(90px, 0.9fr) minmax(50px, 0.6fr);
        }
      }
      @media (max-width: 640px) {
        .security-logs-grid {
          grid-template-columns: minmax(140px, 2fr) minmax(80px, 0.9fr) minmax(50px, 0.6fr);
        }
      }
    `,
  ],
})
export default class SecurityLogsComponent implements OnInit {
  private securityLogsService = inject(SecurityLogsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  logs = this.securityLogsService.logs;
  searchQuery = signal('');
  severity = signal('');
  loading = signal(false);
  error = signal(false);
  pushAlerts = signal(true);
  pageSize = signal(10);
  failedAvatars = signal<Set<string>>(new Set<string>());

  markAvatarFailed(id: string): void {
    this.failedAvatars.update((prev) => new Set(prev).add(id));
  }

  columns = signal({
    user: true,
    timestamp: true,
    eventType: true,
    actionTaken: true,
    sourceIp: true,
    destinationIp: true,
    severity: true
  });

  toggleColumn(col: 'user' | 'timestamp' | 'eventType' | 'actionTaken' | 'sourceIp' | 'destinationIp' | 'severity') {
    this.columns.update(curr => ({
      ...curr,
      [col]: !curr[col]
    }));
  }

  getSeverityLabel(sev: string): string {
    switch (sev) {
      case 'Critical': return this.transloco.translate('securityLogs.critical');
      case 'High': return this.transloco.translate('securityLogs.high');
      case 'Medium': return this.transloco.translate('securityLogs.medium');
      case 'Low': return this.transloco.translate('securityLogs.low');
      default: return sev;
    }
  }

  getInitials(nameOrEmail: string | null | undefined): string {
    if (!nameOrEmail) return 'SYS';
    const parts = nameOrEmail.trim().split(/[\s@._-]+/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameOrEmail.slice(0, 2).toUpperCase();
  }

  getAvatarColor(nameOrEmail: string | null | undefined): string {
    const colors = [
      'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
      'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
      'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
      'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    ];
    if (!nameOrEmail) return colors[0];
    let hash = 0;
    for (let i = 0; i < nameOrEmail.length; i++) {
      hash = nameOrEmail.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  togglePushAlerts(enabled: boolean) {
    this.pushAlerts.set(enabled);
    this.snackBar.open(
      enabled
        ? this.transloco.translate('securityLogs.pushAlertsEnabled')
        : this.transloco.translate('securityLogs.pushAlertsDisabled'),
      this.transloco.translate('common.close'),
      { duration: 2500 }
    );
  }

  ngOnInit(): void {
    this.loadLogs();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(false);
    this.securityLogsService.getLogs(this.searchQuery(), this.severity()).subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  copyLog(log: SecurityLog): void {
    void navigator.clipboard?.writeText(JSON.stringify(log));
    this.snackBar.open(
      this.transloco.translate('securityLogs.copied'),
      this.transloco.translate('common.close'),
      { duration: 2000 }
    );
  }

  setSeverity(sev: string): void {
    this.severity.set(sev);
    this.loadLogs();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.severity.set('');
    this.loadLogs();
  }

  clearLogs(): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: 'min(460px, calc(100vw - 32px))',
      data: {
        title: this.transloco.translate('securityLogs.clearTitle'),
        message: this.transloco.translate('securityLogs.clearMessage'),
        confirmLabel: this.transloco.translate('securityLogs.clear'),
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.loading.set(true);
      this.securityLogsService.clear().subscribe({
        next: (result) => {
          this.loading.set(false);
          this.snackBar.open(
            this.transloco.translate('securityLogs.cleared', { count: result.count }),
            this.transloco.translate('common.close'),
            { duration: 3000 }
          );
          this.loadLogs();
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(
            this.transloco.translate('securityLogs.clearError'),
            this.transloco.translate('common.close'),
            { duration: 4000 }
          );
        },
      });
    });
  }

  filteredLogs = computed(() => {
    let currentLogs = this.logs();
    const search = this.searchQuery().toLowerCase();
    if (search) {
      currentLogs = currentLogs.filter(log =>
        log.eventType.toLowerCase().includes(search) ||
        log.sourceIp.includes(search) ||
        log.destinationIp.includes(search)
      );
    }
    return currentLogs;
  });

  paginatedLogs = computed(() => {
    return this.filteredLogs().slice(0, this.pageSize());
  });
}
