import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChevronRightIcon } from 'ng-animated-icons';

export interface Breadcrumb {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [RouterLink, ChevronRightIcon],
  template: `
    <nav class="flex" aria-label="Breadcrumb">
      <ol class="flex items-center space-x-2">
        @for (item of items(); track item.label; let last = $last) {
          <li>
            <div class="flex items-center">
              @if (item.url && !last) {
                <a
                  [routerLink]="item.url"
                  class="text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                >
                  {{ item.label }}
                </a>
              } @else {
                <span class="text-sm font-medium text-neutral-900 dark:text-white">
                  {{ item.label }}
                </span>
              }

              @if (!last) {
                <i-chevron-right
                  [size]="14"
                  class="mx-1 shrink-0 text-neutral-400"
                />
              }
            </div>
          </li>
        }
      </ol>
    </nav>
  `
})
export class BreadcrumbsComponent {
  items = input.required<Breadcrumb[]>();
}
