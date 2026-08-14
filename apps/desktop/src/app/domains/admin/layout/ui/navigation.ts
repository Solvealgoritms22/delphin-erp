import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { CdkMonitorFocus } from '@angular/cdk/a11y';
import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { filter, take } from 'rxjs';
import {
  NAVIGATION,
  NavigationItem,
} from '@/app/domains/admin/layout/data/navigation';
import { PermissionService } from '@/app/core/permissions/permission.service';

@Component({
  selector: 'navigation',
  imports: [
    MatIcon,
    NgTemplateOutlet,
    RouterLinkActive,
    Tree,
    TreeItem,
    TreeItemGroup,
    RouterLink,
    CdkMonitorFocus,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col gap-y-4">
      @if (searchQuery() && filteredNavigation().length === 0) {
        <!-- Empty search result -->
        <div class="flex flex-col items-center justify-center px-6 py-10 text-center">
          <img
            class="max-h-[120px] w-auto select-none pointer-events-none drop-shadow-xs"
            alt="No se encontraron módulos"
            src="illustrations/1.svg"
          />
          <div class="mt-4 text-base font-semibold text-neutral-900 dark:text-white">
            Sin resultados para "{{ searchQuery() }}"
          </div>
          <div class="mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
            Intenta con otro término o explora las secciones del menú.
          </div>
        </div>
      }

      @for (section of filteredNavigation(); track section.id) {
        <div class="flex flex-col px-4">
          <!-- Section title -->
          <div class="px-2.5 py-1.5 text-sm font-semibold text-blue-400">
             {{ section.label | transloco }}

            <!-- Section description -->
            @if (section.description) {
              <div class="text-xs font-medium text-neutral-400">
                 {{ section.description | transloco }}
              </div>
            }
          </div>

          <!-- Section content -->
          <ul
            ngTree
            class="mt-1 flex flex-col gap-y-1"
            [nav]="true"
            #tree="ngTree"
          >
            <ng-template
              [ngTemplateOutlet]="treeNodes"
              [ngTemplateOutletContext]="{
                nodes: section.children,
                parent: tree,
              }"
            />
          </ul>

          <!-- Menu item -->
          <ng-template
            let-nodes="nodes"
            let-parent="parent"
            #treeNodes
          >
            @for (node of nodes; track node.id) {
              <a
                cdkMonitorElementFocus
                ngTreeItem
                routerLinkActive="bg-neutral-700/10 dark:bg-neutral-300/10"
                class="navigation-item flex cursor-pointer items-center gap-x-2 rounded-lg px-2.5 py-2 select-none hover:bg-neutral-700/10 dark:hover:bg-neutral-300/10"
                [parent]="parent"
                [value]="node.id"
                 [label]="node.label | transloco"
                [disabled]="node.disabled"
                [selectable]="!node.children"
                [(expanded)]="node.expanded"
                [routerLink]="node.route"
                [routerLinkActiveOptions]="
                  node.activeOptions ?? { exact: true }
                "
                (click)="$event.preventDefault()"
                #rla="routerLinkActive"
                #treeItem="ngTreeItem"
              >
                <!-- Icon -->
                @if (node.icon) {
                  <mat-icon
                    class="pointer-events-none size-4"
                    [svgIcon]="node.icon"
                  />
                }

                <!-- Label -->
                <div class="flex flex-auto flex-col font-medium">
                   {{ node.label | transloco }}

                  <!-- Description -->
                  @if (node.description) {
                    <div class="text-xs">
                       {{ node.description | transloco }}
                    </div>
                  }
                </div>

                <!-- Badge -->
                @if (node.badge) {
                  <div
                    class="rounded bg-pink-400 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-pink-700"
                  >
                    {{ node.badge }}
                  </div>
                }

                <!-- Expand icon -->
                @if (node.children && node.children.length > 0) {
                  <mat-icon
                    svgIcon="chevron-right"
                    class="pointer-events-none size-4 transition-[rotate]"
                    [class.rotate-90]="node.expanded"
                  />
                }
              </a>

              <!-- Children -->
              @if (node.children && node.children.length > 0) {
                <ul
                  class="flex flex-col gap-y-1 [&_ul>.navigation-item]:pl-14.5 [&>.navigation-item]:pl-8.5"
                  [class.hidden]="!node.expanded"
                  [class.mt-1]="node.expanded"
                  role="group"
                >
                  <ng-template
                    ngTreeItemGroup
                    [ownedBy]="treeItem"
                    #group="ngTreeItemGroup"
                  >
                    <ng-template
                      [ngTemplateOutlet]="treeNodes"
                      [ngTemplateOutletContext]="{
                        nodes: node.children,
                        parent: group,
                      }"
                    />
                  </ng-template>
                </ul>
              }
            }
          </ng-template>
        </div>
      }
    </div>
  `,
})
export class Navigation {
  // Dependencies
  private router = inject(Router);

  // State
  protected navigation = signal<NavigationItem[]>([]);
  searchQuery = input('');
  protected navigationEnd = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      take(1)
    )
  );

  private permissionService = inject(PermissionService);
  private transloco = inject(TranslocoService);

  protected filteredNavigation = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      return this.navigation();
    }
    return this.filterBySearch(this.navigation(), query);
  });

  constructor() {
    // Update navigation when auth state changes
    effect(() => {
      const filtered = this.filterByPermission(structuredClone(NAVIGATION));
      this.navigation.set(filtered);
    });

    // Expand active route on initial load
    effect(() => {
      const navigationEnd = this.navigationEnd();
      if (!navigationEnd) {
        return;
      }

      this.navigation.set(this.expandActiveRoute(this.navigation()));
    }, { allowSignalWrites: true });
  }

  private filterByPermission(items: NavigationItem[]): NavigationItem[] {
    return items.filter(item => {
      if (item.requiredPermission && !this.permissionService.hasPermission(item.requiredPermission)) {
        return false;
      }
      if (item.children) {
        item.children = this.filterByPermission(item.children);
        // If it's a section or group and has no children after filtering, we might want to hide it, 
        // but let's keep it simple and just filter out the children.
        if (item.children.length === 0 && item.id.includes('/')) {
           return false; // hide empty groups
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
        result.push(item);
        return result;
      }

      if (item.children?.length) {
        const filteredChildren = this.filterBySearch(item.children, query);
        if (filteredChildren.length > 0) {
          result.push({ ...item, children: filteredChildren });
        }
      }

      return result;
    }, []);
  }

  /**
   * Expand all parent routes of the active route.
   * @param items
   */
  expandActiveRoute(items: NavigationItem[]): NavigationItem[] {
    for (const item of items) {
      if (item.children?.length) {
        item.children = this.expandActiveRoute(item.children);

        if (item.children.some((child) => child.expanded)) {
          item.expanded = true;
        }
      }

      if (
        item.route &&
        isActive(
          item.route,
          this.router,
          this.isActiveOption(item.activeOptions ?? { exact: true })
        )()
      ) {
        item.expanded = true;
      }
    }
    return items;
  }

  /**
   * Convert simple exact option to full IsActiveMatchOptions.
   * @param options
   */
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
