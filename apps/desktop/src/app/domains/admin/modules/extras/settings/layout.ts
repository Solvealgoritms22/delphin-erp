import { Component, inject } from '@angular/core';
import { MatFormField } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

@Component({
  selector: 'settings-layout',
  imports: [
    RouterOutlet,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    RouterLink,
    RouterLinkActive,
    MatFormField,
    MatSelect,
    MatOption,
  ],
  template: `
    <div
      class="@container flex h-full w-full flex-col bg-white dark:bg-neutral-900 overflow-hidden"
    >
      <!-- Header & Tabs (Pinned) -->
      <div class="shrink-0 flex flex-col gap-4 px-6 pt-6 sm:gap-4 lg:px-8 lg:pt-8 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex items-center justify-between gap-x-3">
          <div class="text-xl font-semibold tracking-tighter sm:text-2xl">
            Settings
          </div>
        </div>

        <!-- Tabs -->
        <nav
          class="hidden sm:flex -mb-px"
          mat-tab-nav-bar
          [mat-stretch-tabs]="false"
          [tabPanel]="tabPanel"
          ngSkipHydration
        >
          @for (link of links; track link.id) {
            <a
              mat-tab-link
              routerLinkActive
              [routerLink]="link.route"
              [active]="rla.isActive"
              #rla="routerLinkActive"
            >
              {{ link.label }}
            </a>
          }
        </nav>

        <!-- Mobile navigation -->
        <mat-form-field class="mb-2 w-full sm:hidden">
          <mat-select
            [value]="router.url"
            (selectionChange)="router.navigateByUrl($event.value)"
            #select
          >
            @for (link of links; track link.id) {
              <mat-option [value]="link.route">{{ link.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Tab panel (Central Scroll) -->
      <mat-tab-nav-panel #tabPanel class="relative flex-auto min-h-0 overflow-y-auto p-6 lg:px-8 lg:py-8 pb-16">
        <router-outlet />
      </mat-tab-nav-panel>
    </div>
  `,
})
export default class SettingsLayout {
  // Dependencies
  protected router = inject(Router);

  // State
  protected links = [
    {
      id: 'account',
      label: 'Account',
      route: '/admin/settings/account',
    },
    {
      id: 'security',
      label: 'Security',
      route: '/admin/settings/security',
    },
    {
      id: 'plan-and-billing',
      label: 'Plan and Billing',
      route: '/admin/settings/plan-and-billing',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      route: '/admin/settings/notifications',
    },
    {
      id: 'team',
      label: 'Team',
      route: '/admin/settings/team',
    },
  ];
}
