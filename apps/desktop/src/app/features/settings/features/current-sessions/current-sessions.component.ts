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
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TableSkeletonComponent } from '@shared/components/table-skeleton/table-skeleton.component';
import { AuthState } from '@core/auth/auth.state';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'current-sessions',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
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
            {{ 'sessions.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'sessions.description' | transloco }}
          </p>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">

        <!-- Contextual Selection Bar (When rows are checked) -->
        @if (selectedIds().size > 0) {
          <div class="flex items-center justify-between px-6 md:px-8 py-3.5 bg-blue-50/80 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800/60 animate-fadeIn">
            <div class="flex items-center gap-3">
              <span class="inline-flex items-center justify-center size-6 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                {{ selectedIds().size }}
              </span>
              <span class="text-sm font-semibold text-blue-950 dark:text-blue-200">
                {{ selectedIds().size === 1 ? ('sessions.selectedCountOne' | transloco) : ('sessions.selectedCount' | transloco: { count: selectedIds().size }) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                (click)="clearSelection()"
                class="px-3 py-1.5 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {{ 'sessions.deselectAll' | transloco }}
              </button>
              <button
                type="button"
                (click)="revokeSelected()"
                [disabled]="loading()"
                class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <mat-icon svgIcon="trash" class="icon-size-3.5 text-white"></mat-icon>
                <span>{{ 'sessions.closeSelected' | transloco }} ({{ selectedIds().size }})</span>
              </button>
            </div>
          </div>
        } @else {
          <!-- Filter Bar -->
          <div
            class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <!-- Search + Filters -->
            <div class="flex min-w-[260px] flex-1 items-center gap-3">
              <div class="relative w-full max-w-md">
                <mat-icon
                  svgIcon="search"
                  class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
                ></mat-icon>
                <input
                  type="text"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
                  [placeholder]="'sessions.search' | transloco"
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

              <!-- Unified Filters Popover Button with Badge Counter -->
              <button
                [matMenuTriggerFor]="filtersMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
                [class.border-blue-500]="activeFilterCount() > 0"
                [class.text-blue-600]="activeFilterCount() > 0"
                [class.dark:text-blue-400]="activeFilterCount() > 0"
              >
                <mat-icon svgIcon="sliders-horizontal" class="icon-size-4 text-neutral-500"></mat-icon>
                <span>{{ 'sessions.filters' | transloco }}</span>
                @if (activeFilterCount() > 0) {
                  <span class="size-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                    {{ activeFilterCount() }}
                  </span>
                }
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
              </button>

              <!-- Filters Menu Content -->
              <mat-menu #filtersMenu="matMenu" class="!rounded-2xl !p-2 min-w-64">
                <div class="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1 flex items-center justify-between">
                  <span>{{ 'sessions.filters' | transloco }}</span>
                  @if (activeFilterCount() > 0) {
                    <button
                      (click)="clearAllFilters()"
                      class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase font-medium"
                    >
                      {{ 'sessions.clearAll' | transloco }}
                    </button>
                  }
                </div>

                <!-- Status Filter -->
                <div class="px-2 py-1.5">
                  <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 px-1">{{ 'sessions.filterStatus' | transloco }}</span>
                  <div class="mt-1 flex flex-col gap-0.5">
                    <button
                      mat-menu-item
                      (click)="statusFilter.set('active')"
                      class="!h-8 !rounded-lg text-xs"
                      [class.font-bold]="statusFilter() === 'active'"
                    >
                      <span class="flex items-center justify-between w-full">
                        <span>{{ 'sessions.onlyActiveSessions' | transloco }}</span>
                        @if (statusFilter() === 'active') {
                          <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                        }
                      </span>
                    </button>
                    <button
                      mat-menu-item
                      (click)="statusFilter.set('all')"
                      class="!h-8 !rounded-lg text-xs"
                      [class.font-bold]="statusFilter() === 'all'"
                    >
                      <span class="flex items-center justify-between w-full">
                        <span>{{ 'sessions.allStatuses' | transloco }}</span>
                        @if (statusFilter() === 'all') {
                          <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                        }
                      </span>
                    </button>
                    <button
                      mat-menu-item
                      (click)="statusFilter.set('revoked')"
                      class="!h-8 !rounded-lg text-xs"
                      [class.font-bold]="statusFilter() === 'revoked'"
                    >
                      <span class="flex items-center justify-between w-full">
                        <span>{{ 'sessions.onlyRevokedSessions' | transloco }}</span>
                        @if (statusFilter() === 'revoked') {
                          <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                        }
                      </span>
                    </button>
                  </div>
                </div>

                <!-- Browser Filter -->
                @if (availableBrowsers().length > 0) {
                  <div class="px-2 py-1.5 border-t border-neutral-100 dark:border-neutral-800">
                    <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 px-1">{{ 'sessions.filterBrowser' | transloco }}</span>
                    <div class="mt-1 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                      <button
                        mat-menu-item
                        (click)="selectedBrowser.set('')"
                        class="!h-8 !rounded-lg text-xs"
                        [class.font-bold]="!selectedBrowser()"
                      >
                        <span class="flex items-center justify-between w-full">
                          <span>{{ 'sessions.allBrowsers' | transloco }}</span>
                          @if (!selectedBrowser()) {
                            <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                          }
                        </span>
                      </button>
                      @for (b of availableBrowsers(); track b) {
                        <button
                          mat-menu-item
                          (click)="selectedBrowser.set(b)"
                          class="!h-8 !rounded-lg text-xs"
                          [class.font-bold]="selectedBrowser() === b"
                        >
                          <span class="flex items-center justify-between w-full">
                            <span class="truncate">{{ b }}</span>
                            @if (selectedBrowser() === b) {
                              <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                            }
                          </span>
                        </button>
                      }
                    </div>
                  </div>
                }

                <!-- Location Filter -->
                @if (availableLocations().length > 0) {
                  <div class="px-2 py-1.5 border-t border-neutral-100 dark:border-neutral-800">
                    <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400 px-1">{{ 'sessions.filterLocation' | transloco }}</span>
                    <div class="mt-1 flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                      <button
                        mat-menu-item
                        (click)="selectedLocation.set('')"
                        class="!h-8 !rounded-lg text-xs"
                        [class.font-bold]="!selectedLocation()"
                      >
                        <span class="flex items-center justify-between w-full">
                          <span>{{ 'sessions.allLocations' | transloco }}</span>
                          @if (!selectedLocation()) {
                            <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                          }
                        </span>
                      </button>
                      @for (loc of availableLocations(); track loc) {
                        <button
                          mat-menu-item
                          (click)="selectedLocation.set(loc)"
                          class="!h-8 !rounded-lg text-xs"
                          [class.font-bold]="selectedLocation() === loc"
                        >
                          <span class="flex items-center justify-between w-full">
                            <span class="truncate">{{ loc }}</span>
                            @if (selectedLocation() === loc) {
                              <mat-icon svgIcon="check" class="icon-size-3.5 text-blue-600 dark:text-blue-400 ml-auto"></mat-icon>
                            }
                          </span>
                        </button>
                      }
                    </div>
                  </div>
                }
              </mat-menu>
            </div>

            <!-- Right Section: Actions Menu -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                [matMenuTriggerFor]="tableActionsMenu"
                type="button"
                class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
              >
                <span>{{ 'sessions.actions' | transloco }}</span>
                <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
              </button>

              <mat-menu #tableActionsMenu="matMenu" class="!rounded-2xl !p-1.5 min-w-56">
                <button mat-menu-item (click)="loadSessions()" [disabled]="loading()">
                  <mat-icon svgIcon="refresh-cw" class="icon-size-4 mr-2 text-neutral-500"></mat-icon>
                  <span class="text-sm">{{ 'sessions.refresh' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="revokeOthers()" [disabled]="loading()" class="!text-red-600 dark:!text-red-400">
                  <mat-icon svgIcon="log-out" class="icon-size-4 mr-2 text-red-500"></mat-icon>
                  <span class="text-sm font-medium">{{ 'sessions.closeOthers' | transloco }}</span>
                </button>
              </mat-menu>
            </div>
          </div>
        }

        <!-- Dismissible Active Filter Chips -->
        @if (hasActiveFilterChips()) {
          <div class="flex flex-wrap items-center gap-2 px-6 md:px-8 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 text-xs animate-fadeIn">
            <span class="text-neutral-400 font-medium mr-1">{{ 'sessions.activeFilters' | transloco }}:</span>

            @if (statusFilter() !== 'all') {
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 font-medium shadow-2xs">
                <span>{{ statusFilter() === 'active' ? ('sessions.onlyActiveSessions' | transloco) : ('sessions.onlyRevokedSessions' | transloco) }}</span>
                <button type="button" (click)="statusFilter.set('all')" class="hover:text-blue-900 dark:hover:text-blue-200 cursor-pointer">
                  <mat-icon svgIcon="x" class="icon-size-3"></mat-icon>
                </button>
              </span>
            }

            @if (selectedBrowser()) {
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50 font-medium shadow-2xs">
                <span>{{ 'sessions.browser' | transloco }}: {{ selectedBrowser() }}</span>
                <button type="button" (click)="selectedBrowser.set('')" class="hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                  <mat-icon svgIcon="x" class="icon-size-3"></mat-icon>
                </button>
              </span>
            }

            @if (selectedLocation()) {
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50 font-medium shadow-2xs">
                <span>{{ 'sessions.location' | transloco }}: {{ selectedLocation() }}</span>
                <button type="button" (click)="selectedLocation.set('')" class="hover:text-neutral-900 dark:hover:text-white cursor-pointer">
                  <mat-icon svgIcon="x" class="icon-size-3"></mat-icon>
                </button>
              </span>
            }

            <button
              type="button"
              (click)="clearAllFilters()"
              class="text-blue-600 dark:text-blue-400 hover:underline font-semibold ml-1 cursor-pointer"
            >
              {{ 'sessions.clearAll' | transloco }}
            </button>
          </div>
        }

        <!-- Sessions Table Grid -->
        <div class="grid">
          <div
            class="sessions-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 items-center"
          >
            <div class="flex items-center">
              <mat-checkbox [checked]="allSelected()" (change)="toggleAll()"></mat-checkbox>
            </div>
            <div>{{ 'sessions.person' | transloco }}</div>
            <div class="hidden sm:block">{{ 'sessions.browser' | transloco }}</div>
            <div class="hidden md:block">{{ 'sessions.ipAddress' | transloco }}</div>
            <div class="hidden lg:block">{{ 'sessions.location' | transloco }}</div>
            <div class="text-right">{{ 'common.actions' | transloco }}</div>
          </div>

          @if (loading()) {
            <app-table-skeleton [gridClass]="'sessions-grid'" [rows]="5" />
          } @else if (filteredSessions().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                type="no-data"
                [title]="'sessions.emptyTitle' | transloco"
                [description]="'sessions.emptyDescription' | transloco"
                [actionLabel]="activeFilterCount() > 0 || searchQuery() ? ('sessions.clearFilters' | transloco) : undefined"
                actionIcon="refresh-cw"
                (action)="clearAllFilters(); searchQuery.set('')"
              />
            </div>
          } @else {
            @for (session of filteredSessions(); track session.id) {
              <div
                class="sessions-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
                [class.opacity-60]="!session.isActive"
              >
                <!-- Checkbox -->
                <div class="flex items-center">
                  <mat-checkbox [checked]="isSelected(session.id)" (change)="toggleSelection(session.id)"></mat-checkbox>
                </div>

                <!-- Person / User -->
                <div class="flex items-center gap-3 min-w-0 pr-2">
                  @if (session.personAvatar) {
                    <img [src]="session.personAvatar" class="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0" alt="">
                  } @else {
                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200/50 dark:border-blue-700/30">
                      {{ initials(session.personName) }}
                    </div>
                  }
                  <div class="flex flex-col min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-sm font-bold text-neutral-900 dark:text-white truncate">{{ session.personName }}</span>
                      @if (isCurrentSession(session)) {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20 shadow-2xs">
                          {{ 'sessions.thisSession' | transloco }}
                        </span>
                      }
                      @if (!session.isActive) {
                        <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200/60 dark:border-neutral-700/50">
                          {{ 'sessions.statusRevoked' | transloco }}
                        </span>
                      }
                    </div>
                  </div>
                </div>

                <!-- Browser & OS -->
                <div class="hidden sm:flex items-center gap-2 min-w-0">
                  <mat-icon [svgIcon]="session.browserIcon" class="!w-4 !h-4 text-neutral-400 dark:text-neutral-500 shrink-0"></mat-icon>
                  <span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">{{ session.browserName }} {{ 'sessions.on' | transloco }} {{ session.osName }}</span>
                </div>

                <!-- IP Address -->
                <div class="hidden md:block font-mono text-xs text-neutral-700 dark:text-neutral-300 truncate">
                  {{ session.ipAddress }}
                </div>

                <!-- Location -->
                <div class="hidden lg:flex items-center gap-2 min-w-0">
                  @if (session.locationFlagUrl) {
                    <img [src]="session.locationFlagUrl" class="w-4 h-3 rounded-xs object-cover shrink-0" [alt]="session.locationCountry">
                  }
                  <span class="text-sm text-neutral-700 dark:text-neutral-300 truncate">{{ session.locationCountry }}</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center justify-end gap-1">
                  <button
                    mat-icon-button
                    type="button"
                    [matMenuTriggerFor]="rowMenu"
                    class="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                  >
                    <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4.5"></mat-icon>
                  </button>
                  <mat-menu #rowMenu="matMenu" class="!rounded-2xl !p-1">
                    <button mat-menu-item (click)="revokeSession(session)" [disabled]="!session.isActive" class="!text-red-600 dark:!text-red-400">
                      <mat-icon svgIcon="log-out" class="icon-size-4 mr-2 text-red-500"></mat-icon>
                      <span class="text-sm">{{ isCurrentSession(session) ? ('sessions.revokeCurrent' | transloco) : ('sessions.revoke' | transloco) }}</span>
                    </button>
                  </mat-menu>
                </div>
              </div>
            }
          }
        </div>

        <!-- Footer / Pagination -->
        <div class="flex items-center justify-between px-6 md:px-8 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-500">
          <span>
            {{ 'sessions.showing' | transloco }}
            <span class="font-semibold text-neutral-900 dark:text-white">
              {{ filteredSessions().length > 0 ? 1 : 0 }} - {{ filteredSessions().length }}
            </span>
            {{ 'sessions.of' | transloco }}
            <span class="font-semibold text-neutral-900 dark:text-white">
              {{ sessions().length }}
            </span>
          </span>
        </div>

      </div>
    </div>
  `,
  styles: [
    `
      .sessions-grid {
        grid-template-columns: 44px minmax(200px, 2fr) minmax(180px, 1.5fr) minmax(130px, 1.1fr) minmax(140px, 1.2fr) 60px;
      }
      @media (max-width: 1024px) {
        .sessions-grid {
          grid-template-columns: 44px minmax(180px, 2fr) minmax(160px, 1.5fr) minmax(120px, 1.1fr) 60px;
        }
      }
      @media (max-width: 768px) {
        .sessions-grid {
          grid-template-columns: 44px minmax(160px, 2fr) minmax(140px, 1.3fr) 60px;
        }
      }
      @media (max-width: 640px) {
        .sessions-grid {
          grid-template-columns: 44px minmax(150px, 2fr) 50px;
        }
      }
    `,
  ],
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
  statusFilter = signal<'all' | 'active' | 'revoked'>('active');
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

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.statusFilter() !== 'all') count++;
    if (this.selectedBrowser()) count++;
    if (this.selectedLocation()) count++;
    return count;
  });

  hasActiveFilterChips = computed(() => {
    return this.statusFilter() !== 'all' || !!this.selectedBrowser() || !!this.selectedLocation();
  });

  clearAllFilters() {
    this.statusFilter.set('all');
    this.selectedBrowser.set('');
    this.selectedLocation.set('');
  }

  clearSelection() {
    this.selectedIds.set(new Set());
  }

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
        title: this.transloco.translate('sessions.closeSelected'),
        message: `¿Estás seguro de que deseas revocar <strong>${ids.length}</strong> sesiones seleccionadas?`,
        confirmLabel: this.transloco.translate('sessions.closeSelected'),
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
                this.snackBar.open(this.transloco.translate('sessions.revoked'), this.transloco.translate('common.close'), { duration: 3000 });
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

    const status = this.statusFilter();
    if (status === 'active') {
      current = current.filter(s => s.isActive);
    } else if (status === 'revoked') {
      current = current.filter(s => !s.isActive);
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
