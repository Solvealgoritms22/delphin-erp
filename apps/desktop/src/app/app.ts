import { Component, inject, OnInit, OnDestroy, signal, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CommandPaletteService } from './core/command-palette/command-palette.component';
import { CookieBannerComponent } from './core/components/cookie-banner/cookie-banner.component';
import { SessionMonitorService } from './core/auth/session-monitor.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieBannerComponent],
  host: {
    class: 'flex h-full w-full flex-auto flex-col overflow-hidden bg-white dark:bg-[#09090b]',
  },
  template: `
    <router-outlet />
    <app-cookie-banner />
  `,
})
export class App implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private commandPalette = inject(CommandPaletteService);
  private document = inject(DOCUMENT);
  private sessionMonitor = inject(SessionMonitorService);
  /** Cleanup handle for the Electron maximize-change native callback */
  private electronMaximizeCleanup?: () => void;

  readonly isElectron = isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && !!(window as any).dolphinWindow;
  readonly isMaximized = signal(false);

  ngOnInit() {
    this.sessionMonitor.start();

    if (this.isElectron) {
      const handler = (maximized: boolean) => this.isMaximized.set(maximized);
      (window as any).dolphinWindow.onMaximizeChange(handler);
      this.electronMaximizeCleanup = () => {
        (window as any).dolphinWindow?.removeMaximizeListener?.(handler);
      };
    }

    // Give the splash screen a minimum display time of 1.5 seconds
    setTimeout(() => {
      const splashScreen = this.document.getElementById('splash-screen');
      if (splashScreen) {
        splashScreen.style.opacity = '0';
        splashScreen.style.transition = 'opacity 500ms ease-out';
        setTimeout(() => {
          splashScreen.remove();
        }, 500);
      }
    }, 1500);
  }

  ngOnDestroy(): void {
    this.electronMaximizeCleanup?.();
  }
}
