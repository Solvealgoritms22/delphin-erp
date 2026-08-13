import { Component, inject, OnInit, Inject, DOCUMENT } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommandPaletteService } from './core/command-palette/command-palette.component';
import { CookieBannerComponent } from './core/components/cookie-banner/cookie-banner.component';
import { SessionMonitorService } from './core/auth/session-monitor.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CookieBannerComponent],
  host: {
    // Ensure root component fills the entire viewport, prevents outer scrolling, and sets the top border
    class: 'flex h-full w-full flex-auto flex-col overflow-hidden border-t border-neutral-200/90 dark:border-neutral-700/80',
  },
  template: `
    <router-outlet />
    <app-cookie-banner />
  `,
})
export class App implements OnInit {
  private commandPalette = inject(CommandPaletteService);
  private document = inject(DOCUMENT);
  private sessionMonitor = inject(SessionMonitorService);

  ngOnInit() {
    this.sessionMonitor.start();
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
