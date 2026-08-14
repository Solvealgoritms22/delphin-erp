import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, inject, TemplateRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { RolesService, Role } from '../../data/roles';
import { UsersService } from '../../data/users';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';


export interface PermissionModule {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

export interface RolePermissions {
  [moduleSlug: string]: { read: boolean; write: boolean; delete: boolean };
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule, MatSnackBarModule, EmptyStateComponent, TranslocoPipe],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">
      
      <!-- Header & Tabs -->
      <div class="shrink-0 flex w-full flex-col px-6 pt-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
         <div class="flex items-center justify-between w-full mb-6">
           <div>
              <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ 'roles.title' | transloco }}</h1>
              <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{{ 'roles.description' | transloco }}</p>
           </div>
          
          <button (click)="openRoleModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm align-center flex items-center gap-2">
            <mat-icon svgIcon="plus" class="!w-4 !h-4 !text-[16px]"></mat-icon>
             {{ 'roles.create' | transloco }}
          </button>
        </div>
      </div>

      <!-- Central Scrollable Body -->
      <div class="flex-auto min-h-0 overflow-y-auto px-6 sm:px-10 py-8 pb-16">
        <!-- ==================== ROLES & ACCOUNTS TAB ==================== -->
        <!-- Roles Grid -->
        <div class="w-full">
          @if (roles().length > 0) {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              
              @for (role of roles(); track role.id) {
                <!-- Card -->
                <div class="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-6 flex flex-col gap-4 border border-transparent dark:border-neutral-700/50 shadow-sm relative group">
                  <h3 class="text-base font-bold text-neutral-900 dark:text-white">{{ role.nombre }}</h3>
                   <p class="text-sm text-neutral-500 dark:text-neutral-400 min-h-[40px] leading-relaxed">{{ role.descripcion || ('roles.defaultDescription' | transloco) }}</p>
                  
                  <div class="flex justify-between items-end mt-auto pt-2">
                    <div class="flex -space-x-2">
                      @for (avatar of getRoleAvatars(role.id).slice(0, 4); track avatar; let i = $index) {
                        <img class="w-6 h-6 rounded-full border border-neutral-50 dark:border-neutral-800 object-cover" [src]="avatar" alt="">
                      }
                      @if (getRoleUsersCount(role.id) > 4) {
                        <div class="w-6 h-6 rounded-full border border-neutral-50 dark:border-neutral-800 bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 flex items-center justify-center text-[10px] font-bold z-10">
                          +{{ getRoleUsersCount(role.id) - 4 }}
                        </div>
                      }
                    </div>
                    <button (click)="openRoleModal(role)" class="text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                       {{ 'roles.edit' | transloco }} <mat-icon svgIcon="arrow-right" class="icon-size-4"></mat-icon>
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

        <!-- All accounts Section -->
        <div class="px-6 sm:px-10 w-full mt-14 pb-12 flex flex-col gap-6">
           <h2 class="text-xl font-bold text-neutral-900 dark:text-white">{{ 'roles.accounts' | transloco }}</h2>
          
          <!-- Toolbar -->
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="relative w-full sm:w-72 flex-auto sm:flex-initial">
              <mat-icon svgIcon="search" class="absolute left-3 top-1/2 -translate-y-1/2 icon-size-4 text-neutral-400"></mat-icon>
              <input type="text" placeholder="Search..." [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" class="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <!-- Status Filter -->
              <div class="relative flex-auto sm:flex-initial">
                <button [matMenuTriggerFor]="statusMenu" class="w-full sm:w-32 bg-neutral-50 dark:bg-neutral-800 border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full" [ngClass]="statusFilter() === 'Active' ? 'bg-emerald-500' : (statusFilter() === 'Inactive' ? 'bg-neutral-500' : 'bg-blue-500')"></div> 
                    {{ statusFilter() === 'All' ? 'All Status' : statusFilter() }}
                  </div>
                  <mat-icon svgIcon="chevron-down" class="icon-size-4 text-neutral-500"></mat-icon>
                </button>
                <mat-menu #statusMenu="matMenu">
                  <button mat-menu-item (click)="statusFilter.set('All')">All Status</button>
                  <button mat-menu-item (click)="statusFilter.set('Active')">Active</button>
                  <button mat-menu-item (click)="statusFilter.set('Inactive')">Inactive</button>
                </mat-menu>
              </div>
              
              <!-- Role Filter -->
              <div class="relative flex-auto sm:flex-initial">
                <button [matMenuTriggerFor]="roleFilterMenu" class="w-full sm:w-40 bg-neutral-50 dark:bg-neutral-800 border border-transparent rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 whitespace-nowrap">
                  <span class="truncate pr-2">{{ getSelectedRoleName() }}</span>
                  <mat-icon svgIcon="chevron-down" class="icon-size-4 text-neutral-500 shrink-0"></mat-icon>
                </button>
                <mat-menu #roleFilterMenu="matMenu">
                  <button mat-menu-item (click)="roleFilter.set('All')">All Roles</button>
                  @for (r of roles(); track r.id) {
                    <button mat-menu-item (click)="roleFilter.set(r.id)">{{ r.nombre }}</button>
                  }
                </mat-menu>
              </div>
            </div>
          </div>
          
          <!-- Table -->
          <div class="overflow-x-auto -mx-6 sm:-mx-10 px-6 sm:px-10 pb-4">
            <table class="w-full text-left min-w-[800px]">
              <thead>
                <tr class="border-b border-neutral-100 dark:border-neutral-800 select-none">
                  <th class="py-4 pl-0 pr-4 w-12 cursor-pointer" (click)="toggleAllAccounts()">
                    @if (isAllAccountsSelected()) {
                      <div class="w-4 h-4 rounded-[4px] bg-blue-500 border border-blue-500 flex items-center justify-center text-white mx-auto shadow-sm">
                        <mat-icon svgIcon="check" class="icon-size-3"></mat-icon>
                      </div>
                    } @else {
                      <div class="w-4 h-4 rounded-[4px] border-2 border-neutral-200 dark:border-neutral-700 mx-auto"></div>
                    }
                  </th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Name <mat-icon svgIcon="chevron-down" class="icon-size-4 ml-1 text-neutral-400 dark:text-neutral-500"></mat-icon></div></th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Status <mat-icon svgIcon="chevron-down" class="icon-size-4 ml-1 text-neutral-400 dark:text-neutral-500"></mat-icon></div></th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Last Online <mat-icon svgIcon="chevron-down" class="icon-size-4 ml-1 text-neutral-400 dark:text-neutral-500"></mat-icon></div></th>
                  <th class="py-4 px-4"><div class="flex items-center text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors">Role <mat-icon svgIcon="chevron-down" class="icon-size-4 ml-1 text-neutral-400 dark:text-neutral-500"></mat-icon></div></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                
                @for (account of filteredAccounts(); track account.id) {
                  <!-- Row -->
                  <tr class="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors cursor-default">
                    <td class="py-4 pl-0 pr-4 cursor-pointer" (click)="toggleAccountSelection(account.id)">
                      @if (isAccountSelected(account.id)) {
                        <div class="w-4 h-4 rounded-[4px] bg-blue-500 border border-blue-500 flex items-center justify-center text-white mx-auto shadow-sm">
                          <mat-icon svgIcon="check" class="icon-size-3"></mat-icon>
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
                          <span class="text-sm text-neutral-500 dark:text-neutral-400 leading-none">{{ account.email }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      @if (account.estado === 'ACTIVO') {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Activo</span>
                      } @else {
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">Inactivo</span>
                      }
                    </td>
                    <td class="py-4 px-4">
                      <div class="flex flex-col">
                        <span class="text-sm font-medium text-neutral-900 dark:text-white leading-none mb-1">{{ account.lastOnlineDate || 'N/A' }}</span>
                        <span class="text-xs text-neutral-500 dark:text-neutral-400 leading-none">{{ account.lastOnlineTime || '' }}</span>
                      </div>
                    </td>
                    <td class="py-4 px-4">
                      @if (account.isOwner) {
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs border border-neutral-200 dark:border-neutral-700">
                          <mat-icon svgIcon="crown" class="!w-3.5 !h-3.5 !text-[14px] text-amber-500 dark:text-amber-400"></mat-icon>
                          Propietario (Owner)
                        </span>
                      } @else {
                        <!-- Dropdown Trigger -->
                        <button [matMenuTriggerFor]="roleMenu" class="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {{ getRoleName(account.roleId) }} <mat-icon svgIcon="chevron-down" class="icon-size-3 text-neutral-500 dark:text-neutral-400"></mat-icon>
                        </button>
                        <!-- Dropdown Menu -->
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
                        title="No accounts found"
                        message="We couldn't find any accounts matching your current filters."
                        actionLabel="Clear filters"
                        (actionClick)="clearFilters()">
                      </app-empty-state>
                    </td>
                  </tr>
                }
                
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-neutral-100 dark:border-neutral-800">
            <div class="flex items-center gap-3">
              <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">Rows per page:</span>
              <button class="text-sm font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:text-neutral-900 dark:hover:text-white transition-colors">
                10 <mat-icon svgIcon="chevron-down" class="icon-size-4 text-neutral-500 dark:text-neutral-400"></mat-icon>
              </button>
            </div>
            <div class="flex items-center gap-6">
              <span class="text-sm font-medium text-neutral-500 dark:text-neutral-400">1 - 3 of 3</span>
              <div class="flex items-center gap-1">
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  <mat-icon svgIcon="chevron-left" class="icon-size-5"></mat-icon>
                </button>
                <button class="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50">
                  <mat-icon svgIcon="chevron-right" class="icon-size-5"></mat-icon>
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      <!-- ==================== MODALS ==================== -->
      
      <!-- Create/Edit Role Modal Template (Rendered via MatDialog above sidebar) -->
      <ng-template #roleModalTemplate>
        <div class="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl w-full border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh] overflow-hidden">
          
          <!-- Header (Fixed) -->
          <div class="flex items-center justify-between px-8 py-5 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
            <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
              {{ editingRole ? 'Edit role' : 'Create role' }}
            </h2>
            <button (click)="closeRoleModal()" class="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
              <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
            </button>
          </div>
          
          <!-- Body (Scrollable) -->
          <div class="p-8 flex flex-col gap-8 overflow-y-auto flex-1 max-h-[calc(85vh-140px)]">
            <!-- Basic Info -->
            <div class="flex flex-col gap-6">
              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-neutral-500">Role name</label>
                <input type="text" [(ngModel)]="modalRoleData.name" class="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white outline-none transition-colors">
              </div>
              <div class="flex flex-col gap-2">
                <label class="text-sm font-bold text-neutral-500">Description</label>
                <textarea [(ngModel)]="modalRoleData.description" rows="3" class="w-full bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-bold text-neutral-900 dark:text-white outline-none resize-none transition-colors"></textarea>
              </div>
            </div>
            
            <!-- Permissions Section (DYNAMIC) -->
            <div class="flex flex-col gap-4">
              <h3 class="text-sm font-bold text-neutral-500">Permissions Assignment</h3>
              
              <div class="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800 border-b border-neutral-100 dark:border-neutral-800">
                
                @for (mod of permissionModules; track mod.id) {
                  <!-- Dynamic Module Row -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between py-6 gap-4">
                    <div class="flex items-center gap-4">
                      <div class="w-12 h-12 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <mat-icon [svgIcon]="mod.icon" class="icon-size-6"></mat-icon>
                      </div>
                      <div class="flex flex-col">
                        <span class="text-base font-bold text-neutral-900 dark:text-white leading-tight mb-0.5">{{ mod.name }}</span>
                        <span class="text-sm text-neutral-500">{{ mod.description }}</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 flex-wrap sm:flex-nowrap shrink-0">
                      <button (click)="togglePermission(mod.slug, 'read')" [ngClass]="getPermissionClass(mod.slug, 'read')" class="px-4 py-1.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-colors">
                        @if(modalRoleData.permissions[mod.slug]?.read){<mat-icon svgIcon="check" class="icon-size-4"></mat-icon>} Read
                      </button>
                      <button (click)="togglePermission(mod.slug, 'write')" [ngClass]="getPermissionClass(mod.slug, 'write')" class="px-4 py-1.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-colors">
                        @if(modalRoleData.permissions[mod.slug]?.write){<mat-icon svgIcon="check" class="icon-size-4"></mat-icon>} Write
                      </button>
                      <button (click)="togglePermission(mod.slug, 'delete')" [ngClass]="getPermissionClass(mod.slug, 'delete')" class="px-4 py-1.5 rounded-full border text-[13px] font-bold flex items-center gap-2 transition-colors">
                        @if(modalRoleData.permissions[mod.slug]?.delete){<mat-icon svgIcon="check" class="icon-size-4"></mat-icon>} Delete
                      </button>
                    </div>
                  </div>
                }
                
              </div>
            </div>
          </div>
          
          <!-- Footer (Fixed) -->
          <div class="flex items-center justify-end gap-3 px-8 py-5 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-white dark:bg-neutral-900">
            <button (click)="closeRoleModal()" class="px-6 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">Cancel</button>
            <button (click)="saveRole()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-8 py-2.5 rounded-xl transition-colors shadow-sm">Save Role</button>
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

  @ViewChild('roleModalTemplate') roleModalTemplate!: TemplateRef<any>;
  private dialogRef?: MatDialogRef<any>;

  roles = this.rolesService.roles;
  accounts = this.usersService.users;

  // Filters State
  searchQuery = signal('');
  statusFilter = signal<string>('All');
  roleFilter = signal<string>('All');

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

  // Navigation State
  activeTab: 'roles' | 'permissions' = 'roles';

  permissionModules: PermissionModule[] = [
    {
      id: 'mod-dashboard',
      name: 'Dashboard General',
      slug: 'dashboard',
      description: 'Acceso a métricas generales y gráficos del panel principal',
      icon: 'layout-dashboard'
    },
    {
      id: 'mod-catalogs',
      name: 'Catálogos Maestros',
      slug: 'catalogs',
      description: 'Gestión de Productos, Categorías, Marcas y Unidades de Medida',
      icon: 'package'
    },
    {
      id: 'mod-commercial',
      name: 'Comercial',
      slug: 'commercial',
      description: 'Gestión de Clientes y Proveedores de la empresa',
      icon: 'users'
    },
    {
      id: 'mod-sucursales',
      name: 'Sucursales',
      slug: 'sucursales',
      description: 'Administración de sucursales y puntos de venta',
      icon: 'store'
    },
    {
      id: 'mod-company',
      name: 'Mi Empresa',
      slug: 'settings_company',
      description: 'Configuración de datos de la empresa, RNC y redes sociales',
      icon: 'building'
    },
    {
      id: 'mod-roles',
      name: 'Roles y Permisos',
      slug: 'settings_roles',
      description: 'Administración de roles y asignación de permisos de acceso',
      icon: 'shield-check'
    },
    {
      id: 'mod-users',
      name: 'Cuentas de Usuario',
      slug: 'settings_users',
      description: 'Gestión de cuentas de miembros de usuario del sistema',
      icon: 'user-check'
    },
    {
      id: 'mod-billing',
      name: 'Plan y Facturación',
      slug: 'billing',
      description: 'Gestión de planes, tarjetas de pago y facturas emitidas',
      icon: 'credit-card'
    }
  ];

  // Selections
  selectedAccounts = new Set<string>();

  // Role Modal State
  isRoleModalOpen = false;
  editingRole: Role | null = null;
  modalRoleData: { name: string; description: string; permissions: RolePermissions } = {
    name: '',
    description: '',
    permissions: {}
  };



  ngOnInit() {
    this.rolesService.findAll().subscribe();
    this.usersService.findAll().subscribe();
  }

  // --- Logic for Accounts Selection ---

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

  // --- Logic for Roles ---

  getRoleUsersCount(roleId: string): number {
    return this.accounts().filter(a => a.roleId === roleId && !a.isOwner).length;
  }

  getRoleAvatars(roleId: string): string[] {
    return this.accounts()
      .filter(a => a.roleId === roleId && !a.isOwner)
      .map(a => a.avatar || 'avatars/300-1.png');
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

  // --- Logic for Role Modal & Permissions ---

  // Convierte el formato array "modulo:accion" (backend/JWT) al objeto de la UI
  permissionsObject(perms: string[]): RolePermissions {
    const namespaces: Record<string, string> = {
      roles: 'settings_roles',
      users: 'settings_users',
      company: 'settings_company',
      dashboard: 'dashboard',
      catalogs: 'catalogs',
      commercial: 'commercial',
      sucursales: 'sucursales',
      billing: 'billing',
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
      } catch (e) { }

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
    const payload = {
      nombre: this.modalRoleData.name,
      descripcion: this.modalRoleData.description,
      name: this.modalRoleData.name,
      description: this.modalRoleData.description,
      permissions: JSON.stringify(this.modalRoleData.permissions)
    };

    if (this.editingRole) {
      this.rolesService.update(this.editingRole.id, payload).subscribe({
        next: () => {
           this.snackBar.open(this.transloco.translate('roles.updated'), this.transloco.translate('common.close'), { duration: 2000 });
          this.closeRoleModal();
        }
      });
    } else {
      this.rolesService.create(payload).subscribe({
        next: () => {
           this.snackBar.open(this.transloco.translate('roles.created'), this.transloco.translate('common.close'), { duration: 2000 });
          this.closeRoleModal();
        }
      });
    }
  }


}
