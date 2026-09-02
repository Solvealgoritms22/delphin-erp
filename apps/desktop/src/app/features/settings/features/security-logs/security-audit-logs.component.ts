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
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  SearchIcon,
  TrashIcon,
  SlidersHorizontalIcon,
  ArrowDownIcon,
  RefreshCwIcon,
  ClipboardListIcon,
  ChevronDownIcon,
  CheckIcon,
  XIcon
} from 'ng-animated-icons';

@Component({
  selector: 'app-security-logs',
  standalone: true,
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
    SearchIcon,
    TrashIcon,
    SlidersHorizontalIcon,
    ArrowDownIcon,
    RefreshCwIcon,
    ClipboardListIcon,
    ChevronDownIcon,
    CheckIcon,
    XIcon,
  ],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <!-- Page Header -->
      <div class="shrink-0 flex w-full flex-col px-6 pt-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-6 gap-4">
          <div>
             <h1 class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{{ 'securityLogs.title' | transloco }}</h1>
             <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'securityLogs.description' | transloco }}</p>
          </div>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="flex-auto min-h-0 overflow-y-auto p-4 sm:p-6 sm:pb-12">

        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl overflow-hidden shadow-sm">

          <!-- TOOLBAR -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 border-b border-neutral-200 dark:border-neutral-700/80 gap-3">

            <!-- Left: Search Box + Filters + Columns Toggle -->
            <div class="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap sm:flex-nowrap">

              <!-- Search Input with Clear Button -->
              <div class="relative flex items-center h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/40 min-w-[200px] sm:min-w-64 max-w-sm flex-1 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <i-search [size]="16" class="text-neutral-400 shrink-0 mr-2" />
                <input
                  type="text"
                  [placeholder]="'securityLogs.search' | transloco"
                  [ngModel]="searchQuery()"
                  (ngModelChange)="searchQuery.set($event)"
                  class="w-full h-full bg-transparent border-none outline-none text-sm placeholder:text-neutral-400 text-neutral-800 dark:text-neutral-200"
                />
                @if (searchQuery()) {
                  <button
                    type="button"
                    (click)="searchQuery.set('')"
                    class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer p-0.5 ml-1"
                  >
                    <i-x [size]="14" />
                  </button>
                }
              </div>

              <!-- Unified Filters Popover Button with Badge Counter -->
              <button
                [matMenuTriggerFor]="severityMenu"
                type="button"
                class="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200 shrink-0 cursor-pointer shadow-2xs"
                [class.border-blue-500]="severity() !== ''"
                [class.text-blue-600]="severity() !== ''"
                [class.dark:text-blue-400]="severity() !== ''"
              >
                <i-sliders-horizontal [size]="15" />
                <span>{{ 'securityLogs.filters' | transloco }}</span>
                @if (severity() !== '') {
                  <span class="size-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                    1
                  </span>
                }
                <i-chevron-down [size]="13" class="text-neutral-400" />
              </button>

              <!-- Severity Filter Dropdown Menu -->
              <mat-menu #severityMenu="matMenu" class="!rounded-2xl !p-2 min-w-56">
                <div class="px-3 py-2 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1 flex items-center justify-between">
                  <span>{{ 'securityLogs.severity' | transloco }}</span>
                  @if (severity() !== '') {
                    <button
                      (click)="setSeverity('')"
                      class="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase font-medium"
                    >
                      {{ 'securityLogs.clearAll' | transloco }}
                    </button>
                  }
                </div>

                <div class="flex flex-col gap-0.5">
                  <button mat-menu-item (click)="setSeverity('')" class="!h-8 !rounded-lg text-xs" [class.font-bold]="!severity()">
                    <span class="flex items-center justify-between w-full">
                      <span>{{ 'securityLogs.allSeverities' | transloco }}</span>
                      @if (!severity()) { <i-check [size]="14" class="text-blue-600 dark:text-blue-400 ml-auto" /> }
                    </span>
                  </button>
                  <button mat-menu-item (click)="setSeverity('Critical')" class="!h-8 !rounded-lg text-xs" [class.font-bold]="severity() === 'Critical'">
                    <span class="flex items-center justify-between w-full">
                      <span class="inline-flex items-center gap-2 text-rose-600 dark:text-rose-400 font-medium">
                        <span class="size-2 rounded-full bg-rose-500"></span>
                        {{ 'securityLogs.critical' | transloco }}
                      </span>
                      @if (severity() === 'Critical') { <i-check [size]="14" class="text-blue-600 dark:text-blue-400 ml-auto" /> }
                    </span>
                  </button>
                  <button mat-menu-item (click)="setSeverity('High')" class="!h-8 !rounded-lg text-xs" [class.font-bold]="severity() === 'High'">
                    <span class="flex items-center justify-between w-full">
                      <span class="inline-flex items-center gap-2 text-orange-600 dark:text-orange-400 font-medium">
                        <span class="size-2 rounded-full bg-orange-500"></span>
                        {{ 'securityLogs.high' | transloco }}
                      </span>
                      @if (severity() === 'High') { <i-check [size]="14" class="text-blue-600 dark:text-blue-400 ml-auto" /> }
                    </span>
                  </button>
                  <button mat-menu-item (click)="setSeverity('Medium')" class="!h-8 !rounded-lg text-xs" [class.font-bold]="severity() === 'Medium'">
                    <span class="flex items-center justify-between w-full">
                      <span class="inline-flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                        <span class="size-2 rounded-full bg-amber-500"></span>
                        {{ 'securityLogs.medium' | transloco }}
                      </span>
                      @if (severity() === 'Medium') { <i-check [size]="14" class="text-blue-600 dark:text-blue-400 ml-auto" /> }
                    </span>
                  </button>
                  <button mat-menu-item (click)="setSeverity('Low')" class="!h-8 !rounded-lg text-xs" [class.font-bold]="severity() === 'Low'">
                    <span class="flex items-center justify-between w-full">
                      <span class="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                        <span class="size-2 rounded-full bg-blue-500"></span>
                        {{ 'securityLogs.low' | transloco }}
                      </span>
                      @if (severity() === 'Low') { <i-check [size]="14" class="text-blue-600 dark:text-blue-400 ml-auto" /> }
                    </span>
                  </button>
                </div>
              </mat-menu>

              <!-- Columns Visibility Menu -->
              <button
                [matMenuTriggerFor]="columnsMenu"
                type="button"
                class="flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200 shrink-0 cursor-pointer shadow-2xs"
              >
                <span>{{ 'securityLogs.columns' | transloco }}</span>
                <i-chevron-down [size]="13" class="text-neutral-400" />
              </button>

              <mat-menu #columnsMenu="matMenu" class="!rounded-2xl !p-2 min-w-44">
                <div class="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 mb-1">
                  {{ 'securityLogs.columns' | transloco }}
                </div>
                <button mat-menu-item (click)="toggleColumn('user')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().user" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.user' | transloco }}
                  </span>
                </button>
                <button mat-menu-item (click)="toggleColumn('timestamp')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().timestamp" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.timestamp' | transloco }}
                  </span>
                </button>
                <button mat-menu-item (click)="toggleColumn('eventType')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().eventType" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.eventType' | transloco }}
                  </span>
                </button>
                <button mat-menu-item (click)="toggleColumn('actionTaken')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().actionTaken" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.actionTaken' | transloco }}
                  </span>
                </button>
                <button mat-menu-item (click)="toggleColumn('sourceIp')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().sourceIp" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.sourceIp' | transloco }}
                  </span>
                </button>
                <button mat-menu-item (click)="toggleColumn('destinationIp')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().destinationIp" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.destinationIp' | transloco }}
                  </span>
                </button>
                <button mat-menu-item (click)="toggleColumn('severity')">
                  <span class="inline-flex items-center gap-2 text-xs">
                    <input type="checkbox" [checked]="columns().severity" (click)="$event.stopPropagation()" class="rounded text-blue-600 pointer-events-none">
                    {{ 'securityLogs.severity' | transloco }}
                  </span>
                </button>
              </mat-menu>
            </div>

            <!-- Right: Push Alerts Toggle + Actions Menu -->
            <div class="flex items-center gap-3 sm:gap-4 self-end sm:self-auto shrink-0">

              <!-- Push Alerts Switch -->
              <div class="flex items-center gap-2 whitespace-nowrap shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <span>{{ 'securityLogs.pushAlerts' | transloco }}</span>
                <mat-slide-toggle [checked]="pushAlerts()" (change)="togglePushAlerts($event.checked)"></mat-slide-toggle>
              </div>

              <!-- Actions Menu -->
              <button
                [matMenuTriggerFor]="actionsMenu"
                type="button"
                class="flex items-center gap-2 h-10 px-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors text-sm font-medium text-neutral-700 dark:text-neutral-200 cursor-pointer shadow-2xs"
              >
                <span>{{ 'securityLogs.actions' | transloco }}</span>
                <i-chevron-down [size]="13" class="text-neutral-400" />
              </button>

              <mat-menu #actionsMenu="matMenu" class="!rounded-2xl !p-1.5 min-w-56">
                <button mat-menu-item (click)="loadLogs()" [disabled]="loading()">
                  <i-refresh-cw [size]="15" class="mr-2 text-neutral-500" />
                  <span class="text-sm">{{ 'securityLogs.refresh' | transloco }}</span>
                </button>
                <button mat-menu-item (click)="clearLogs()" [disabled]="loading() || logs().length === 0" class="!text-red-600 dark:!text-red-400">
                  <i-trash [size]="15" class="mr-2 text-red-500" />
                  <span class="text-sm font-medium">{{ 'securityLogs.clear' | transloco }}</span>
                </button>
              </mat-menu>
            </div>

          </div>

          <!-- DISMISSIBLE ACTIVE FILTER CHIPS -->
          @if (severity()) {
            <div class="flex flex-wrap items-center gap-2 px-4 sm:px-5 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 text-xs animate-fadeIn">
              <span class="text-neutral-400 font-medium mr-1">{{ 'securityLogs.activeFilters' | transloco }}:</span>

              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/50 font-medium shadow-2xs">
                <span>{{ 'securityLogs.severity' | transloco }}: {{ getSeverityLabel(severity()) }}</span>
                <button type="button" (click)="setSeverity('')" class="hover:text-neutral-900 dark:hover:text-white cursor-pointer"><i-x [size]="12" /></button>
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

          <!-- DATA TABLE -->
          <div class="overflow-x-auto">
            <table class="w-full text-left min-w-[900px] border-collapse">
              <thead>
                <tr class="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/50 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  @if (columns().user) {
                    <th class="py-3.5 px-4">{{ 'securityLogs.user' | transloco }}</th>
                  }
                  @if (columns().timestamp) {
                    <th class="py-3.5 px-4">
                      <div class="flex items-center gap-1 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200">
                        <span>{{ 'securityLogs.timestamp' | transloco }}</span>
                        <i-arrow-down [size]="12" />
                      </div>
                    </th>
                  }
                  @if (columns().eventType) {
                    <th class="py-3.5 px-4">{{ 'securityLogs.eventType' | transloco }}</th>
                  }
                  @if (columns().actionTaken) {
                    <th class="py-3.5 px-4">{{ 'securityLogs.actionTaken' | transloco }}</th>
                  }
                  @if (columns().sourceIp) {
                    <th class="py-3.5 px-4">{{ 'securityLogs.sourceIp' | transloco }}</th>
                  }
                  @if (columns().destinationIp) {
                    <th class="py-3.5 px-4">{{ 'securityLogs.destinationIp' | transloco }}</th>
                  }
                  @if (columns().severity) {
                    <th class="py-3.5 px-4">{{ 'securityLogs.severity' | transloco }}</th>
                  }
                  <th class="py-3.5 px-4 text-right">{{ 'securityLogs.actions' | transloco }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
                @if (loading()) {
                  @for (row of [1, 2, 3, 4, 5]; track row) {
                    <tr class="animate-pulse">
                      <td class="py-4 px-4"><div class="h-3.5 w-28 rounded bg-neutral-200 dark:bg-neutral-800"></div></td>
                      <td class="py-4 px-4"><div class="h-3.5 w-32 rounded bg-neutral-200 dark:bg-neutral-800"></div></td>
                      <td class="py-4 px-4"><div class="h-3.5 w-40 rounded bg-neutral-200 dark:bg-neutral-800"></div></td>
                      <td class="py-4 px-4"><div class="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-800"></div></td>
                      <td class="py-4 px-4 text-right"><div class="h-7 w-7 ml-auto rounded-lg bg-neutral-100 dark:bg-neutral-800"></div></td>
                    </tr>
                  }
                } @else if (filteredLogs().length === 0) {
                  <tr>
                    <td colspan="8" class="py-16 text-center">
                      <div class="flex flex-col items-center justify-center max-w-sm mx-auto p-8 bg-neutral-50/60 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700">
                        <div class="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400 mb-3">
                          <i-search [size]="22" />
                        </div>
                        <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-1">{{ 'securityLogs.noMatches' | transloco }}</h3>
                        <p class="text-xs text-neutral-500 text-center">
                          {{ (searchQuery() || severity() ? ('securityLogs.noMatchesDescription' | transloco) : ('securityLogs.emptyDescription' | transloco)) }}
                        </p>
                        @if (searchQuery() || severity()) {
                          <button
                            type="button"
                            (click)="clearFilters()"
                            class="mt-4 px-3.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            {{ 'securityLogs.clearFilters' | transloco }}
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @else {
                 @for (log of paginatedLogs(); track log.id) {
                  <tr class="hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30 transition-colors text-[13px] text-neutral-700 dark:text-neutral-300">
                    @if (columns().user) {
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2.5">
                          @if (log.usuarioAvatar) {
                            <img [src]="log.usuarioAvatar" [alt]="log.usuarioNombre || 'Usuario'" class="size-7 rounded-full object-cover border border-neutral-200 dark:border-neutral-700 shrink-0" />
                          } @else {
                            <div class="size-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 border border-neutral-200/60 dark:border-neutral-700/60" [ngClass]="getAvatarColor(log.usuarioNombre || log.usuarioEmail)">
                              {{ getInitials(log.usuarioNombre || log.usuarioEmail) }}
                            </div>
                          }
                          <div class="flex flex-col min-w-0">
                            <span class="font-semibold text-neutral-900 dark:text-white truncate max-w-[130px]">{{ log.usuarioNombre || log.usuarioEmail || ('securityLogs.system' | transloco) }}</span>
                            @if (log.usuarioNombre && log.usuarioEmail) {
                              <span class="text-[11px] text-neutral-400 truncate max-w-[130px]">{{ log.usuarioEmail }}</span>
                            }
                          </div>
                        </div>
                      </td>
                    }
                    @if (columns().timestamp) {
                      <td class="py-3.5 px-4 font-medium text-xs whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                        {{ log.timestamp | date:'d MMM y, HH:mm:ss' }}
                      </td>
                    }
                    @if (columns().eventType) {
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-2 font-bold text-neutral-900 dark:text-white text-xs">
                          <mat-icon [svgIcon]="log.eventIcon" [class]="log.eventColor + ' !w-4 !h-4'"></mat-icon>
                          <span>{{ log.eventType }}</span>
                        </div>
                      </td>
                    }
                    @if (columns().actionTaken) {
                      <td class="py-3.5 px-4 text-xs">{{ log.actionTaken }}</td>
                    }
                    @if (columns().sourceIp) {
                      <td class="py-3.5 px-4 font-mono text-xs">{{ log.sourceIp }}</td>
                    }
                    @if (columns().destinationIp) {
                      <td class="py-3.5 px-4 font-mono text-xs">{{ log.destinationIp }}</td>
                    }
                    @if (columns().severity) {
                      <td class="py-3.5 px-4">
                        <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-2xs"
                          [ngClass]="{
                            'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20': log.severity === 'Critical',
                            'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-200/60 dark:border-orange-500/20': log.severity === 'High',
                            'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20': log.severity === 'Medium',
                            'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20': log.severity === 'Low'
                          }">
                          {{ getSeverityLabel(log.severity) }}
                        </span>
                      </td>
                    }
                    <td class="py-3.5 px-4 text-right">
                       <button
                         type="button"
                         [matTooltip]="'securityLogs.copy' | transloco"
                         (click)="copyLog(log)"
                         class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                       >
                        <i-clipboard-list [size]="16" />
                      </button>
                    </td>
                   </tr>
                 }
                }
              </tbody>
            </table>
          </div>

          <!-- FOOTER / PAGINATION -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 text-xs text-neutral-500">
            <div class="flex items-center gap-2">
              <span>{{ 'securityLogs.rowsPerPage' | transloco }}:</span>
              <button
                type="button"
                [matMenuTriggerFor]="pageSizeMenu"
                class="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 transition-colors shadow-2xs cursor-pointer"
              >
                <span>{{ pageSize() }}</span>
                <i-chevron-down [size]="12" class="text-neutral-400" />
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
    </div>
  `
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
