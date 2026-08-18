import { Component, HostListener, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SearchIcon } from 'ng-animated-icons';

export interface CommandItem {
  id: string;
  icon: string;
  label: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette-dialog',
  standalone: true,
  imports: [MatDialogModule, MatIconModule, FormsModule, SearchIcon],
  template: `
    <div class="flex flex-col bg-white dark:bg-neutral-900 rounded-xl overflow-hidden shadow-2xl ring-1 ring-black/5 max-h-[80vh]">
      <!-- Search input -->
      <div class="flex items-center border-b border-neutral-200 px-4 dark:border-neutral-800">
        <i-search [size]="18" class="text-neutral-400 mr-2" />
        <input
          type="text"
          class="w-full bg-transparent p-4 outline-none text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400"
          placeholder="Search commands..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="filterCommands()"
        />
        <div class="text-xs font-semibold text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5">
          ESC
        </div>
      </div>

      <!-- Results list -->
      <div class="overflow-y-auto p-2" style="max-height: 400px;">
        @if (filteredCommands().length > 0) {
          <div class="text-xs font-semibold text-neutral-400 px-3 py-2 uppercase tracking-wider">
            Suggestions
          </div>
          <div class="flex flex-col gap-y-1">
            @for (cmd of filteredCommands(); track cmd.id) {
              <button
                class="flex items-center w-full px-3 py-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left group"
                (click)="executeCommand(cmd)"
              >
                <mat-icon [svgIcon]="cmd.icon" class="text-neutral-500 group-hover:text-blue-500 mr-3" />
                <span class="flex-auto font-medium text-neutral-700 dark:text-neutral-200 group-hover:text-neutral-900 dark:group-hover:text-white">
                  {{ cmd.label }}
                </span>
                @if (cmd.shortcut) {
                  <span class="text-xs font-semibold text-neutral-400 border border-neutral-200 dark:border-neutral-700 rounded px-1.5 py-0.5">
                    {{ cmd.shortcut }}
                  </span>
                }
              </button>
            }
          </div>
        } @else {
          <div class="p-8 text-center text-neutral-500">
            No commands found for "{{ searchQuery() }}"
          </div>
        }
      </div>
    </div>
  `
})
export class CommandPaletteDialogComponent {
  private dialogRef = inject(MatDialogRef<CommandPaletteDialogComponent>);
  private router = inject(Router);

  searchQuery = signal('');
  
  // This would typically come from a service
  allCommands: CommandItem[] = [
    { id: 'home', icon: 'heroicons_outline:home', label: 'Go to Dashboard', action: () => this.router.navigate(['/admin']) },
    { id: 'profile', icon: 'heroicons_outline:user', label: 'Go to Profile', action: () => this.router.navigate(['/admin/profile']) },
    { id: 'settings', icon: 'heroicons_outline:cog', label: 'Settings', action: () => this.router.navigate(['/admin/settings']) },
    { id: 'signout', icon: 'heroicons_outline:logout', label: 'Sign out', action: () => this.router.navigate(['/auth/sign-in']) },
  ];

  filteredCommands = signal<CommandItem[]>(this.allCommands);

  filterCommands() {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredCommands.set(this.allCommands);
      return;
    }

    this.filteredCommands.set(
      this.allCommands.filter(c => c.label.toLowerCase().includes(query))
    );
  }

  executeCommand(cmd: CommandItem) {
    this.dialogRef.close();
    cmd.action();
  }
}

import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CommandPaletteService {
  private dialog = inject(MatDialog);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  constructor() {
    if (this.isBrowser) {
      window.addEventListener('keydown', (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          this.open();
        }
      });
    }
  }

  open() {
    this.dialog.open(CommandPaletteDialogComponent, {
      width: '600px',
      panelClass: ['!p-0', '!bg-transparent'],
      position: { top: '10vh' }
    });
  }
}
