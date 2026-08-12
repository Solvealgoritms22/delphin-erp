import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'legal-layout',
  standalone: true,
   imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  template: `
    <div class="flex flex-col min-h-screen bg-white dark:bg-neutral-900">
      
      <!-- Simple Header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-50">
        <a routerLink="/" class="flex items-center gap-3">
          <img src="/images/logo/logo_dolphin_light.png" class="h-8 w-auto dark:hidden" alt="Dolphin ERP" />
          <img src="/images/logo/logo_dolphin_dark.png" class="h-10 w-auto hidden dark:block" alt="Dolphin ERP" />
        </a>
         <div class="text-sm text-neutral-500 font-medium">{{ 'legalPages.layoutTitle' | transloco }}</div>
      </header>

      <div class="flex flex-col md:flex-row flex-auto max-w-6xl w-full mx-auto w-full">
        <!-- Sidebar Menu -->
        <aside class="w-full md:w-64 shrink-0 py-8 px-6 md:pr-8 md:pl-0 border-r-0 md:border-r border-neutral-200 dark:border-neutral-800">
          <nav class="flex flex-col space-y-1">
            <a routerLink="terms" routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold" class="px-4 py-2.5 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
               {{ 'legalPages.terms' | transloco }}
            </a>
            <a routerLink="privacy" routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold" class="px-4 py-2.5 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
               {{ 'legalPages.privacy' | transloco }}
            </a>
            <a routerLink="cookies" routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold" class="px-4 py-2.5 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
               {{ 'legalPages.cookies' | transloco }}
            </a>
            <a routerLink="subscription" routerLinkActive="bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 font-semibold" class="px-4 py-2.5 rounded-lg text-sm text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
               {{ 'legalPages.subscription' | transloco }}
            </a>
          </nav>
        </aside>

        <!-- Main Content Content -->
        <main class="flex-auto py-8 px-6 md:pl-10">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Footer -->
      <footer class="mt-auto py-6 text-center text-sm text-neutral-500 border-t border-neutral-200 dark:border-neutral-800">
        &copy; {{ currentYear }} Dolphin ERP. {{ 'legalPages.rights' | transloco }}
      </footer>
    </div>
  `
})
export default class LegalLayoutComponent {
  currentYear = new Date().getFullYear();
}
