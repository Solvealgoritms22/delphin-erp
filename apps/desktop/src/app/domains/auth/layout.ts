import { Component, inject, signal, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'auth-layout',
  imports: [CommonModule, RouterOutlet, MatButtonModule, MatIconModule],
  template: `
    <div class="relative min-h-full w-full flex flex-col border-t border-neutral-200/80 dark:border-neutral-800/80">
      @if (isElectron) {
        <!-- Frameless window top draggable bar -->
        <div class="absolute top-0 left-0 right-0 h-9 z-50 flex items-center justify-end px-3 select-none" style="-webkit-app-region: drag">
          <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
            <!-- Minimize -->
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
              (click)="windowMinimize()"
              title="Minimizar"
            >
              <mat-icon svgIcon="minus" class="icon-size-3.5 flex items-center justify-center !w-3.5 !h-3.5" />
            </button>
            <!-- Maximize / Restore -->
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white transition-colors cursor-pointer"
              (click)="windowMaximize()"
              [title]="isMaximized() ? 'Restaurar' : 'Maximizar'"
            >
              <mat-icon [svgIcon]="isMaximized() ? 'minimize-2' : 'maximize-2'" class="icon-size-3.5 flex items-center justify-center !w-3.5 !h-3.5" />
            </button>
            <!-- Close -->
            <button
              type="button"
              class="flex size-7 items-center justify-center rounded-lg text-neutral-500 hover:bg-red-500 hover:text-white dark:text-neutral-400 dark:hover:bg-red-600 dark:hover:text-white transition-colors cursor-pointer"
              (click)="windowClose()"
              title="Cerrar"
            >
              <mat-icon svgIcon="x" class="icon-size-3.5 flex items-center justify-center !w-3.5 !h-3.5" />
            </button>
          </div>
        </div>
      }
      <router-outlet />
    </div>
  `
})
export default class AuthLayout implements OnInit {
  private platformId = inject(PLATFORM_ID);
  readonly isElectron = isPlatformBrowser(this.platformId) && !!(window as any).dolphinWindow;
  readonly isMaximized = signal(false);

  ngOnInit() {
    if (this.isElectron) {
      (window as any).dolphinWindow.onMaximizeChange((maximized: boolean) => {
        this.isMaximized.set(maximized);
      });
    }
  }

  windowMinimize() { if (this.isElectron) (window as any).dolphinWindow.minimize(); }
  windowMaximize() { if (this.isElectron) (window as any).dolphinWindow.maximize(); }
  windowClose()    { if (this.isElectron) (window as any).dolphinWindow.close(); }
}
