import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { CurrentSessionsService, SessionLog } from '../../data/current-sessions.service';
import { ConfirmDialogComponent } from '../../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthState } from '../../../../../../core/auth/auth.state';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SearchIcon, SlidersHorizontalIcon, LogOutIcon, ArrowUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, MonitorCheckIcon, TrashIcon } from 'ng-animated-icons';

@Component({
  selector: 'current-sessions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatRippleModule,
    MatTooltipModule,
    TranslocoPipe,
    SearchIcon,
    SlidersHorizontalIcon,
    LogOutIcon,
    ArrowUpIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    MonitorCheckIcon,
    TrashIcon,
  ],
  template: `
    <div class="flex flex-col w-full h-full bg-white dark:bg-neutral-900 overflow-hidden relative border-t sm:border-t-0 sm:border-l border-neutral-200 dark:border-neutral-800">

      <div class="shrink-0 p-6 sm:py-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <h2 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'sessions.title' | transloco }}</h2>
        <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'sessions.description' | transloco }}</p>
      </div>

      <div class="flex-auto min-h-0 overflow-y-auto p-4 sm:p-6 sm:pb-8">
        <div class="flex flex-col flex-auto bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">

            <div class="flex flex-wrap items-center justify-between p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-700 gap-4">

              <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">

                <div class="relative flex items-center h-10 px-4 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent min-w-[200px] sm:min-w-64 max-w-full flex-auto sm:flex-initial">
                  <i-search [size]="18" class="absolute left-3 text-neutral-400" />
                  <input
                    type="text"
                    [ngModel]="searchQuery()"
                    (ngModelChange)="searchQuery.set($event)"
                    class="w-full h-full pl-7 bg-transparent border-none outline-none text-sm placeholder:text-neutral-400 text-neutral-700 dark:text-neutral-200"
                    [placeholder]="'sessions.search' | transloco">
                </div>

                <button [matMenuTriggerFor]="browserMenu" type="button"
                  class="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-300 whitespace-nowrap shrink-0 cursor-pointer">
                  <i-sliders-horizontal [size]="16" />
                  <span>{{ selectedBrowser() ? selectedBrowser() : ('sessions.browser' | transloco) }}</span>
                  <i-chevron-down [size]="14" class="text-neutral-400" />
                </button>
                <mat-menu #browserMenu="matMenu" class="!rounded-xl !p-1">
                  <button mat-menu-item (click)="selectedBrowser.set('')">
                    <span>{{ 'common.all' | transloco }} ({{ 'sessions.browser' | transloco }})</span>
                  </button>
                  @for (b of availableBrowsers(); track b) {
                    <button mat-menu-item (click)="selectedBrowser.set(b)">
                      <span>{{ b }}</span>
                    </button>
                  }
                </mat-menu>

                <button [matMenuTriggerFor]="locationMenu" type="button"
                  class="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-300 whitespace-nowrap shrink-0 cursor-pointer">
                  <i-sliders-horizontal [size]="16" />
                  <span>{{ selectedLocation() ? selectedLocation() : ('sessions.location' | transloco) }}</span>
                  <i-chevron-down [size]="14" class="text-neutral-400" />
                </button>
                <mat-menu #locationMenu="matMenu" class="!rounded-xl !p-1">
                  <button mat-menu-item (click)="selectedLocation.set('')">
                    <span>{{ 'common.all' | transloco }} ({{ 'sessions.location' | transloco }})</span>
                  </button>
                  @for (loc of availableLocations(); track loc) {
                    <button mat-menu-item (click)="selectedLocation.set(loc)">
                      <span>{{ loc }}</span>
                    </button>
                  }
                </mat-menu>
              </div>

              <div class="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto justify-start lg:justify-end">
                @if (selectedIds().size > 0) {
                  <button mat-stroked-button type="button" (click)="revokeSelected()" [disabled]="loading()"
                    class="!rounded-xl !border-red-300 !text-red-600 dark:!border-red-800 dark:!text-red-400 !whitespace-nowrap shrink-0 !h-10">
                    <i-trash [size]="16" class="mr-1.5 text-red-500" />
                    <span class="whitespace-nowrap">Cerrar seleccionadas ({{ selectedIds().size }})</span>
                  </button>
                }

                <button mat-stroked-button type="button" (click)="revokeOthers()" [disabled]="loading()"
                  class="!rounded-xl !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400 !whitespace-nowrap shrink-0 !h-10">
                  <i-log-out [size]="16" class="mr-1.5 text-red-500" />
                  <span class="whitespace-nowrap">{{ 'sessions.closeOthers' | transloco }}</span>
                </button>

                <div class="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 whitespace-nowrap shrink-0">
                  <span>{{ 'sessions.onlyActive' | transloco }}</span>
                  <mat-slide-toggle [checked]="onlyActive()" (change)="onlyActive.set($event.checked)"></mat-slide-toggle>
                </div>

                <button [matMenuTriggerFor]="columnsMenu" type="button"
                  class="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-300 whitespace-nowrap shrink-0 cursor-pointer">
                  <i-sliders-horizontal [size]="16" />
                  <span>{{ 'sessions.columns' | transloco }}</span>
                </button>

                <mat-menu #columnsMenu="matMenu" class="!rounded-xl !p-1">
                  <button mat-menu-item (click)="toggleColumn('person')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().person" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Person
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('browser')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().browser" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Browser
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('ipAddress')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().ipAddress" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      IP Address
                    </span>
                  </button>
                  <button mat-menu-item (click)="toggleColumn('location')">
                    <span class="inline-flex items-center gap-2">
                      <input type="checkbox" [checked]="columns().location" (click)="$event.stopPropagation()" class="rounded text-blue-600">
                      Location
                    </span>
                  </button>
                </mat-menu>
              </div>

            </div>

            <div class="w-full overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    <th class="w-14 px-4 py-3.5 text-center">
                      <mat-checkbox [checked]="allSelected()" (change)="toggleAll()"></mat-checkbox>
                    </th>
                    @if (columns().person) {
                      <th class="px-4 py-3.5">
                        <div class="flex items-center gap-1 cursor-pointer">
                          <span>Person</span>
                          <i-arrow-up [size]="14" class="text-neutral-400" />
                        </div>
                      </th>
                    }
                    @if (columns().browser) {
                      <th class="px-4 py-3.5">
                        <div class="flex items-center gap-1 cursor-pointer">
                          <span>Browser</span>
                          <i-chevron-down [size]="14" class="text-neutral-400" />
                        </div>
                      </th>
                    }
                    @if (columns().ipAddress) {
                      <th class="px-4 py-3.5">
                        <div class="flex items-center gap-1 cursor-pointer">
                          <span>IP Address</span>
                          <i-chevron-down [size]="14" class="text-neutral-400" />
                        </div>
                      </th>
                    }
                    @if (columns().location) {
                      <th class="px-4 py-3.5">
                        <div class="flex items-center gap-1 cursor-pointer">
                          <span>Location</span>
                          <i-chevron-down [size]="14" class="text-neutral-400" />
                        </div>
                      </th>
                    }
                    <th class="w-16 px-4 py-3.5 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
                  @for (session of filteredSessions(); track session.id) {
                    <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors" [class.opacity-60]="!session.isActive">
                      <td class="w-14 px-4 py-4 text-center">
                        <mat-checkbox [checked]="isSelected(session.id)" (change)="toggleSelection(session.id)"></mat-checkbox>
                      </td>
                      @if (columns().person) {
                        <td class="px-4 py-4">
                          <div class="flex items-center gap-3">
                            @if (session.personAvatar) {
                              <img [src]="session.personAvatar" class="w-8 h-8 rounded-full object-cover" alt="">
                            } @else {
                              <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0">
                                {{ initials(session.personName) }}
                              </div>
                            }
                            <div class="flex flex-col">
                              <div class="flex items-center gap-2">
                                <span class="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{{ session.personName }}</span>
                                @if (isCurrentSession(session)) {
                                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                    Esta sesión
                                  </span>
                                }
                                @if (!session.isActive) {
                                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                                    Revocada
                                  </span>
                                }
                              </div>
                            </div>
                          </div>
                        </td>
                      }
                      @if (columns().browser) {
                        <td class="px-4 py-4">
                          <div class="flex items-center gap-2">
                              <mat-icon [svgIcon]="session.browserIcon" class="!w-4 !h-4 text-neutral-400 dark:text-neutral-500"></mat-icon>
                              <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ session.browserName }} {{ 'sessions.on' | transloco }} {{ session.osName }}</span>
                          </div>
                        </td>
                      }
                      @if (columns().ipAddress) {
                        <td class="px-4 py-4">
                          <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ session.ipAddress }}</span>
                        </td>
                      }
                      @if (columns().location) {
                        <td class="px-4 py-4">
                          <div class="flex items-center gap-2">
                            @if (session.locationFlagUrl) {
                              <img [src]="session.locationFlagUrl" class="w-4 h-3 rounded-sm object-cover" [alt]="session.locationCountry">
                            }
                            <span class="text-sm text-neutral-700 dark:text-neutral-300">{{ session.locationCountry }}</span>
                          </div>
                        </td>
                      }
                      <td class="px-4 py-4 text-right">
                         <button mat-icon-button type="button" [matMenuTriggerFor]="rowMenu" class="!w-8 !h-8 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                            <mat-icon svgIcon="ellipsis-vertical" class="!w-5 !h-5"></mat-icon>
                         </button>
                         <mat-menu #rowMenu="matMenu" class="!rounded-xl !p-1">
                           <button mat-menu-item (click)="revokeSession(session)" [disabled]="!session.isActive" class="!text-red-600 dark:!text-red-400">
                             <mat-icon svgIcon="log-out" class="!w-4 !h-4 mr-2 text-red-500"></mat-icon>
                             <span>{{ isCurrentSession(session) ? ('sessions.revokeCurrent' | transloco) : ('sessions.revoke' | transloco) }}</span>
                           </button>
                         </mat-menu>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="px-4 py-8 text-center">
                        <div class="flex flex-col items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-600 m-4">
                          <i-monitor-check [size]="48" class="text-neutral-400 mb-3" />
                           <h3 class="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">{{ 'sessions.emptyTitle' | transloco }}</h3>
                           <p class="text-sm text-neutral-500 text-center max-w-sm">{{ 'sessions.emptyDescription' | transloco }}</p>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              <span class="text-sm text-neutral-500">
                {{ 'sessions.showing' | transloco }}
                <span class="font-medium text-neutral-900 dark:text-white">
                  {{ filteredSessions().length > 0 ? 1 : 0 }} - {{ filteredSessions().length }}
                </span>
                {{ 'sessions.of' | transloco }}
                <span class="font-medium text-neutral-900 dark:text-white">
                  {{ sessions().length }}
                </span>
              </span>

              <div class="flex gap-2">
                <button mat-icon-button disabled class="!w-8 !h-8 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center">
                  <i-chevron-left [size]="16" class="text-neutral-400" />
                </button>
                <button mat-icon-button disabled class="!w-8 !h-8 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 flex items-center justify-center">
                  <i-chevron-right [size]="16" class="text-neutral-400" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
  `,
})
export default class CurrentSessionsComponent implements OnInit {
  private _sessionsService = inject(CurrentSessionsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  readonly authState = inject(AuthState);
  private readonly transloco = inject(TranslocoService);

  sessions = this._sessionsService.sessions;

  searchQuery = signal<string>('');
  onlyActive = signal<boolean>(true);
  selectedBrowser = signal<string>('');
  selectedLocation = signal<string>('');

  columns = signal({
    person: true,
    browser: true,
    ipAddress: true,
    location: true,
  });

  toggleColumn(col: 'person' | 'browser' | 'ipAddress' | 'location') {
    this.columns.update(curr => ({
      ...curr,
      [col]: !curr[col]
    }));
  }

  availableBrowsers = computed(() => {
    return Array.from(new Set(this.sessions().map(s => s.browserName).filter(Boolean)));
  });

  availableLocations = computed(() => {
    return Array.from(new Set(this.sessions().map(s => s.locationCountry).filter(Boolean)));
  });

  selectedIds = signal<Set<string>>(new Set<string>());
  loading = signal(false);
  error = signal(false);

  ngOnInit(): void {
    this.loadSessions();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.error.set(false);
    this._sessionsService.getSessions().subscribe({
      next: () => this.loading.set(false),
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  isCurrentSession(session: SessionLog): boolean {
    const currentSessionId = this.authState.user()?.sessionId;
    return session.isCurrent || (!!currentSessionId && session.id === currentSessionId) || (this.sessions().length === 1 && session.isActive);
  }

  revokeSession(session: SessionLog): void {
    const isCurrent = this.isCurrentSession(session);
    this.dialog.open(ConfirmDialogComponent, {
      width: 'min(460px, calc(100vw - 32px))',
      data: {
        title: this.transloco.translate('sessions.revoke'),
        message: isCurrent
          ? this.transloco.translate('sessions.revokeCurrentMessage', { name: session.personName })
          : this.transloco.translate('sessions.revokeMessage', { name: session.personName }),
        confirmLabel: this.transloco.translate('sessions.revoke'),
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.loading.set(true);
      this._sessionsService.revoke(session.id).subscribe({
        next: () => {
          this.loading.set(false);
          if (isCurrent) {
            this.authState.clearSession();
            this.router.navigate(['/auth/sign-in']);
          } else {
            this.snackBar.open(this.transloco.translate('sessions.revoked'), this.transloco.translate('common.close'), { duration: 3000 });
            this.loadSessions();
          }
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(this.transloco.translate('sessions.revokeError'), this.transloco.translate('common.close'), { duration: 4000 });
        },
      });
    });
  }

  revokeSelected(): void {
    const ids = Array.from(this.selectedIds());
    if (ids.length === 0) return;

    this.dialog.open(ConfirmDialogComponent, {
      width: 'min(460px, calc(100vw - 32px))',
      data: {
        title: 'Cerrar sesiones seleccionadas',
        message: `¿Estás seguro de que deseas revocar <strong>${ids.length}</strong> sesiones seleccionadas?`,
        confirmLabel: 'Cerrar sesiones',
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.loading.set(true);
      const currentSessionId = this.authState.user()?.sessionId;
      const includesCurrent = ids.some(id => id === currentSessionId);

      let completed = 0;
      ids.forEach(id => {
        this._sessionsService.revoke(id).subscribe({
          next: () => {
            completed++;
            if (completed === ids.length) {
              this.loading.set(false);
              this.selectedIds.set(new Set());
              if (includesCurrent) {
                this.authState.clearSession();
                this.router.navigate(['/auth/sign-in']);
              } else {
                this.snackBar.open('Sesiones revocadas exitosamente', this.transloco.translate('common.close'), { duration: 3000 });
                this.loadSessions();
              }
            }
          },
          error: () => {
            completed++;
            if (completed === ids.length) {
              this.loading.set(false);
              this.loadSessions();
            }
          }
        });
      });
    });
  }

  revokeOthers(): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: 'min(460px, calc(100vw - 32px))',
      data: {
        title: this.transloco.translate('sessions.closeOthers'),
        message: this.transloco.translate('sessions.closeOthersMessage'),
        confirmLabel: this.transloco.translate('sessions.closeOthers'),
        destructive: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;
      this.loading.set(true);
      this._sessionsService.revokeOthers().subscribe({
        next: () => {
          this.loading.set(false);
          this.snackBar.open(this.transloco.translate('sessions.othersClosed'), this.transloco.translate('common.close'), { duration: 3000 });
          this.loadSessions();
        },
        error: () => {
          this.loading.set(false);
          this.snackBar.open(this.transloco.translate('sessions.closeOthersError'), this.transloco.translate('common.close'), { duration: 4000 });
        },
      });
    });
  }

  initials(name: string): string {
    const parts = name.split('@')[0].replace(/[._-]+/g, ' ').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
  }

  filteredSessions = computed(() => {
    let current = this.sessions();

    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      current = current.filter(s =>
        s.personName.toLowerCase().includes(query) ||
        s.browserName.toLowerCase().includes(query) ||
        s.osName.toLowerCase().includes(query) ||
        s.ipAddress.includes(query) ||
        s.locationCountry.toLowerCase().includes(query)
      );
    }

    if (this.onlyActive()) {
      current = current.filter(s => s.isActive);
    }

    if (this.selectedBrowser()) {
      current = current.filter(s => s.browserName.toLowerCase() === this.selectedBrowser().toLowerCase());
    }

    if (this.selectedLocation()) {
      current = current.filter(s => s.locationCountry.toLowerCase() === this.selectedLocation().toLowerCase());
    }

    return current;
  });

  allSelected = computed(() => {
    const visible = this.filteredSessions();
    if (visible.length === 0) return false;
    const selected = this.selectedIds();
    return visible.every(s => selected.has(s.id));
  });

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  toggleSelection(id: string) {
    const current = new Set(this.selectedIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedIds.set(current);
  }

  toggleAll() {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      const allVisible = this.filteredSessions().map(s => s.id);
      this.selectedIds.set(new Set(allVisible));
    }
  }
}
