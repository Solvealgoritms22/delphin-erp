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
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService, User as Account } from '../../data/users';
import { RolesService } from '../../data/roles';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { StatCardComponent } from '@shared/components/stat-card/stat-card.component';
import { UserDialogComponent, UserDialogData } from './user-dialog.component';
import { AuthState } from '@core/auth/auth.state';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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
    MatTooltipModule,
    EmptyStateComponent,
    StatCardComponent,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col flex-auto min-w-0 h-full overflow-hidden">
      @if (currentEmpresa() && !currentEmpresa()?.smtpEnabled) {
        <div class="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-6 py-3 flex items-start gap-3">
          <mat-icon svgIcon="alert-triangle" class="icon-size-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5"></mat-icon>
          <div class="flex flex-col">
            <span class="text-sm font-semibold text-amber-800 dark:text-amber-400">Servidor SMTP no configurado</span>
            <span class="text-xs text-amber-700 dark:text-amber-500 mt-0.5">Las invitaciones y correos del sistema no se enviarán hasta que configures el SMTP en la configuración de la empresa.</span>
          </div>
        </div>
      }

      <!-- Standard Clean Page Header -->
      <div
        class="relative shrink-0 flex flex-col sm:flex-row flex-0 sm:items-center sm:justify-between py-8 px-6 md:px-8 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
      >
        <div>
          <div
            class="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white"
          >
            {{ 'settings.users.title' | transloco }}
          </div>
          <p class="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {{ 'settings.users.description' | transloco }}
          </p>
        </div>

        <div class="flex shrink-0 items-center mt-6 sm:mt-0 sm:ml-4 gap-3">
          <button
            mat-flat-button
            (click)="openUserModal()"
            class="!rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <mat-icon svgIcon="plus" class="icon-size-5 mr-2"></mat-icon>
            {{ 'settings.users.create' | transloco }}
          </button>
        </div>
      </div>

      <!-- Main Body -->
      <div class="flex min-h-0 flex-auto flex-col overflow-y-auto">
        <!-- Stat Cards -->
        <div class="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3 md:px-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <app-stat-card
            [title]="'settings.users.total' | transloco"
            [subtitle]="'100% ' + ('dashboard.general.ofTotal' | transloco)"
            [value]="accounts().length"
            digitsInfo="1.0-0"
            icon="users"
            curvePreset="asc-sigmoid"
            color="blue"
            (refresh)="loadUsers()"
          />

          <app-stat-card
            [title]="'settings.users.activeMembers' | transloco"
            [subtitle]="percentageOf(activeCount()) + '% ' + ('dashboard.general.ofTotal' | transloco)"
            [value]="activeCount()"
            digitsInfo="1.0-0"
            icon="user-check"
            curvePreset="asc-sigmoid"
            color="emerald"
            (refresh)="loadUsers()"
          />

          <app-stat-card
            [title]="'settings.users.inactiveMembers' | transloco"
            [subtitle]="percentageOf(inactiveCount()) + '% ' + ('dashboard.general.ofTotal' | transloco)"
            [value]="inactiveCount()"
            digitsInfo="1.0-0"
            icon="user-x"
            curvePreset="trough-wave"
            color="amber"
            (refresh)="loadUsers()"
          />
        </div>

        <!-- Filter Bar -->
        <div
          class="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-neutral-200 bg-white p-6 md:px-8 dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div class="flex min-w-[260px] flex-1 items-center gap-3">
            <div class="relative w-full max-w-md">
              <mat-icon
                svgIcon="search"
                class="icon-size-4 absolute top-1/2 left-3.5 -translate-y-1/2 text-neutral-400"
              ></mat-icon>
              <input
                type="text"
                [placeholder]="'settings.users.search' | transloco"
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)"
                class="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2 pr-4 pl-10 text-sm font-medium text-neutral-900 outline-none focus:border-blue-500 dark:border-neutral-700 dark:bg-neutral-800/50 dark:text-white"
              />
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <!-- Status Filter -->
            <button
              [matMenuTriggerFor]="statusMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50"
            >
              <div class="w-2 h-2 rounded-full" [ngClass]="statusFilter() === 'Active' ? 'bg-emerald-500' : (statusFilter() === 'Inactive' ? 'bg-neutral-500' : 'bg-blue-500')"></div>
              <span>{{ statusFilter() === 'All' ? 'Todos los estados' : (statusFilter() === 'Active' ? 'Activos' : 'Inactivos') }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
            </button>
            <mat-menu #statusMenu="matMenu">
              <button mat-menu-item (click)="statusFilter.set('All')">{{ 'settings.users.allStatuses' | transloco }}</button>
              <button mat-menu-item (click)="statusFilter.set('Active')">{{ 'settings.users.active' | transloco }}</button>
              <button mat-menu-item (click)="statusFilter.set('Inactive')">{{ 'settings.users.inactive' | transloco }}</button>
            </mat-menu>

            <!-- Role Filter -->
            <button
              [matMenuTriggerFor]="roleFilterMenu"
              type="button"
              class="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-bold whitespace-nowrap text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700/50 max-w-[200px]"
            >
              <mat-icon svgIcon="shield" class="icon-size-4 text-neutral-500"></mat-icon>
              <span class="truncate">{{ getSelectedRoleName() }}</span>
              <mat-icon svgIcon="chevron-down" class="icon-size-3.5 text-neutral-400"></mat-icon>
            </button>
            <mat-menu #roleFilterMenu="matMenu">
              <button mat-menu-item (click)="roleFilter.set('All')">{{ 'settings.users.allRoles' | transloco }}</button>
              @for (r of roles(); track r.id) {
                <button mat-menu-item (click)="roleFilter.set(r.id)">{{ r.nombre }}</button>
              }
            </mat-menu>
          </div>
        </div>

        <!-- Users Table -->
        <div class="grid">
          <div
            class="users-grid z-10 sticky top-0 grid gap-4 py-4 px-6 md:px-8 shadow-xs text-[11px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div>{{ 'settings.users.user' | transloco }}</div>
            <div class="hidden sm:block">{{ 'settings.users.role' | transloco }}</div>
            <div>{{ 'common.status' | transloco }}</div>
            <div class="text-right">{{ 'common.actions' | transloco }}</div>
          </div>

          @if (filteredAccounts().length === 0) {
            <div class="flex flex-auto justify-center p-6 sm:p-10">
              <app-empty-state
                [title]="'settings.users.emptyTitle' | transloco"
                [description]="'settings.users.emptyDescription' | transloco"
                [actionLabel]="'settings.users.clearFilters' | transloco"
                actionIcon="refresh-cw"
                (action)="clearFilters()"
              />
            </div>
          } @else {
            @for (account of filteredAccounts(); track account.id) {
              <div
                class="users-grid grid items-center gap-4 py-3.5 px-6 md:px-8 border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors text-sm"
              >
                <!-- Usuario -->
                <div class="flex items-center gap-3 min-w-0">
                  @if (account.avatar && !failedAvatars().has(account.id)) {
                    <img
                      class="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-700 object-cover shrink-0 select-none"
                      [src]="account.avatar"
                      referrerpolicy="no-referrer"
                      (error)="markAvatarFailed(account.id)"
                      [alt]="account.name || account.email"
                    >
                  } @else {
                    <div class="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0 select-none">
                      {{ getInitials(account.name || account.email) }}
                    </div>
                  }
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {{ account.name || account.email.split('@')[0] }}
                    </span>
                    <span class="text-xs text-neutral-400 truncate">
                      {{ account.email }}
                    </span>
                  </div>
                </div>

                <!-- Rol -->
                <div class="hidden sm:block">
                  <span class="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {{ getRoleName(account.roleId, account.isOwner) }}
                  </span>
                </div>

                <!-- Estado -->
                <div>
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                    [ngClass]="account.estado === 'ACTIVO'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20'
                      : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-200/60 dark:border-neutral-700/50'"
                  >
                    {{ account.estado === 'ACTIVO' ? ('settings.users.active' | transloco) : ('settings.users.inactive' | transloco) }}
                  </span>
                </div>

                <!-- Acciones -->
                <div class="flex items-center justify-end gap-1">
                  <button
                    mat-icon-button
                    (click)="openUserModal(account)"
                    class="text-neutral-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                    [matTooltip]="'common.edit' | transloco"
                  >
                    <mat-icon svgIcon="pencil" class="icon-size-4.5"></mat-icon>
                  </button>
                  @if (!account.isOwner) {
                    <button
                      mat-icon-button
                      (click)="deleteUser(account)"
                      class="text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                      [matTooltip]="'common.delete' | transloco"
                    >
                      <mat-icon svgIcon="trash" class="icon-size-4.5 text-rose-500"></mat-icon>
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .users-grid {
      grid-template-columns: minmax(220px, 2fr) minmax(140px, 1.2fr) minmax(110px, 1fr) minmax(90px, 0.8fr);
    }
    @media (max-width: 640px) {
      .users-grid {
        grid-template-columns: minmax(180px, 2fr) minmax(100px, 1fr) minmax(80px, 0.8fr);
      }
    }
  `],
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
  failedAvatars = signal<Set<string>>(new Set<string>());

  markAvatarFailed(id: string): void {
    this.failedAvatars.update((prev) => new Set(prev).add(id));
  }

  getInitials(nameOrEmail?: string): string {
    if (!nameOrEmail) return '?';
    return nameOrEmail
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('');
  }

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
            const currentUser = this.authState.user();
            if (currentUser && currentUser.id === user.id) {
              this.authState.setUser({
                ...currentUser,
                name: res.name || currentUser.name,
                avatar: res.avatar !== undefined ? res.avatar : currentUser.avatar,
              });
            }
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
    if (user.isOwner) {
      this.snackBar.open('Las cuentas de propietario no pueden eliminarse', 'Cerrar', { duration: 3000 });
      return;
    }

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
