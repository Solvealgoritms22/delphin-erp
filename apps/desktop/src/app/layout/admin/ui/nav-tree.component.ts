import { Component, computed, inject, input, signal, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  isActive,
  IsActiveMatchOptions,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { filter } from 'rxjs';
import {
  NAVIGATION,
  NavigationItem,
} from '@layout/admin/data/navigation';
import { PermissionService } from '@core/permissions/permission.service';

@Component({
  selector: 'navigation',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatIcon,
    RouterLinkActive,
    RouterLink,
    TranslocoPipe,
  ],
  template: `
    <nav class="flex flex-col gap-y-1 px-3.5 select-none" aria-label="Sidebar navigation">
      @if (searchQuery() && filteredNavigation().length === 0) {
        <div class="flex flex-col items-center justify-center px-4 py-8 text-center">
          <img
            class="max-h-[120px] w-auto select-none pointer-events-none drop-shadow-xs mb-3"
            alt="No se encontraron módulos"
            src="illustrations/1.svg"
          />
          <div class="text-sm font-semibold text-neutral-900 dark:text-white">
            Sin resultados para "{{ searchQuery() }}"
          </div>
          <div class="mt-1 max-w-[200px] text-xs text-neutral-500 dark:text-neutral-400">
            Intenta con otro término o explora las categorías del menú.
          </div>
        </div>
      }

      @for (section of filteredNavigation(); track section.id) {
        <div class="flex flex-col">
          @if (section.children && section.children.length > 0) {
            <!-- Collapsible Parent Category Item -->
            <button
              type="button"
              (click)="toggleSection(section)"
              class="group/section flex w-full cursor-pointer items-center justify-between gap-x-2.5 rounded-xl px-3 py-2 text-left select-none text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-all duration-150"
              [class.!text-blue-600]="isSectionActive(section)"
              [class.dark:!text-blue-400]="isSectionActive(section)"
              [class.font-semibold]="isSectionActive(section)"
            >
              <div class="flex items-center gap-x-2.5 min-w-0">
                @if (section.icon) {
                  <mat-icon
                    class="pointer-events-none size-4.5 shrink-0 text-neutral-500 dark:text-neutral-400 transition-colors group-hover/section:text-neutral-900 dark:group-hover/section:text-white"
                    [class.!text-blue-600]="isSectionActive(section)"
                    [class.dark:!text-blue-400]="isSectionActive(section)"
                    [svgIcon]="section.icon"
                  />
                }
                <span class="truncate text-[13.5px] font-medium tracking-tight">
                  {{ section.label | transloco }}
                </span>
              </div>

              <mat-icon
                svgIcon="chevron-down"
                class="pointer-events-none size-4 shrink-0 text-neutral-400 dark:text-neutral-500 transition-transform duration-200"
                [class.rotate-180]="section.expanded"
              />
            </button>

            <!-- Submenu Container with Tree Connector Guide Line -->
            <div
              class="grid transition-[grid-template-rows,opacity] duration-200 ease-out"
              [class.grid-rows-[1fr]]="section.expanded"
              [class.opacity-100]="section.expanded"
              [class.grid-rows-[0fr]]="!section.expanded"
              [class.opacity-0]="!section.expanded"
            >
              <div class="overflow-hidden">
                <div class="relative ml-5.5 pl-3.5 flex flex-col gap-y-0.5 pt-1 pb-1.5">
                  <!-- Vertical Tree Spine Guide Line -->
                  <div class="absolute left-0 top-2 bottom-3 w-[1.5px] bg-neutral-200/90 dark:bg-neutral-800/80 rounded-full"></div>

                  @for (child of section.children; track child.id) {
                    <div class="relative flex items-center group/branch">
                      <!-- Curved Branch Elbow Connecting Line -->
                      <span class="absolute -left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-[1.5px] bg-neutral-200/90 dark:bg-neutral-800/80 group-hover/branch:bg-blue-500/60 transition-colors rounded-full"></span>

                      <a
                        [routerLink]="child.route"
                        [routerLinkActiveOptions]="child.activeOptions ?? { exact: false }"
                        routerLinkActive="!text-blue-600 dark:!text-blue-400 !font-semibold !bg-blue-500/10 dark:!bg-blue-500/15 shadow-2xs"
                        class="flex-1 flex items-center justify-between py-1.5 px-3 rounded-lg text-[13px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50 transition-all select-none"
                      >
                        <span class="truncate">{{ child.label | transloco }}</span>
                        @if (child.badge) {
                          <span class="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 text-[9.5px] font-bold">
                            {{ child.badge }}
                          </span>
                        }
                      </a>
                    </div>
                  }
                </div>
              </div>
            </div>
          } @else {
            <!-- Single Direct Top-Level Route Item -->
            <a
              [routerLink]="section.route"
              [routerLinkActiveOptions]="section.activeOptions ?? { exact: false }"
              routerLinkActive="!text-blue-600 dark:!text-blue-400 !font-semibold !bg-blue-500/10 dark:!bg-blue-500/15"
              class="group flex w-full cursor-pointer items-center justify-between gap-x-2.5 rounded-xl px-3 py-2 text-left select-none text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-all duration-150 text-[13.5px] font-medium"
            >
              <div class="flex items-center gap-x-2.5 min-w-0">
                @if (section.icon) {
                  <mat-icon
                    class="pointer-events-none size-4.5 shrink-0 text-neutral-500 dark:text-neutral-400 transition-colors group-hover:text-neutral-900 dark:group-hover:text-white"
                    [svgIcon]="section.icon"
                  />
                }
                <span class="truncate">
                  {{ section.label | transloco }}
                </span>
              </div>
              @if (section.badge) {
                <span class="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.2 text-[9.5px] font-bold">
                  {{ section.badge }}
                </span>
              }
            </a>
          }
        </div>
      }
    </nav>
  `,
})
export class Navigation {
  private router = inject(Router);
  private permissionService = inject(PermissionService);
  private transloco = inject(TranslocoService);
  private destroyRef = inject(DestroyRef);

