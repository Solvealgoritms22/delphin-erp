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
} from '@/app/layout/admin/data/navigation';
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

          <div class="px-2.5 py-1.5 text-sm font-semibold text-blue-400">
             {{ section.label | transloco }}

            @if (section.description) {
              <div class="text-xs font-medium text-neutral-400">
                 {{ section.description | transloco }}
              </div>
            }
          </div>

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

          <ng-template
            let-nodes="nodes"
            let-parent="parent"
            #treeNodes
          >
            @for (node of nodes; track node.id) {
              <a
                cdkMonitorElementFocus
                ngTreeItem
                routerLinkActive="!bg-blue-50 !text-blue-600 dark:!bg-blue-950/40 dark:!text-blue-400 font-bold"
                class="group navigation-item flex cursor-pointer items-center gap-x-2.5 rounded-xl px-3 py-2 select-none text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200 text-sm"
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

                @if (node.icon) {
                  <mat-icon
                    class="pointer-events-none size-4.5 shrink-0 transition-transform duration-250 ease-out group-hover:scale-115 group-hover:-rotate-6"
                    [svgIcon]="node.icon"
                  />
                }

                <div class="flex flex-auto flex-col font-medium truncate">
                   {{ node.label | transloco }}

                  @if (node.description) {
                    <div class="text-[11px] text-neutral-400 font-normal truncate">
                       {{ node.description | transloco }}
                    </div>
                  }
                </div>

                @if (node.badge) {
                  <div
                    class="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-bold"
                  >
                    {{ node.badge }}
                  </div>
                }

                @if (node.children && node.children.length > 0) {
                  <mat-icon
                    svgIcon="chevron-right"
                    class="pointer-events-none size-4 transition-transform duration-200"
                    [class.rotate-90]="node.expanded"
                  />
                }
              </a>

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

  private router = inject(Router);

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

    effect(() => {
      const filtered = this.filterByPermission(structuredClone(NAVIGATION));
      this.navigation.set(filtered);
    });

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
