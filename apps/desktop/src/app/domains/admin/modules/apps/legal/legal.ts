import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-admin-legal',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <div class="shrink-0 flex flex-col gap-5 px-6 pt-6 sm:px-10 sm:pt-8 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ 'legalPages.layoutTitle' | transloco }}
          </h1>
          <p class="text-sm text-neutral-500 mt-0.5">
            {{ 'legalPages.description' | transloco }}
          </p>
        </div>

        <nav class="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar -mb-px">
          @for (tab of tabs; track tab.route) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400 font-semibold"
              [routerLinkActiveOptions]="{ exact: false }"
              class="px-4 py-3 border-b-2 border-transparent text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              {{ tab.labelKey | transloco }}
            </a>
          }
        </nav>
      </div>

      <div class="flex-auto min-h-0 overflow-y-auto px-6 sm:px-10 py-8 pb-20">
        <div class="max-w-4xl mx-auto bg-neutral-50/50 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-10 shadow-xs">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
})
export default class AdminLegalComponent {
  tabs = [
    { route: 'terms', labelKey: 'legalPages.terms' },
    { route: 'privacy', labelKey: 'legalPages.privacy' },
    { route: 'cookies', labelKey: 'legalPages.cookies' },
    { route: 'subscription', labelKey: 'legalPages.subscription' },
  ];
}