  searchQuery = input('');
  protected navigation = signal<NavigationItem[]>([]);

  protected filteredNavigation = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.navigation();
    }
    return this.filterBySearch(this.navigation(), query);
  });

  constructor() {
    const initialNav = this.filterByPermission(structuredClone(NAVIGATION));
    this.navigation.set(this.expandActiveRoute(initialNav));

    // Listen to route changes to auto-expand active sections
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.navigation.update((items) => this.expandActiveRoute(items));
      });
  }

  toggleSection(section: NavigationItem): void {
    this.navigation.update((items) =>
      items.map((item) => {
        if (item.id === section.id) {
          return { ...item, expanded: !item.expanded };
        }
        return item;
      })
    );
  }

  isSectionActive(section: NavigationItem): boolean {
    if (!section.children) return false;
    return section.children.some((child) => {
      if (!child.route) return false;
      return isActive(
        child.route,
        this.router,
        this.isActiveOption(child.activeOptions ?? { exact: false })
      )();
    });
  }

  private filterByPermission(items: NavigationItem[]): NavigationItem[] {
    return items.filter((item) => {
      if (item.requiredPermission && !this.permissionService.hasPermission(item.requiredPermission)) {
        return false;
      }
      if (item.children) {
        item.children = this.filterByPermission(item.children);
        if (item.children.length === 0 && item.id.includes('/')) {
          return false;
        }
      }
      return true;
    });
  }

  private filterBySearch(items: NavigationItem[], query: string): NavigationItem[] {
    return items.reduce<NavigationItem[]>((result, item) => {
      const haystack = [
        this.transloco.translate(item.label),
        this.transloco.translate(item.description || ''),
        item.route,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (haystack.includes(query)) {
        result.push({ ...item, expanded: true });
        return result;
      }

      if (item.children?.length) {
        const filteredChildren = this.filterBySearch(item.children, query);
        if (filteredChildren.length > 0) {
          result.push({ ...item, children: filteredChildren, expanded: true });
        }
      }

      return result;
    }, []);
  }

  expandActiveRoute(items: NavigationItem[]): NavigationItem[] {
    return items.map((item) => {
      let isChildActive = false;
      if (item.children?.length) {
        item.children = this.expandActiveRoute(item.children);
        isChildActive = item.children.some((child) => {
          if (!child.route) return false;
          return isActive(
            child.route,
            this.router,
            this.isActiveOption(child.activeOptions ?? { exact: false })
          )();
        });
      }

      const isCurrentActive =
        item.route &&
        isActive(
          item.route,
          this.router,
          this.isActiveOption(item.activeOptions ?? { exact: false })
        )();

      return {
        ...item,
        expanded: item.expanded || isChildActive || isCurrentActive || false,
      };
    });
  }

  isActiveOption(
    options: { exact: boolean } | IsActiveMatchOptions
  ): IsActiveMatchOptions {
    if ('exact' in options) {
      return options.exact
        ? {
            paths: 'exact',
            queryParams: 'exact',
            fragment: 'ignored',
            matrixParams: 'ignored',
          }
        : {
            paths: 'subset',
            queryParams: 'subset',
            fragment: 'ignored',
            matrixParams: 'ignored',
          };
    }

    return options;
  }
}
