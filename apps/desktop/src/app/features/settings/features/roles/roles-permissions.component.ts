import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, inject, TemplateRef, ViewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RolesService, Role } from '../../data/roles';
import { UsersService, User } from '../../data/users';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PlusIcon, ArrowRightIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, AwardIcon, XIcon } from 'ng-animated-icons';

export type PermissionModule = {
  id: string;
  name: string;
  nameKey: string;
  slug: string;
  description: string;
  descKey: string;
  icon: string;
}

export type RolePermissions = {
  [moduleSlug: string]: { read: boolean; write: boolean; delete: boolean };
}

@Component({
  selector: 'app-roles',
  standalone: true,
  host: {
    class: 'flex flex-col flex-auto min-w-0 h-full overflow-hidden',
  },
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    EmptyStateComponent,
    TranslocoPipe,
    PlusIcon,
    ArrowRightIcon,
    SearchIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckIcon,
    AwardIcon,
    XIcon,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full bg-white dark:bg-neutral-900 overflow-hidden">

      <div class="shrink-0 flex w-full flex-col px-6 pt-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
         <div class="flex items-center justify-between w-full mb-6">
           <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ 'roles.title' | transloco }}</h1>
              <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'roles.description' | transloco }}</p>
           </div>

          <button (click)="openRoleModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm align-center flex items-center gap-2 cursor-pointer">
            <i-plus [size]="16" />
             {{ 'roles.create' | transloco }}
          </button>
        </div>
      </div>

      <div class="flex-auto min-h-0 overflow-y-auto px-6 sm:px-10 py-8 pb-16">

        <div class="w-full">
          @if (roles().length > 0) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

              @for (role of roles(); track role.id) {

                <div class="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-6 flex flex-col gap-4 border border-transparent dark:border-neutral-700/50 shadow-sm relative group">
                  <h3 class="text-base font-bold text-neutral-900 dark:text-white">{{ role.nombre }}</h3>
                   <p class="text-sm text-neutral-500 dark:text-neutral-400 min-h-[40px] leading-relaxed">{{ role.descripcion || ('roles.defaultDescription' | transloco) }}</p>

                  <div class="flex justify-between items-center mt-auto pt-2">
                    <div class="flex items-center -space-x-1.5 min-h-[28px]">
                      @for (acc of getRoleAccounts(role.id).slice(0, 4); track acc.id) {
                        @if (acc.avatar) {
                          <img class="w-7 h-7 rounded-full border-2 border-white dark:border-neutral-800 object-cover shadow-xs" [src]="acc.avatar" [alt]="acc.name || acc.email" [title]="acc.name || acc.email">
                        } @else {
                          <div class="w-7 h-7 rounded-full border-2 border-white dark:border-neutral-800 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-[10px] shrink-0 shadow-xs" [title]="acc.name || acc.email">
                            {{ (acc.name || acc.email).charAt(0).toUpperCase() }}
                          </div>
                        }
                      }
                      @if (getRoleUsersCount(role.id) > 4) {
                        <div class="w-7 h-7 rounded-full border-2 border-white dark:border-neutral-800 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center text-[10px] font-bold z-10">
                          +{{ getRoleUsersCount(role.id) - 4 }}
                        </div>
                      }
                      @if (getRoleUsersCount(role.id) === 0) {
                        <span class="text-xs text-neutral-400 dark:text-neutral-500 italic">0 {{ 'roles.members' | transloco }}</span>
                      }
                    </div>
                    <button (click)="openRoleModal(role)" class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer">
                       {{ 'roles.edit' | transloco }} <i-arrow-right [size]="14" />
                    </button>
                  </div>
                </div>
              }

            </div>
          } @else {
            <app-empty-state
              type="no-data"
               [title]="'roles.emptyTitle' | transloco"
               [description]="'roles.emptyDescription' | transloco"
               [actionLabel]="'roles.create' | transloco"
              (action)="openRoleModal()"
            />
          }
        </div>

        <div class="px-6 sm:px-10 w-full mt-14 pb-12 flex flex-col gap-6">
           <h2 class="text-xl font-bold text-neutral-900 dark:text-white">{{ 'roles.accounts' | transloco }}</h2>

          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="relative w-full sm:w-72 flex-auto sm:flex-initial">
              <i-search [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input type="text" [placeholder]="'common.search' | transloco" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500">
            </div>

            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">

              <div class="relative flex-auto sm:flex-initial">
                <button [matMenuTriggerFor]="statusMenu" class="w-full sm:w-auto min-w-[165px] bg-neutral-50 dark:bg-neutral-800 border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between gap-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 whitespace-nowrap cursor-pointer">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full shrink-0" [ngClass]="statusFilter() === 'Active' ? 'bg-emerald-500' : (statusFilter() === 'Inactive' ? 'bg-neutral-500' : 'bg-blue-500')"></div>
                    <span>{{ (statusFilter() === 'All' ? 'roles.allStatus' : (statusFilter() === 'Active' ? 'common.active' : 'common.inactive')) | transloco }}</span>
                  </div>
                  <i-chevron-down [size]="16" class="text-neutral-500 shrink-0 ml-1" />
                </button>
                <mat-menu #statusMenu="matMenu">
                  <button mat-menu-item (click)="statusFilter.set('All')">{{ 'roles.allStatus' | transloco }}</button>
                  <button mat-menu-item (click)="statusFilter.set('Active')">{{ 'common.active' | transloco }}</button>
                  <button mat-menu-item (click)="statusFilter.set('Inactive')">{{ 'common.inactive' | transloco }}</button>
                </mat-menu>
              </div>

              <div class="relative flex-auto sm:flex-initial">
                <button [matMenuTriggerFor]="roleFilterMenu" class="w-full sm:w-auto min-w-[165px] bg-neutral-50 dark:bg-neutral-800 border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between gap-3 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 whitespace-nowrap cursor-pointer">
                  <span class="truncate pr-1">{{ getSelectedRoleName() }}</span>
                  <i-chevron-down [size]="16" class="text-neutral-500 shrink-0 ml-1" />
                </button>
                <mat-menu #roleFilterMenu="matMenu">
                  <button mat-menu-item (click)="roleFilter.set('All')">{{ 'roles.allRoles' | transloco }}</button>
                  @for (r of roles(); track r.id) {
                    <button mat-menu-item (click)="roleFilter.set(r.id)">{{ r.nombre }}</button>
                  }
                </mat-menu>
              </div>
            </div>
          </div>

          <div class="overflow-x-auto -mx-6 sm:-mx-10 px-6 sm:px-10 pb-4">
            <table class="w-full text-left min-w-[800px]">
              <thead>
                <tr class="border-b border-neutral-100 dark:border-neutral-800 select-none">
                  <th class="py-4 pl-0 pr-4 w-12 cursor-pointer" (click)="toggleAllAccounts()">
                    @if (isAllAccountsSelected()) {
                      <div class="w-4 h-4 rounded-[4px] bg-blue-500 border border-blue-500 flex items-center justify-center text-white mx-auto shadow-sm">
                        <i-check [size]="12" />
                      </div>
                    } @else {
                      <div class="w-4 h-4 rounded-[4px] border-2 border-neutral-200 dark:border-neutral-700 mx-auto"></div>
                    }
                  </th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">{{ 'common.name' | transloco }} <i-chevron-down [size]="14" class="ml-1 text-neutral-400 dark:text-neutral-500" /></div></th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">{{ 'common.status' | transloco }} <i-chevron-down [size]="14" class="ml-1 text-neutral-400 dark:text-neutral-500" /></div></th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">{{ 'common.lastOnline' | transloco }} <i-chevron-down [size]="14" class="ml-1 text-neutral-400 dark:text-neutral-500" /></div></th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">{{ 'common.role' | transloco }} <i-chevron-down [size]="14" class="ml-1 text-neutral-400 dark:text-neutral-500" /></div></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">

                @for (account of filteredAccounts(); track account.id) {

                  <tr class="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors cursor-default">
                    <td class="py-4 pl-0 pr-4 cursor-pointer" (click)="toggleAccountSelection(account.id)">
                      @if (isAccountSelected(account.id)) {
                        <div class="w-4 h-4 rounded-[4px] bg-blue-500 border border-blue-500 flex items-center justify-center text-white mx-auto shadow-sm">
                          <i-check [size]="12" />
                        </div>
                      } @else {
                        <div class="w-4 h-4 rounded-[4px] border-2 border-neutral-200 dark:border-neutral-700 mx-auto"></div>
                      }
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex items-center gap-3">
                        @if (account.avatar) {
                          <img class="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover" [src]="account.avatar" alt="">
                        } @else {
                          <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm shrink-0">
                            {{ (account.name || account.email).charAt(0).toUpperCase() }}
                          </div>
                        }
                        <div class="flex flex-col">
                          <span class="text-sm font-bold text-neutral-900 dark:text-white leading-none mb-1">{{ account.name || account.email.split('@')[0] }}</span>
                          <span class="text-xs text-neutral-500 dark:text-neutral-400 leading-none">{{ account.email }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full" [ngClass]="account.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'"></div>
                        <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">{{ (account.estado === 'ACTIVO' ? 'common.active' : 'common.inactive') | transloco }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-neutral-900 dark:text-white leading-none mb-1">{{ account.lastOnlineDate || ('common.never' | transloco) }}</span>
                        <span class="text-xs text-neutral-500 dark:text-neutral-400 leading-none">{{ account.lastOnlineTime || '' }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      @if (account.isOwner) {
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs border border-neutral-200 dark:border-neutral-700">
                          <i-award [size]="14" class="text-amber-500 dark:text-amber-400" />
                          {{ 'roles.owner' | transloco }}
                        </span>
                      } @else {

                        <button [matMenuTriggerFor]="roleMenu" class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer">
                          {{ getRoleName(account.roleId) }} <i-chevron-down [size]="12" class="text-neutral-500 dark:text-neutral-400" />
                        </button>

                        <mat-menu #roleMenu="matMenu">
                          @for (role of roles(); track role.id) {
                            <button mat-menu-item (click)="changeAccountRole(account.id, role.id)">
                              {{ role.nombre }}
                            </button>
                          }
                        </mat-menu>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="py-12">
                      <app-empty-state
                        icon="users"
                        [title]="'roles.noAccountsFound' | transloco"
                        [description]="'roles.noAccountsFoundDesc' | transloco"
                        [actionLabel]="'roles.clearFilters' | transloco"
                        (actionClick)="clearFilters()">
                      </app-empty-state>
                    </td>
                  </tr>
                }

              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between px-6 py-4 border-t border-neutral-100 dark:border-neutral-800">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Rows per page:</span>
              <button class="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer">
                10 <i-chevron-down [size]="14" class="text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>
            <div class="flex items-center gap-6">
              <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">1 - 3 of 3</span>
              <div class="flex items-center gap-1">
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer">
                  <i-chevron-left [size]="16" />
                </button>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer">
                  <i-chevron-right [size]="16" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ng-template #roleModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh] overflow-hidden">

          <div class="flex items-center justify-between px-8 py-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
              {{ editingRole ? ('roles.editRole' | transloco) : ('roles.createRole' | transloco) }}
            </h2>
            <button (click)="closeRoleModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer">
              <i-x [size]="16" />
            </button>
          </div>

          <div class="p-8 flex flex-col gap-8 overflow-y-auto flex-1 max-h-[calc(85vh-140px)]">

            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-neutral-500">{{ 'roles.roleName' | transloco }}</label>
                <input
                  type="text"
                  [(ngModel)]="modalRoleData.name"
                  placeholder="Supervisor de Ventas, Administrador, Cajero..."
                  class="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white placeholder:font-normal placeholder:text-neutral-400 outline-none transition-colors"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-neutral-500">{{ 'roles.roleDescription' | transloco }}</label>
                <textarea
                  [(ngModel)]="modalRoleData.description"
                  rows="3"
                  placeholder="Describe brevemente las funciones y responsabilidades de este rol..."
                  class="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white placeholder:font-normal placeholder:text-neutral-400 outline-none resize-none transition-colors"
                ></textarea>
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-sm font-bold text-neutral-500">{{ 'roles.permissionsAssignment' | transloco }}</h3>
                <div class="relative">
                  <i-search [size]="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    [value]="permissionsSearch()"
                    (input)="permissionsSearch.set($any($event.target).value)"
                    [placeholder]="'roles.searchModulePlaceholder' | transloco"
                    class="w-52 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 py-1.5 pl-8 pr-3 text-xs font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                  @if (permissionsSearch()) {
                    <button
                      type="button"
                      (click)="permissionsSearch.set('')"
                      class="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    >
                      <i-x [size]="12" />
                    </button>
                  }
                </div>
              </div>

              <div class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 border-b border-neutral-100 dark:border-neutral-800">

                @for (mod of filteredPermissionModules(); track mod.id) {

                  <div class="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-4">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <mat-icon [svgIcon]="mod.icon" class="icon-size-6"></mat-icon>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-base font-bold text-neutral-900 dark:text-white leading-tight mb-0.5">{{ mod.nameKey | transloco }}</span>
                        <span class="text-sm text-neutral-500">{{ mod.descKey | transloco }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
                      <button (click)="togglePermission(mod.slug, 'read')" [ngClass]="getPermissionClass(mod.slug, 'read')" class="px-4 py-1.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer">
                        @if(modalRoleData.permissions[mod.slug]?.read){<i-check [size]="14" />} {{ 'roles.read' | transloco }}
                      </button>
                      <button (click)="togglePermission(mod.slug, 'write')" [ngClass]="getPermissionClass(mod.slug, 'write')" class="px-4 py-1.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer">
                        @if(modalRoleData.permissions[mod.slug]?.write){<i-check [size]="14" />} {{ 'roles.write' | transloco }}
                      </button>
                      <button (click)="togglePermission(mod.slug, 'delete')" [ngClass]="getPermissionClass(mod.slug, 'delete')" class="px-4 py-1.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-colors cursor-pointer">
                        @if(modalRoleData.permissions[mod.slug]?.delete){<i-check [size]="14" />} {{ 'roles.delete' | transloco }}
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="flex flex-col items-center justify-center py-10 gap-2">
                    <div class="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                      <i-search [size]="20" class="text-neutral-400" />
                    </div>
                    <p class="text-sm font-semibold text-neutral-900 dark:text-white">{{ 'common.noResults' | transloco }}</p>
                    <p class="text-xs text-neutral-500 dark:text-neutral-400">Ningún módulo coincide con "{{ permissionsSearch() }}"</p>
                    <button
                      type="button"
                      (click)="permissionsSearch.set('')"
                      class="mt-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >{{ 'common.clear' | transloco }}</button>
                  </div>
                }

              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 px-8 py-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
            <button type="button" (click)="closeRoleModal()" class="px-6 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer">{{ 'common.cancel' | transloco }}</button>
            <button type="button" (click)="saveRole()" [disabled]="isSaving()" class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold px-7 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2 cursor-pointer">
              <mat-icon svgIcon="save" class="icon-size-4 mr-0.5"></mat-icon>
              {{ (isSaving() ? 'roles.saving' : (editingRole ? 'roles.saveRole' : 'roles.create')) | transloco }}
            </button>
          </div>

        </div>
      </ng-template>

    </div>
  `,
})
export class RolesComponent implements OnInit {

  rolesService = inject(RolesService);
  usersService = inject(UsersService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  transloco = inject(TranslocoService);
  private destroyRef = inject(DestroyRef);

  @ViewChild('roleModalTemplate') roleModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  roles = this.rolesService.roles;
  accounts = this.usersService.users;

  searchQuery = signal('');
  statusFilter = signal<string>('All');
  roleFilter = signal<string>('All');
  permissionsSearch = signal('');
  isSaving = signal(false);

  filteredPermissionModules = computed(() => {
    const q = this.permissionsSearch().toLowerCase().trim();
    if (!q) return this.permissionModules;
    return this.permissionModules.filter((m) => {
      const name = this.transloco.translate(m.nameKey) || m.name;
      const desc = this.transloco.translate(m.descKey) || m.description;
      return (
        name.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.slug.toLowerCase().includes(q)
      );
    });
  });

  filteredAccounts = computed(() => {
    let list = this.accounts();
    const search = this.searchQuery().toLowerCase();

    if (search) {
      list = list.filter(a =>
        a.email.toLowerCase().includes(search) ||
        (a.name && a.name.toLowerCase().includes(search))
      );
    }

    const status = this.statusFilter();
    if (status !== 'All') {
      const dbStatus = status === 'Active' ? 'ACTIVO' : 'INACTIVO';
      list = list.filter(a => a.estado === dbStatus);
    }

    const roleId = this.roleFilter();
    if (roleId !== 'All') {
      list = list.filter(a => a.roleId === roleId);
    }

    return list;
  });

  clearFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('All');
    this.roleFilter.set('All');
  }

  getSelectedRoleName(): string {
    const rId = this.roleFilter();
    if (rId === 'All') return this.transloco.translate('roles.allRoles');
    return this.getRoleName(rId);
  }

  activeTab: 'roles' | 'permissions' = 'roles';

  permissionModules: PermissionModule[] = [
    {
      id: 'mod-dashboard',
      name: 'Dashboard General',
      nameKey: 'roles.modules.dashboard.name',
      slug: 'dashboard',
      description: 'Acceso a métricas generales y gráficos del panel principal',
      descKey: 'roles.modules.dashboard.description',
      icon: 'layout-dashboard'
    },
    {
      id: 'mod-ai-chat',
      name: 'Asistente IA',
      nameKey: 'roles.modules.aiChat.name',
      slug: 'ai_chat',
      description: 'Consultas inteligentes, análisis y ejecución de herramientas con IA',
      descKey: 'roles.modules.aiChat.description',
      icon: 'sparkles'
    },
    {
      id: 'mod-reports',
      name: 'Reportes y Estadísticas',
      nameKey: 'roles.modules.reports.name',
      slug: 'reports',
      description: 'Reportes de ventas, productos más vendidos, cuentas por cobrar e inventario',
      descKey: 'roles.modules.reports.description',
      icon: 'bar-chart-2'
    },
    {
      id: 'mod-catalogs',
      name: 'Catálogos Maestros',
      nameKey: 'roles.modules.catalogs.name',
      slug: 'catalogs',
      description: 'Gestión de Productos, Categorías, Marcas y Unidades de Medida',
      descKey: 'roles.modules.catalogs.description',
      icon: 'package'
    },
    {
      id: 'mod-commercial',
      name: 'Comercial',
      nameKey: 'roles.modules.commercial.name',
      slug: 'commercial',
      description: 'Gestión de Clientes y Proveedores de la empresa',
      descKey: 'roles.modules.commercial.description',
      icon: 'users'
    },
    {
      id: 'mod-sucursales',
      name: 'Sucursales',
      nameKey: 'roles.modules.sucursales.name',
      slug: 'sucursales',
      description: 'Administración de sucursales y puntos de venta',
      descKey: 'roles.modules.sucursales.description',
      icon: 'store'
    },
    {
      id: 'mod-company',
      name: 'Mi Empresa',
      nameKey: 'roles.modules.company.name',
      slug: 'settings_company',
      description: 'Configuración de datos de la empresa, RNC y redes sociales',
      descKey: 'roles.modules.company.description',
      icon: 'briefcase'
    },
    {
      id: 'mod-roles',
      name: 'Roles y Permisos',
      nameKey: 'roles.modules.roles.name',
      slug: 'settings_roles',
      description: 'Administración de roles y asignación de permisos de acceso',
      descKey: 'roles.modules.roles.description',
      icon: 'shield-check'
    },
    {
      id: 'mod-users',
      name: 'Cuentas de Usuario',
      nameKey: 'roles.modules.users.name',
      slug: 'settings_users',
      description: 'Gestión de cuentas de miembros de usuario del sistema',
      descKey: 'roles.modules.users.description',
      icon: 'user-check'
    },
    {
      id: 'mod-security-logs',
      name: 'Registros de Auditoría',
      nameKey: 'roles.modules.securityLogs.name',
      slug: 'security_logs',
      description: 'Auditoría de eventos de seguridad y accesos al sistema',
      descKey: 'roles.modules.securityLogs.description',
      icon: 'shield-alert'
    },
    {
      id: 'mod-current-sessions',
      name: 'Sesiones Activas',
      nameKey: 'roles.modules.sessions.name',
      slug: 'current_sessions',
      description: 'Visualización y control de sesiones y dispositivos conectados',
      descKey: 'roles.modules.sessions.description',
      icon: 'monitor-smartphone'
    },
    {
      id: 'mod-activity',
      name: 'Registro de Actividad',
      nameKey: 'roles.modules.activity.name',
      slug: 'activity',
      description: 'Historial detallado de operaciones realizadas en la empresa',
      descKey: 'roles.modules.activity.description',
      icon: 'activity'
    },
    {
      id: 'mod-inventory',
      name: 'Inventario y Almacenes',
      nameKey: 'roles.modules.inventory.name',
      slug: 'inventory',
      description: 'Control de existencias multi-almacén, transferencias y Kardex',
      descKey: 'roles.modules.inventory.description',
      icon: 'boxes'
    },
    {
      id: 'mod-invoices',
      name: 'Facturación y Ventas',
      nameKey: 'roles.modules.invoices.name',
      slug: 'invoices',
      description: 'Emisión de facturas, cotizaciones, notas de crédito e integración e-CF FiscalBridge',
      descKey: 'roles.modules.invoices.description',
      icon: 'file-text'
    },
    {
      id: 'mod-sequences',
      name: 'Comprobantes Fiscales (NCF)',
      nameKey: 'roles.modules.sequences.name',
      slug: 'sequences',
      description: 'Administración de secuencias NCF tradicionales y e-CF autorizadas por la DGII',
      descKey: 'roles.modules.sequences.description',
      icon: 'hash'
    },
    {
      id: 'mod-billing',
      name: 'Plan y Facturación',
      nameKey: 'roles.modules.billing.name',
      slug: 'billing',
      description: 'Gestión de planes, tarjetas de pago y facturas emitidas',
      descKey: 'roles.modules.billing.description',
      icon: 'credit-card'
    },
    {
      id: 'mod-backups',
      name: 'Copias de Seguridad',
      nameKey: 'roles.modules.backups.name',
      slug: 'backups',
      description: 'Creación y restauración de copias de seguridad cifradas y en Google Drive',
      descKey: 'roles.modules.backups.description',
      icon: 'archive'
    },
    {
      id: 'mod-about',
      name: 'Acerca del Sistema',
      nameKey: 'roles.modules.about.name',
      slug: 'about',
      description: 'Información de versión, comprobación de actualizaciones y mantenimiento',
      descKey: 'roles.modules.about.description',
      icon: 'package-check'
    }
  ];

  selectedAccounts = new Set<string>();

  isRoleModalOpen = false;
  editingRole: Role | null = null;
  modalRoleData: { name: string; description: string; permissions: RolePermissions } = {
    name: '',
    description: '',
    permissions: {}
  };

  ngOnInit() {
    this.rolesService.findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.usersService.findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  toggleAccountSelection(accountId: string) {
    if (this.selectedAccounts.has(accountId)) {
      this.selectedAccounts.delete(accountId);
    } else {
      this.selectedAccounts.add(accountId);
    }
  }

  isAccountSelected(accountId: string): boolean {
    return this.selectedAccounts.has(accountId);
  }

  toggleAllAccounts() {
    if (this.isAllAccountsSelected()) {
      this.selectedAccounts.clear();
    } else {
      this.accounts().forEach(acc => this.selectedAccounts.add(acc.id));
    }
  }

  isAllAccountsSelected(): boolean {
    const accs = this.accounts();
    return accs.length > 0 && this.selectedAccounts.size === accs.length;
  }

  getRoleAccounts(roleId: string): User[] {
    return this.accounts().filter(a => a.roleId === roleId);
  }

  getRoleUsersCount(roleId: string): number {
    return this.getRoleAccounts(roleId).length;
  }

  getRoleName(roleId: string | undefined): string {
    if (!roleId) return this.transloco.translate('roles.noRole');
    return this.roles().find(r => r.id === roleId)?.nombre || this.transloco.translate('roles.unknown');
  }

  changeAccountRole(accountId: string, newRoleId: string) {
    this.usersService.update(accountId, { roleId: newRoleId }).subscribe({
      next: () => this.snackBar.open(this.transloco.translate('roles.updated'), this.transloco.translate('common.close'), { duration: 2000 })
    });
  }

  permissionsObject(perms: string[]): RolePermissions {
    const namespaces: Record<string, string> = {
      roles: 'settings_roles',
      settings_roles: 'settings_roles',
      users: 'settings_users',
      settings_users: 'settings_users',
      company: 'settings_company',
      settings_company: 'settings_company',
      dashboard: 'dashboard',
      catalogs: 'catalogs',
      products: 'catalogs',
      services: 'catalogs',
      commercial: 'commercial',
      clients: 'commercial',
      suppliers: 'commercial',
      sucursales: 'sucursales',
      billing: 'billing',
      reports: 'reports',
      ai_chat: 'ai_chat',
      'ai-chat': 'ai_chat',
      security: 'security_logs',
      security_logs: 'security_logs',
      'security-logs': 'security_logs',
      sessions: 'current_sessions',
      current_sessions: 'current_sessions',
      'current-sessions': 'current_sessions',
      activity: 'activity',
      inventory: 'inventory',
      invoices: 'invoices',
      sales: 'invoices',
      sequences: 'sequences',
      backups: 'backups',
      settings_backups: 'backups',
      about: 'about',
      legal: 'legal',
    };
    const result: RolePermissions = {};
    for (const p of perms) {
      const [ns, action] = p.split(':') as [
        string,
        'read' | 'write' | 'delete' | undefined,
      ];
      if (!ns || !action) continue;
      const slug = namespaces[ns] || ns;
      if (!result[slug]) result[slug] = { read: false, write: false, delete: false };
      result[slug][action] = true;
    }
    return result;
  }

  togglePermission(moduleSlug: string, action: 'read' | 'write' | 'delete') {
    if (!this.modalRoleData.permissions[moduleSlug]) {
      this.modalRoleData.permissions[moduleSlug] = { read: false, write: false, delete: false };
    }
    this.modalRoleData.permissions[moduleSlug][action] = !this.modalRoleData.permissions[moduleSlug][action];
    this.modalRoleData = { ...this.modalRoleData };
  }

  getPermissionClass(moduleSlug: string, action: 'read' | 'write' | 'delete'): string {
    const isActive = this.modalRoleData.permissions[moduleSlug]?.[action];
    if (isActive) {
      return 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-500/20 dark:text-blue-400 shadow-sm';
    } else {
      return 'border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-300 dark:hover:border-neutral-600';
    }
  }

  openRoleModal(role?: Role) {
    if (role) {
      this.editingRole = role;

      let parsedPermissions: RolePermissions = {};
      try {
        if (role.permissions) {
          const parsed = JSON.parse(role.permissions);
          if (Array.isArray(parsed)) {
            parsedPermissions = this.permissionsObject(parsed);
          } else {
            parsedPermissions = parsed;
          }
        }
      } catch { }

      const hasStoredPermissions = Object.keys(parsedPermissions).length > 0;
      if (!hasStoredPermissions && (role.nombre === 'Admin' || role.nombre === 'Administrador')) {
        this.permissionModules.forEach(mod => {
          parsedPermissions[mod.slug] = { read: true, write: true, delete: true };
        });
      } else {
        this.permissionModules.forEach(mod => {
          if (!parsedPermissions[mod.slug]) {
            parsedPermissions[mod.slug] = { read: false, write: false, delete: false };
          }
        });
      }

      this.modalRoleData = {
        name: role.nombre,
        description: role.descripcion || (role.nombre === 'Admin' ? 'Control de acceso completo y administración del sistema.' : ''),
        permissions: parsedPermissions
      };
    } else {
      this.editingRole = null;
      const defaultPermissions: RolePermissions = {};
      this.permissionModules.forEach(mod => {
        defaultPermissions[mod.slug] = { read: false, write: false, delete: false };
      });
      this.modalRoleData = {
        name: '',
        description: '',
        permissions: defaultPermissions
      };
    }

    this.dialogRef = this.dialog.open(this.roleModalTemplate, {
      width: '768px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['custom-dialog-container'],
      autoFocus: false
    });
  }

  closeRoleModal() {
    this.dialogRef?.close();
  }

  saveRole() {
    const name = this.modalRoleData.name?.trim();
    if (!name) {
      this.snackBar.open(
        this.transloco.translate('roles.nameRequired') || 'El nombre del rol es requerido',
        this.transloco.translate('common.close') || 'Cerrar',
        { duration: 2500 }
      );
      return;
    }

    this.isSaving.set(true);

    const payload = {
      nombre: name,
      descripcion: this.modalRoleData.description?.trim() || '',
      name: name,
      description: this.modalRoleData.description?.trim() || '',
      permissions: this.modalRoleData.permissions
    };

    if (this.editingRole) {
      this.rolesService.update(this.editingRole.id, payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open(
            this.transloco.translate('roles.updated'),
            this.transloco.translate('common.close'),
            { duration: 2000 }
          );
          this.closeRoleModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || 'Error al actualizar el rol';
          this.snackBar.open(
            Array.isArray(msg) ? msg.join(', ') : msg,
            this.transloco.translate('common.close'),
            { duration: 3500 }
          );
        }
      });
    } else {
      this.rolesService.create(payload).subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open(
            this.transloco.translate('roles.created'),
            this.transloco.translate('common.close'),
            { duration: 2000 }
          );
          this.closeRoleModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = err?.error?.message || err?.message || 'Error al crear el rol';
          this.snackBar.open(
            Array.isArray(msg) ? msg.join(', ') : msg,
            this.transloco.translate('common.close'),
            { duration: 3500 }
          );
        }
      });
    }
  }

}
