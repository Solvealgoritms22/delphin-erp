import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { UsersService, User as Account } from '../../data/users';
import { RolesService } from '../../data/roles';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { UserDialogComponent, UserDialogData } from './user-dialog.component';
import { AuthState } from '@core/auth/auth.state';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PlusIcon, SearchIcon, ChevronDownIcon, PencilIcon, TrashIcon, TriangleAlertIcon } from 'ng-animated-icons';

@Component({
  selector: 'app-users',
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
    StatCardComponent,
    TranslocoPipe,
    PlusIcon,
    SearchIcon,
    ChevronDownIcon,
    PencilIcon,
    TrashIcon,
    TriangleAlertIcon,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full bg-white dark:bg-neutral-900 overflow-hidden">

      @if (currentEmpresa() && !currentEmpresa()?.smtpEnabled) {
        <div class="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-6 py-3 flex items-start gap-3">
          <i-triangle-alert [size]="20" class="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-amber-800 dark:text-amber-400">Servidor SMTP no configurado</span>
            <span class="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Las invitaciones y correos del sistema no se enviarán hasta que configures el SMTP en la configuración de la empresa.</span>
          </div>
        </div>
      }

      <div class="shrink-0 flex w-full flex-col px-6 pt-8 sm:px-10 border-b border-neutral-100 dark:border-neutral-800">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between w-full mb-6 gap-4">
          <div>
             <h1 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{{ 'settings.users.title' | transloco }}</h1>
             <p class="mt-1 text-sm text-neutral-500">{{ 'settings.users.description' | transloco }}</p>
          </div>

          <div class="flex items-center gap-3">
            <button (click)="openUserModal()" class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-colors cursor-pointer">
              <i-plus [size]="18" />
               {{ 'settings.users.create' | transloco }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex-auto min-h-0 overflow-y-auto px-6 sm:px-10 py-8 pb-16">

        <section class="grid gap-4 sm:grid-cols-3 mb-8">
          <app-stat-card
            [title]="'settings.users.total' | transloco"
            [subtitle]="'100% ' + ('dashboard.general.ofTotal' | transloco)"
            [value]="accounts().length"
            icon="users"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadUsers()"
          />

          <app-stat-card
            [title]="'settings.users.activeMembers' | transloco"
            [subtitle]="percentageOf(activeCount()) + '% ' + ('dashboard.general.ofTotal' | transloco)"
            [value]="activeCount()"
            icon="user-check"
            curvePreset="asc-sigmoid"
            color="emerald"
            (refresh)="loadUsers()"
          />

          <app-stat-card
            [title]="'settings.users.inactiveMembers' | transloco"
            [subtitle]="percentageOf(inactiveCount()) + '% ' + ('dashboard.general.ofTotal' | transloco)"
            [value]="inactiveCount()"
            icon="user-x"
            curvePreset="trough-wave"
            color="amber"
            (refresh)="loadUsers()"
          />
        </section>

      <div class="px-6 sm:px-10 w-full pb-12 flex flex-col gap-6">

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="relative w-full sm:w-72">
            <i-search [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input type="text" [placeholder]="'settings.users.search' | transloco" [value]="searchQuery()" (input)="searchQuery.set($any($event.target).value)" class="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:ring-2 focus:ring-blue-500 outline-none">
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto">

            <div class="relative flex-auto sm:flex-initial">
              <button [matMenuTriggerFor]="statusMenu" class="w-full sm:w-36 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer">
                <div class="flex items-center gap-2">
                  <div class="w-2.5 h-2.5 rounded-full" [ngClass]="statusFilter() === 'Active' ? 'bg-emerald-500' : (statusFilter() === 'Inactive' ? 'bg-neutral-500' : 'bg-blue-500')"></div>
                  {{ statusFilter() === 'All' ? 'Todos' : (statusFilter() === 'Active' ? 'Activos' : 'Inactivos') }}
                </div>
                <i-chevron-down [size]="16" class="text-neutral-500" />
              </button>
              <mat-menu #statusMenu="matMenu">
                 <button mat-menu-item (click)="statusFilter.set('All')">{{ 'settings.users.allStatuses' | transloco }}</button>
                 <button mat-menu-item (click)="statusFilter.set('Active')">{{ 'settings.users.active' | transloco }}</button>
                 <button mat-menu-item (click)="statusFilter.set('Inactive')">{{ 'settings.users.inactive' | transloco }}</button>
              </mat-menu>
            </div>

            <div class="relative flex-auto sm:flex-initial">
              <button [matMenuTriggerFor]="roleFilterMenu" class="w-full sm:w-44 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-between transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer">
                <span class="truncate pr-2">{{ getSelectedRoleName() }}</span>
                <i-chevron-down [size]="16" class="text-neutral-500 shrink-0" />
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

        <div class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/20 text-[13px] font-semibold text-neutral-500 dark:text-neutral-400">
                  <th class="py-4 px-6">{{ 'settings.users.user' | transloco }}</th>
                  <th class="py-4 px-6">{{ 'settings.users.role' | transloco }}</th>
                  <th class="py-4 px-6">{{ 'common.status' | transloco }}</th>
                  <th class="py-4 px-6 text-right">{{ 'common.actions' | transloco }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                @if (filteredAccounts().length === 0) {
                  <tr>
                    <td colspan="4" class="p-8">
                      <app-empty-state
                        illustration="18.svg"
                        [title]="'settings.users.emptyTitle' | transloco"
                        [description]="'settings.users.emptyDescription' | transloco"
                        [actionLabel]="'settings.users.clearFilters' | transloco"
                        (actionClick)="clearFilters()">
                      </app-empty-state>
                    </td>
                  </tr>
                } @else {
                  @for (account of filteredAccounts(); track account.id) {
                    <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                      <td class="py-4 px-6">
                        <div class="flex items-center gap-3">
                          @if (account.avatar) {
                            <img class="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover shrink-0" [src]="account.avatar" [alt]="account.name || account.email">
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
                      <td class="py-4 px-6">
                        <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                          {{ getRoleName(account.roleId, account.isOwner) }}
                        </span>
                      </td>
                      <td class="py-4 px-6">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          [ngClass]="account.estado === 'ACTIVO' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'">
                          {{ account.estado === 'ACTIVO' ? ('settings.users.active' | transloco) : ('settings.users.inactive' | transloco) }}
                        </span>
                      </td>
                      <td class="py-4 px-6 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button (click)="openUserModal(account)" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer" [title]="'common.edit' | transloco">
                            <i-pencil [size]="16" />
                          </button>
                          <button (click)="deleteUser(account)" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-neutral-500 hover:text-red-600 transition-colors cursor-pointer" [title]="'common.delete' | transloco">
                            <i-trash [size]="16" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>

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
  private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);

  roles = this.rolesService.roles;
  accounts = this.usersService.users;
  companies = signal<Array<{ id: string; razonSocial: string; rnc?: string | null }>>([]);
  currentEmpresa = signal<any>(null);

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

  loadUsers() {
    this.rolesService.findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.usersService.findAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
    this.usersService.findAssignableCompanies()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (companies) => this.companies.set(companies),
      });

    this.http.get<any>(`${environment.apiUrl}/empresas/current`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (empresa) => this.currentEmpresa.set(empresa),
        error: (err) => console.error('Error fetching current empresa for SMTP check', err)
      });
  }

  ngOnInit() {
    this.loadUsers();
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

  getRoleName(roleId: string | undefined, isOwner = false): string {
    if (isOwner) return this.transloco.translate('settings.users.owner');
    if (!roleId) return this.transloco.translate('settings.users.noRole');
    return this.roles().find(r => r.id === roleId)?.nombre || this.transloco.translate('settings.users.unknown');
  }

  async openUserModal(user?: Account) {
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

    // firstValueFrom avoids accumulating a new subscription on every modal open
    const res = await firstValueFrom(dialogRef.afterClosed());
    if (!res) return;
    if (user) {
      this.usersService.update(user.id, res)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.usersService.findAll()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe();
            this.snackBar.open('Usuario actualizado', 'Cerrar', { duration: 2000 });
          },
          error: (err) => this.snackBar.open(err?.error?.message || 'Error al actualizar usuario', 'Cerrar', { duration: 4000 })
        });
    } else {
      this.usersService.create(res)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.usersService.findAll()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe();
            this.snackBar.open('Usuario creado exitosamente', 'Cerrar', { duration: 2000 });
          },
          error: (err) => this.snackBar.open(err?.error?.message || 'Error al crear usuario', 'Cerrar', { duration: 4000 })
        });
    }
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

  async deleteUser(user: Account) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar cuenta de usuario',
        message: `¿Estás seguro de eliminar el acceso para "${user.email}"?`,
        destructive: true,
      } satisfies ConfirmDialogData,
    });

    // firstValueFrom avoids accumulating a new subscription on every dialog open
    const confirmed = await firstValueFrom(dialogRef.afterClosed());
    if (confirmed) {
      this.usersService.remove(user.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.snackBar.open('Usuario eliminado', 'Cerrar', { duration: 2000 }),
        });
    }
  }

  percentageOf(value: number): number {
    const total = this.accounts().length;
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}
