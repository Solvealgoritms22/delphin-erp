import { Component, inject, signal, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'auth-layout',
  imports: [CommonModule, RouterOutlet, MatButtonModule, MatIconModule],
  template: `
    <div class="relative min-h-screen flex flex-col">
      @if (isElectron) {
        <!-- Frameless window top draggable bar -->
        <div class="absolute top-0 left-0 right-0 h-9 z-50 flex items-center justify-end px-2" style="-webkit-app-region: drag">
          <div class="flex items-center gap-0.5" style="-webkit-app-region: no-drag">
            <!-- Minimize -->
            <button
              matIconButton
              class="!w-7 !h-7 !min-w-0 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-md"
              (click)="windowMinimize()"
              title="Minimizar"
            >
              <mat-icon svgIcon="minus" class="icon-size-3.5 text-neutral-600 dark:text-neutral-300" />
            </button>
            <!-- Maximize / Restore -->
            <button
              matIconButton
              class="!w-7 !h-7 !min-w-0 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-md"
              (click)="windowMaximize()"
              [title]="isMaximized() ? 'Restaurar' : 'Maximizar'"
            >
              <mat-icon [svgIcon]="isMaximized() ? 'minimize-2' : 'maximize-2'" class="icon-size-3.5 text-neutral-600 dark:text-neutral-300" />
            </button>
            <!-- Close -->
            <button
              matIconButton
              class="!w-7 !h-7 !min-w-0 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 rounded-md"
              (click)="windowClose()"
              title="Cerrar"
            >
              <mat-icon svgIcon="x" class="icon-size-3.5 text-neutral-600 dark:text-neutral-300" />
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
