import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SecurityLog, SecurityLogsService } from '../../data/security-logs.service';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchIcon, TrashIcon, SlidersHorizontalIcon, ArrowDownIcon, RefreshCwIcon, ClipboardListIcon, ChevronDownIcon } from 'ng-animated-icons';

@Component({
  selector: 'app-security-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslocoPipe,
    SearchIcon,
    TrashIcon,
    SlidersHorizontalIcon,
    ArrowDownIcon,
    RefreshCwIcon,
    ClipboardListIcon,
    ChevronDownIcon,
  ],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <div class="shrink-0 flex w-full flex-col px-6 pt-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-6 gap-4">
          <div>
             <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ 'securityLogs.title' | transloco }}</h1>
             <p class="mt-1 text-sm text-neutral-500">{{ 'securityLogs.description' | transloco }}</p>
          </div>
        </div>
      </div>

      <div class="flex-auto min-h-0 overflow-y-auto p-6 sm:p-10 pb-12">

        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">

          <div class="flex flex-wrap items-center justify-between p-4 gap-4 border-b border-neutral-200 dark:border-neutral-800">
            <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">

              <div class="relative flex items-center w-full sm:w-64 flex-auto sm:flex-initial">
                <i-search [size]="18" class="absolute left-3 text-neutral-400" />
                <input type="text" [placeholder]="'securityLogs.search' | transloco" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)"
                  class="w-full h-10 pl-10 pr-4 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              </div>

              <button [matMenuTriggerFor]="severityMenu" type="button"
                class="flex items-center justify-between gap-2.5 h-10 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-200 transition-colors shrink-0 cursor-pointer min-w-36">
                <span class="inline-flex items-center gap-2">
                  @if (severity() === 'Critical') { <span class="size-2 rounded-full bg-red-500"></span> }
                  @else if (severity() === 'High') { <span class="size-2 rounded-full bg-orange-500"></span> }
                  @else if (severity() === 'Medium') { <span class="size-2 rounded-full bg-amber-500"></span> }
                  @else if (severity() === 'Low') { <span class="size-2 rounded-full bg-blue-500"></span> }
                  {{ severity() ? severity() : ('securityLogs.allSeverities' | transloco) }}
                </span>
                <i-chevron-down [size]="15" class="text-neutral-400" />
              </button>

              <mat-menu #severityMenu="matMenu" class="!rounded-xl !p-1">
                <button mat-menu-item (click)="setSeverity('')">
                  <span>{{ 'securityLogs.allSeverities' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="setSeverity('Critical')">
                  <span class="inline-flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                    <span class="size-2 rounded-full bg-red-500"></span>
                    Critical
                  </span>
                </button>
                <button mat-menu-item (click)="setSeverity('High')">
                  <span class="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium">
                    <span class="size-2 rounded-full bg-orange-500"></span>
                    High
                  </span>
                </button>
                <button mat-menu-item (click)="setSeverity('Medium')">
                  <span class="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                    <span class="size-2 rounded-full bg-amber-500"></span>
                    Medium
                  </span>
                </button>
                <button mat-menu-item (click)="setSeverity('Low')">
                  <span class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                    <span class="size-2 rounded-full bg-blue-500"></span>
                    Low
                  </span>
                </button>
              </mat-menu>
            </div>

              <div class="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto justify-start lg:justify-end">
                <button mat-stroked-button type="button" (click)="clearLogs()" [disabled]="loading() || logs().length === 0"
                  class="!rounded-xl !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400 !whitespace-nowrap shrink-0 !h-10">
                  <i-trash [size]="16" class="mr-1.5 text-red-500" />
                  <span class="whitespace-nowrap">{{ 'securityLogs.clear' | transloco }}</span>
                </button>

                <div class="flex items-center gap-2 whitespace-nowrap shrink-0">
                  <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Push Alerts</span>
                  <mat-slide-toggle [checked]="pushAlerts()" (change)="togglePushAlerts($event.checked)"></mat-slide-toggle>
                </div>

                <button [matMenuTriggerFor]="columnsMenu" type="button"
                  class="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-300 whitespace-nowrap shrink-0 cursor-pointer">
                  <i-sliders-horizontal [size]="16" />
                  Columns
                </button>

                <mat-menu #columnsMenu="matMenu" class="!rounded-xl !p-1">
                  <button mat-menu-item (click)="toggleColumn('timestamp')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().timestamp" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Timestamp
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('eventType')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().eventType" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Event Type
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('actionTaken')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().actionTaken" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Action Taken
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('sourceIp')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().sourceIp" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Source IP
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('destinationIp')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().destinationIp" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Destination IP
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('severity')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().severity" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Severity
                    </span>
                  </button>
                </mat-menu>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left min-w-[900px] border-collapse">
                <thead>
                  <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">
                    <th class="py-4 px-4 w-12 text-center">
                      <input type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer">
                    </th>
                    @if (columns().timestamp) {
                      <th class="py-4 px-4">
                        <div class="flex items-center gap-1 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200">
                          Timestamp
                          <i-arrow-down [size]="12" />
                        </div>
                      </th>
                    }
                    @if (columns().eventType) {
                      <th class="py-4 px-4">Event Type</th>
                    }
                    @if (columns().actionTaken) {
                      <th class="py-4 px-4">Action Taken</th>
                    }
                    @if (columns().sourceIp) {
                      <th class="py-4 px-4">Source IP</th>
                    }
                    @if (columns().destinationIp) {
                      <th class="py-4 px-4">Destination IP</th>
                    }
                    @if (columns().severity) {
                      <th class="py-4 px-4">Severity</th>
                    }
                    <th class="py-4 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
                  @if (loading()) {
                    <tr>
                      <td colspan="8" class="py-12 text-center text-neutral-400">
                        <div class="flex flex-col items-center justify-center gap-2">
                          <div class="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                          <p class="text-sm">Loading...</p>
                        </div>
                      </td>
                    </tr>
                  } @else if (filteredLogs().length === 0) {
                    <tr>
                      <td colspan="8" class="py-16 text-center">
                        <div class="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div class="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-4">
                            <i-search [size]="24" />
                          </div>
                          <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-1">No logs found</h3>
                          <p class="text-xs text-neutral-500 text-center">
                            {{ (searchQuery() || severity() ? 'Try another search or clear filters' : 'No security events recorded yet') }}
                          </p>
                          @if (searchQuery() || severity()) {
                            <button type="button" mat-stroked-button class="mt-6 !rounded-xl" (click)="clearFilters()">
                              <i-refresh-cw [size]="16" class="mr-2" />
                              Clear filters
                            </button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @else {
                   @for (log of paginatedLogs(); track log.id) {
                    <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors text-[13px] text-neutral-700 dark:text-neutral-300">
                      <td class="py-4 px-4 text-center">
                        <input type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer">
                      </td>
                      @if (columns().timestamp) {
                        <td class="py-4 px-4 font-medium">{{ log.timestamp }}</td>
                      }
                      @if (columns().eventType) {
                        <td class="py-4 px-4">
                          <div class="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                            <mat-icon [svgIcon]="log.eventIcon" [class]="log.eventColor + ' !w-4 !h-4'"></mat-icon>
                            {{ log.eventType }}
                          </div>
                        </td>
                      }
                      @if (columns().actionTaken) {
                        <td class="py-4 px-4">{{ log.actionTaken }}</td>
                      }
                      @if (columns().sourceIp) {
                        <td class="py-4 px-4">{{ log.sourceIp }}</td>
                      }
                      @if (columns().destinationIp) {
                        <td class="py-4 px-4">{{ log.destinationIp }}</td>
                      }
                      @if (columns().severity) {
                        <td class="py-4 px-4">
                          <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold"
                            [ngClass]="{
                              'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400': log.severity === 'High',
                              'bg-blue-100 text-blue-800 dark:bg-blue-500/10 dark:text-blue-400': log.severity === 'Medium',
                              'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400': log.severity === 'Low',
                              'bg-red-100 text-red-800 dark:bg-red-500/10 dark:text-red-400': log.severity === 'Critical'
                            }">
                            {{ log.severity }}
                          </span>
                        </td>
                      }
                      <td class="py-4 px-4 text-right">
                         <button type="button" [matTooltip]="'Copy event details'" (click)="copyLog(log)" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer">
                          <i-clipboard-list [size]="16" />
                        </button>
                      </td>
                     </tr>
                   }
                  }
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 text-[13px] text-neutral-500">
              <div class="flex items-center gap-2">
                <span>Rows per page</span>
                <select [ngModel]="pageSize()" (ngModelChange)="pageSize.set($any($event))" class="border border-neutral-300 dark:border-neutral-700 rounded-lg px-2 py-1 bg-transparent font-medium text-neutral-700 dark:text-neutral-300 focus:ring-0 cursor-pointer">
                  <option [value]="10">10</option>
                  <option [value]="25">25</option>
                  <option [value]="50">50</option>
                </select>
              </div>
              <div>
                 {{ filteredLogs().length }} visible events of {{ logs().length }}
              </div>
            </div>

          </div>

        </div>

      </div>
  `
})
export default class SecurityLogsComponent implements OnInit {
  private securityLogsService = inject(SecurityLogsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  logs = this.securityLogsService.logs;
  searchQuery = signal('');
  severity = signal('');
  loading = signal(false);
  error = signal(false);
  pushAlerts = signal(true);
  pageSize = signal(10);

  columns = signal({
    timestamp: true,
    eventType: true,
    actionTaken: true,
    sourceIp: true,
    destinationIp: true,
    severity: true
  });

  toggleColumn(col: 'timestamp' | 'eventType' | 'actionTaken' | 'sourceIp' | 'destinationIp' | 'severity') {
    this.columns.update(curr => ({
      ...curr,
      [col]: !curr[col]
    }));
  }

  togglePushAlerts(enabled: boolean) {
    this.pushAlerts.set(enabled);
    this.snackBar.open(
      enabled ? 'Push alerts enabled for critical security events' : 'Push alerts disabled',
      'Close',
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
    this.snackBar.open('Log event copied to clipboard', 'Close', { duration: 2000 });
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
        title: 'Clear security logs',
        message: 'This permanently deletes all security logs for the active company. This action cannot be undone.',
        confirmLabel: 'Clear security logs',
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.loading.set(true);
      this.securityLogsService.clear().subscribe({
        next: (result) => {
          this.loading.set(false);
          this.snackBar.open(`${result.count} security logs cleared`, 'Close', { duration: 3000 });
          this.loadLogs();
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open('Unable to clear security logs', 'Close', { duration: 4000 });
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
