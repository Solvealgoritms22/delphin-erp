import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { CommandPaletteService } from './core/command-palette/command-palette.component';
import { CookieBannerComponent } from './core/components/cookie-banner/cookie-banner.component';
import { SessionMonitorService } from './core/auth/session-monitor.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieBannerComponent],
  host: {
    '[class.rounded-2xl]': 'isElectron && !isMaximized()',
    '[class.border]': 'isElectron && !isMaximized()',
    '[class.border-neutral-200/90]': 'isElectron && !isMaximized()',
    '[class.dark:border-neutral-800/80]': 'isElectron && !isMaximized()',
    '[class.shadow-2xl]': 'isElectron && !isMaximized()',
    class: 'flex h-full w-full flex-auto flex-col overflow-hidden bg-white dark:bg-[#09090b]',
  },
  template: `
    <router-outlet />
    <app-cookie-banner />
  `,
})
export class App implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private commandPalette = inject(CommandPaletteService);
  private document = inject(DOCUMENT);
  private sessionMonitor = inject(SessionMonitorService);

  readonly isElectron = isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && !!(window as any).dolphinWindow;
  readonly isMaximized = signal(false);

  ngOnInit() {
    this.sessionMonitor.start();

    if (this.isElectron) {
      (window as any).dolphinWindow.onMaximizeChange((maximized: boolean) => {
        this.isMaximized.set(maximized);
      });
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
}
