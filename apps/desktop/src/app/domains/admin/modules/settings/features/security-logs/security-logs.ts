import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SecurityLog, SecurityLogsService } from '../../data/security-logs.service';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-security-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0">
      
      <!-- Top header / actions -->
      <div class="flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between p-6 sm:py-8 sm:px-10 border-b bg-card dark:bg-transparent">
        <div class="flex-1 min-w-0">
          <h2 class="text-3xl md:text-4xl font-extrabold tracking-tight leading-7 sm:leading-10 truncate">
            {{ 'securityLogs.title' | transloco }}
          </h2>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'securityLogs.description' | transloco }}</p>
        </div>
      </div>

      <!-- Main Container -->
      <div class="flex-auto p-6 sm:p-10">
        
        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          
          <!-- Toolbar -->
          <div class="flex flex-wrap items-center justify-between p-4 gap-4 border-b border-neutral-200 dark:border-neutral-800">
            <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <!-- Search -->
              <div class="relative flex items-center w-full sm:w-64 flex-auto sm:flex-initial">
                <mat-icon svgIcon="search" class="absolute left-3 !w-5 !h-5 text-neutral-400"></mat-icon>
                <input type="text" [placeholder]="'securityLogs.search' | transloco" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" 
                  class="w-full h-10 pl-10 pr-4 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              </div>
              
              <!-- Severity Filter -->
               <select [ngModel]="severity()" (ngModelChange)="severity.set($event); loadLogs()"
                 class="h-10 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-medium text-neutral-600 dark:text-neutral-300 focus:ring-2 focus:ring-blue-500 shrink-0">
                  <option value="">{{ 'securityLogs.allSeverities' | transloco }}</option>
                 <option value="Critical">Critical</option>
                 <option value="High">High</option>
                 <option value="Medium">Medium</option>
                 <option value="Low">Low</option>
               </select>
            </div>
            
             <div class="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto justify-start lg:justify-end">
               <button mat-stroked-button type="button" (click)="clearLogs()" [disabled]="loading() || logs().length === 0"
                 class="!rounded-xl !border-red-200 !text-red-600 dark:!border-red-900 dark:!text-red-400 !whitespace-nowrap shrink-0 !h-10">
                 <mat-icon svgIcon="trash" class="icon-size-4 mr-1.5"></mat-icon>
                 <span class="whitespace-nowrap">{{ 'securityLogs.clear' | transloco }}</span>
               </button>
               <!-- Push Alerts Toggle -->
              <div class="flex items-center gap-2 whitespace-nowrap shrink-0">
                <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Push Alerts</span>
                <mat-slide-toggle [checked]="true"></mat-slide-toggle>
              </div>
              
              <!-- Columns Button -->
              <button class="flex items-center gap-2 h-10 px-3.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors text-sm font-medium text-neutral-600 dark:text-neutral-300 whitespace-nowrap shrink-0">
                <mat-icon svgIcon="settings-2" class="!w-4 !h-4"></mat-icon>
                Columns
              </button>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left min-w-[1000px] border-collapse">
              <thead>
                <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">
                  <th class="py-4 px-4 w-12 text-center">
                    <input type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer">
                  </th>
                  <th class="py-4 px-4">
                    <div class="flex items-center gap-1 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200">
                      Timestamp
                      <mat-icon svgIcon="arrow-down" class="!w-3 !h-3"></mat-icon>
                    </div>
                  </th>
                  <th class="py-4 px-4">Event Type</th>
                  <th class="py-4 px-4">Action Taken</th>
                  <th class="py-4 px-4">Source IP</th>
                  <th class="py-4 px-4">Destination IP</th>
                  <th class="py-4 px-4">Severity</th>
                  <th class="py-4 px-4 w-16"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/60">
                @if (filteredLogs().length === 0) {
                  <tr>
                    <td colspan="8">
                      <div class="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
                        <img class="mb-6 h-32 max-w-[190px] dark:hidden" src="illustrations/18.svg" alt="No security events">
                        <img class="mb-6 hidden h-32 max-w-[190px] dark:block" src="illustrations/18-dark.svg" alt="No security events">
                        <h3 class="text-lg font-bold text-neutral-900 dark:text-white">
                          {{ searchQuery() || severity() ? 'No matching security events' : 'No security events yet' }}
                        </h3>
                        <p class="mt-2 max-w-md text-sm text-neutral-500 dark:text-neutral-400">
                          {{ searchQuery() || severity()
                            ? 'Try another search or clear the active filters to see more events.'
                            : 'Successful sign-ins, blocked access and other security activity will appear here.' }}
                        </p>
                        @if (searchQuery() || severity()) {
                          <button type="button" mat-stroked-button class="mt-6 !rounded-xl" (click)="clearFilters()">
                            <mat-icon svgIcon="refresh" class="icon-size-4 mr-2"></mat-icon>
                            Clear filters
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                } @else {
                 @for (log of filteredLogs(); track log.id) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors text-[13px] text-neutral-700 dark:text-neutral-300">
                    <td class="py-4 px-4 text-center">
                      <input type="checkbox" class="rounded border-neutral-300 text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer">
                    </td>
                    <td class="py-4 px-4 font-medium">{{ log.timestamp }}</td>
                    <td class="py-4 px-4">
                      <div class="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                        <mat-icon [svgIcon]="log.eventIcon" [class]="log.eventColor + ' !w-4 !h-4'"></mat-icon>
                        {{ log.eventType }}
                      </div>
                    </td>
                    <td class="py-4 px-4">{{ log.actionTaken }}</td>
                    <td class="py-4 px-4">{{ log.sourceIp }}</td>
                    <td class="py-4 px-4">{{ log.destinationIp }}</td>
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
                    <td class="py-4 px-4 text-right">
                       <button type="button" [matTooltip]="'Copy event details'" (click)="copyLog(log)" class="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">
                        <mat-icon svgIcon="clipboard-list" class="!w-4 !h-4"></mat-icon>
                      </button>
                    </td>
                   </tr>
                 }
                }
              </tbody>
            </table>
          </div>
          
          <!-- Paginator Footer -->
          <div class="flex items-center justify-between p-4 border-t border-neutral-200 dark:border-neutral-800 text-[13px] text-neutral-500">
            <div class="flex items-center gap-2">
              <span>Rows per page</span>
              <select class="border-none bg-transparent font-medium text-neutral-700 dark:text-neutral-300 focus:ring-0 cursor-pointer">
                <option>10</option>
                <option>25</option>
                <option>50</option>
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
}
