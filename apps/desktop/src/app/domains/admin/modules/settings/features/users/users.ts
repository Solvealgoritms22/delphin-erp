import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RolesService } from '../../data/roles';
import { UsersService, User as Account } from '../../data/users';
import { EmptyStateComponent } from '@/app/shared/components/empty-state/empty-state.component';
import { StatCardComponent } from '@/app/shared/components/stat-card/stat-card.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { UserDialogComponent, UserDialogData } from './user-dialog.component';
import { AuthState } from '@/app/core/auth/auth.state';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    EmptyStateComponent,
     StatCardComponent,
     TranslocoPipe
  ],
  template: `
    <div class="flex flex-col w-full h-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">
      
      <!-- Header -->
      <div class="shrink-0 flex w-full flex-col px-6 pt-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-6 gap-4">
          <div>
             <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ 'settings.users.title' | transloco }}</h1>
             <p class="mt-1 text-sm text-neutral-500">{{ 'settings.users.description' | transloco }}</p>
          </div>
          
          <button (click)="openUserModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-2 shrink-0">
            <mat-icon svgIcon="plus" class="!w-4 !h-4 !text-[16px]"></mat-icon>
             {{ 'settings.users.create' | transloco }}
          </button>
        </div>
      </div>

      <!-- Central Scrollable Body -->
      <div class="flex-auto min-h-0 overflow-y-auto px-6 sm:px-10 py-8 pb-16">
        <!-- Stat Cards Grid -->
        <div class="w-full mb-8">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <app-stat-card
             [label]="'settings.users.total' | transloco"
            [value]="accounts().length"
            color="blue">
            <mat-icon slot="icon" svgIcon="users" class="!w-5 !h-5 !text-[20px]"></mat-icon>
          </app-stat-card>
          <app-stat-card
             [label]="'settings.users.activeMembers' | transloco"
            [value]="activeCount()"
            color="green">
            <mat-icon slot="icon" svgIcon="user-check" class="!w-5 !h-5 !text-[20px]"></mat-icon>
          </app-stat-card>
          <app-stat-card
             [label]="'settings.users.inactiveMembers' | transloco"
            [value]="inactiveCount()"
            color="amber">
            <mat-icon slot="icon" svgIcon="user-x" class="!w-5 !h-5 !text-[20px]"></mat-icon>
          </app-stat-card>
        </div>
      </div>

      <!-- Toolbar & Accounts List -->
      <div class="px-6 sm:px-10 w-full pb-12 flex flex-col gap-6">
        
        <!-- Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="relative w-full sm:w-72">
            <mat-icon svgIcon="search" class="absolute left-3 top-1/2 -translate-y-1/2 !w-4 !h-4 !text-[16px] text-neutral-400"></mat-icon>
            <input type="text" [placeholder]="'settings.users.search' | transloco" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500 outline-none">
          </div>
          
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <!-- Status Filter -->
            <div class="relative flex-auto sm:flex-initial">
              <button [matMenuTriggerFor]="statusMenu" class="w-full sm:w-36 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full" [ngClass]="statusFilter() === 'Active' ? 'bg-emerald-500' : (statusFilter() === 'Inactive' ? 'bg-neutral-500' : 'bg-blue-500')"></div> 
                  {{ statusFilter() === 'All' ? 'Todos' : (statusFilter() === 'Active' ? 'Activos' : 'Inactivos') }}
                </div>
                <mat-icon svgIcon="chevron-down" class="!w-4 !h-4 !text-[16px] text-neutral-500"></mat-icon>
              </button>
              <mat-menu #statusMenu="matMenu">
                 <button mat-menu-item (click)="statusFilter.set('All')">{{ 'settings.users.allStatuses' | transloco }}</button>
                 <button mat-menu-item (click)="statusFilter.set('Active')">{{ 'settings.users.active' | transloco }}</button>
                 <button mat-menu-item (click)="statusFilter.set('Inactive')">{{ 'settings.users.inactive' | transloco }}</button>
              </mat-menu>
            </div>
            
            <!-- Role Filter -->
            <div class="relative flex-auto sm:flex-initial">
              <button [matMenuTriggerFor]="roleFilterMenu" class="w-full sm:w-44 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
                <span class="truncate pr-2">{{ getSelectedRoleName() }}</span>
                <mat-icon svgIcon="chevron-down" class="!w-4 !h-4 !text-[16px] text-neutral-500 shrink-0"></mat-icon>
              </button>
              <mat-menu #roleFilterMenu="matMenu">
                 <button mat-menu-item (click)="roleFilter.set('All')">{{ 'settings.users.allRoles' | transloco }}</button>
                @for (r of roles(); track r.id) {
                  <button mat-menu-item (click)="roleFilter.set(r.id)">{{ r.nombre }}</button>
                }
              </mat-menu>
            </div>
          </div>
        </div>
        
        <!-- Table -->
        <div class="overflow-x-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs">
          <table class="w-full text-left min-w-[700px] border-collapse">
            <thead>
              <tr class="border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-widest">
              <th class="py-3.5 px-6">{{ 'settings.users.userEmail' | transloco }}</th>
              <th class="py-3.5 px-6">{{ 'settings.users.role' | transloco }}</th>
              <th class="py-3.5 px-6">{{ 'settings.users.accessStatus' | transloco }}</th>
              <th class="py-3.5 px-6 text-right">{{ 'common.actions' | transloco }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800/50">
              @for (account of filteredAccounts(); track account.id) {
                <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                  <td class="py-4 px-6">
                    <div class="flex items-center gap-3">
                      @if (account.avatar) {
                        <img class="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700" [src]="account.avatar" alt="">
                      } @else {
                        <div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-xs">
                          {{ (account.name || account.email).charAt(0).toUpperCase() }}
                        </div>
                      }
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-neutral-900 dark:text-white leading-tight mb-0.5">{{ account.name || account.email.split('@')[0] }}</span>
                        <span class="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">{{ account.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="py-4 px-6">
                    @if (account.isOwner) {
                      <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs border border-neutral-200 dark:border-neutral-700">
                        <mat-icon svgIcon="crown" class="!w-3.5 !h-3.5 !text-[14px] text-amber-500 dark:text-amber-400"></mat-icon>
                         {{ 'settings.users.owner' | transloco }}
                      </span>
                    } @else {
                      <button [matMenuTriggerFor]="itemRoleMenu" class="text-xs font-semibold px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                        {{ getRoleName(account.roleId) }}
                        <mat-icon svgIcon="chevron-down" class="!w-3 !h-3 !text-[12px] text-neutral-400"></mat-icon>
                      </button>
                      <mat-menu #itemRoleMenu="matMenu">
                        @for (role of roles(); track role.id) {
                          <button mat-menu-item (click)="changeRole(account.id, role.id)">
                            {{ role.nombre }}
                          </button>
                        }
                        @if (account.estado === 'PENDIENTE') {
                          <button mat-menu-item (click)="resendInvitation(account)">
                            <mat-icon svgIcon="send"></mat-icon>
                             <span>{{ 'settings.users.resendInvitation' | transloco }}</span>
                          </button>
                        }
                      </mat-menu>
                    }
                  </td>
                  <td class="py-4 px-6">
                    @if (account.isOwner || account.estado === 'ACTIVO') {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                         {{ 'common.active' | transloco }}
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                         {{ 'common.inactive' | transloco }}
                      </span>
                    }
                  </td>
                  <td class="py-4 px-6 text-right">
                    @if (account.isOwner) {
                       <span class="text-xs font-semibold text-neutral-400 dark:text-neutral-500 italic px-2">{{ 'settings.users.primaryAccount' | transloco }}</span>
                    } @else {
                      <div class="flex items-center justify-end gap-2">
                        <button (click)="toggleStatus(account)" class="px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors">
                           {{ (account.estado === 'ACTIVO' ? 'settings.users.deactivate' : 'settings.users.activate') | transloco }}
                        </button>
                         <button (click)="openUserModal(account)" class="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors" [title]="'settings.users.edit' | transloco">
                          <mat-icon svgIcon="pencil" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                        </button>
                        <button (click)="deleteUser(account)" class="w-8 h-8 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <mat-icon svgIcon="trash" class="!w-4 !h-4 !text-[16px]"></mat-icon>
                        </button>
                      </div>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="py-12">
                    <app-empty-state
                      icon="users"
                       [title]="'settings.users.emptyTitle' | transloco"
                       [description]="'settings.users.emptyDescription' | transloco"
                       [actionLabel]="'settings.users.clearFilters' | transloco"
                      (actionClick)="clearFilters()">
                    </app-empty-state>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  rolesService = inject(RolesService);
  usersService = inject(UsersService);
  dialog = inject(MatDialog);
  snackBar = inject(MatSnackBar);
  authState = inject(AuthState);
  transloco = inject(TranslocoService);

  roles = this.rolesService.roles;
  accounts = this.usersService.users;
  companies = signal<Array<{ id: string; razonSocial: string; rnc?: string | null }>>([]);

  searchQuery = signal('');
  statusFilter = signal<string>('All');
  roleFilter = signal<string>('All');

  activeCount = computed(() => this.accounts().filter(a => a.estado === 'ACTIVO').length);
  inactiveCount = computed(() => this.accounts().filter(a => a.estado !== 'ACTIVO').length);

  filteredAccounts = computed(() => {
    let list = this.accounts();
    const search = this.searchQuery().toLowerCase();

    if (search) {
      list = list.filter(a => a.email.toLowerCase().includes(search));
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

  ngOnInit() {
    this.rolesService.findAll().subscribe();
    this.usersService.findAll().subscribe();
    this.usersService.findAssignableCompanies().subscribe({
      next: (companies) => this.companies.set(companies),
    });
  }

  clearFilters() {
    this.searchQuery.set('');
    this.statusFilter.set('All');
    this.roleFilter.set('All');
  }

  getSelectedRoleName(): string {
    const rId = this.roleFilter();
    if (rId === 'All') return 'Todos los Roles';
    return this.getRoleName(rId);
  }

  getRoleName(roleId: string | undefined): string {
    if (!roleId) return 'Sin Rol';
    return this.roles().find(r => r.id === roleId)?.nombre || 'Desconocido';
  }

  openUserModal(user?: Account) {
    const dialogRef = this.dialog.open(UserDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
      data: {
          user,
          roles: this.roles(),
          companies: this.companies(),
          currentEmpresaId: this.authState.empresaId() || '',
        } satisfies UserDialogData,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (!res) return;
      if (user) {
        this.usersService.update(user.id, res).subscribe({
           next: () => {
             this.usersService.findAll().subscribe();
             this.snackBar.open('Usuario actualizado', 'Cerrar', { duration: 2000 });
           },
          error: (err) => this.snackBar.open(err?.error?.message || 'Error al actualizar usuario', 'Cerrar', { duration: 4000 })
        });
      } else {
        this.usersService.create(res).subscribe({
           next: () => {
             this.usersService.findAll().subscribe();
             this.snackBar.open('Usuario creado exitosamente', 'Cerrar', { duration: 2000 });
           },
          error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear usuario', 'Cerrar', { duration: 4000 })
        });
      }
    });
  }

  changeRole(userId: string, newRoleId: string) {
    this.usersService.update(userId, { roleId: newRoleId }).subscribe({
      next: () => this.snackBar.open('Rol actualizado', 'Cerrar', { duration: 2000 })
    });
  }

  resendInvitation(user: Account) {
    this.usersService.resendInvitation(user.id).subscribe({
      next: () => this.snackBar.open('Invitación reenviada', 'Cerrar', { duration: 2500 }),
      error: (err) => this.snackBar.open(err?.error?.message || 'No se pudo reenviar la invitación', 'Cerrar', { duration: 4000 }),
    });
  }

  toggleStatus(user: Account) {
    const newStatus = user.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    this.usersService.update(user.id, { estado: newStatus }).subscribe({
      next: () => this.snackBar.open(`Usuario ${newStatus === 'ACTIVO' ? 'activado' : 'desactivado'}`, 'Cerrar', { duration: 2000 })
    });
  }

  deleteUser(user: Account) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar cuenta de usuario',
        message: `¿Estás seguro de eliminar el acceso para "${user.email}"?`,
        destructive: true,
      } satisfies ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.usersService.remove(user.id).subscribe({
          next: () => this.snackBar.open('Usuario eliminado', 'Cerrar', { duration: 2000 })
        });
      }
    });
  }
}
