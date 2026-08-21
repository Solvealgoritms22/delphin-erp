import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { RouterLink, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Scheme, Theming } from '@core/theming';
import { AuthService } from '@core/auth/auth.service';
import { AuthState } from '@core/auth/auth.state';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { AccountDialogComponent } from './account-dialog.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { UserRoundIcon, BellIcon, SunIcon, LogOutIcon, ArrowUpRightIcon } from 'ng-animated-icons';

@Component({
  selector: 'user',
  imports: [
    MatDivider,
    MatMenu,
    MatMenuItem,
    MatPseudoCheckbox,
    MatMenuTrigger,
    MatIcon,
    RouterLink,
    TranslocoPipe,
    UserRoundIcon,
    BellIcon,
    SunIcon,
    LogOutIcon,
    ArrowUpRightIcon,
  ],
  template: `
    <button
      class="hover:bg-neutral-100 dark:hover:bg-neutral-800 flex h-14 w-full items-center gap-x-3 rounded-lg px-3 text-left transition-colors cursor-pointer"
      [matMenuTriggerFor]="userMenu"
    >
      @if (user()?.avatar) {
         <img class="size-9 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 select-none" [src]="user()?.avatar" [alt]="'account.avatar' | transloco">
      } @else {
        <div class="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 select-none">
          {{ initials() }}
        </div>
      }
      <div class="flex min-w-0 flex-auto flex-col select-none">
        <div class="truncate font-medium">{{ displayName() }}</div>
        <div class="text-on-surface-variant truncate text-sm">
          {{ email() }}
        </div>
      </div>
      <mat-icon svgIcon="ellipsis-vertical" class="icon-size-4 text-neutral-400 shrink-0"></mat-icon>
    </button>

    <mat-menu
      class="min-w-60"
      xPosition="before"
      yPosition="above"
      #userMenu="matMenu"
    >
      <button
        class="py-2 [&>span]:flex [&>span]:items-center"
        mat-menu-item
      >
        @if (user()?.avatar) {
           <img class="size-9 rounded-lg object-cover border border-neutral-200 dark:border-neutral-700 shrink-0 select-none" [src]="user()?.avatar" [alt]="'account.avatar' | transloco">
        } @else {
          <div class="size-9 rounded-lg bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 select-none">
            {{ initials() }}
          </div>
        }
        <div class="ml-3 flex min-w-0 flex-auto flex-col select-none">
          <div class="truncate font-medium">{{ displayName() }}</div>
          <div class="text-on-surface-variant truncate text-xs">
            {{ email() }}
          </div>
        </div>
      </button>
      <mat-divider />
      @if (!isEnterprise()) {
        <button mat-menu-item (click)="goToPlans()">
           <i-arrow-up-right [size]="18" class="mr-3" />
           {{ 'layout.user.upgrade' | transloco }}
        </button>
        <mat-divider />
      }
      <button mat-menu-item (click)="openAccountModal()">
        <i-user-round [size]="18" class="mr-3" />
         {{ 'layout.user.account' | transloco }}
      </button>
      <button mat-menu-item routerLink="/admin/billing">
        <mat-icon svgIcon="wallet" class="mr-3 icon-size-5"></mat-icon>
         {{ 'layout.user.billing' | transloco }}
      </button>
       <button mat-menu-item routerLink="/admin/notifications">
        <i-bell [size]="18" class="mr-3" />
         {{ 'layout.user.notifications' | transloco }}
      </button>
      <mat-divider />
      <button
        mat-menu-item
        [matMenuTriggerFor]="appearanceMenu"
      >
        <i-sun [size]="18" class="mr-3" />
         {{ 'layout.user.appearance' | transloco }}
      </button>
      <mat-divider />
      <button
        mat-menu-item
        (click)="signOut()"
      >
        <i-log-out [size]="18" class="mr-3 text-red-500" />
         {{ 'layout.user.signOut' | transloco }}
      </button>
    </mat-menu>

    <mat-menu #appearanceMenu="matMenu">
      @for (item of schemes; track item.value) {
        <button
          mat-menu-item
          (click)="updateScheme(item.value)"
        >
          <mat-pseudo-checkbox
            appearance="minimal"
            class="mr-2"
            [state]="scheme() === item.value ? 'checked' : 'unchecked'"
          />
           <span>{{ item.label | transloco }}</span>
        </button>
      }
    </mat-menu>
  `,
})
export class User implements OnInit {

  private http = inject(HttpClient);
  private theming = inject(Theming);
  private authService = inject(AuthService);
  private authState = inject(AuthState);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private transloco = inject(TranslocoService);

  protected isEnterprise = signal(false);
  protected scheme = computed(() => this.theming.scheme());
  protected schemes: { label: string; value: Scheme }[] = [
     { label: 'layout.scheme.light', value: 'light' },
     { label: 'layout.scheme.dark', value: 'dark' },
     { label: 'layout.scheme.system', value: 'system' },
  ];

  protected user = this.authState.user;

  ngOnInit() {
    this.http.get<any>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (data) => {
        const plan = (data?.plan || '').toLowerCase();
        this.isEnterprise.set(plan === 'enterprise');
      }
    });
  }

  goToPlans() {
    this.router.navigate(['/admin/plans']);
  }

  openAccountModal() {
    this.dialog.open(AccountDialogComponent, {
      width: '100%',
      maxWidth: '28rem',
    });
  }

  protected displayName = computed(() => {
    const u = this.user();
     if (!u) return this.transloco.translate('layout.user.guest');
    const fromEmail = u.email ? u.email.split('@')[0] : '';
    return u.name && u.name !== fromEmail ? u.name : fromEmail;
  });

  protected email = computed(() => this.user()?.email ?? '');

  protected initials = computed(() => {
    const name = this.displayName();
    if (!name) return '?';
    return name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  });

  updateScheme(scheme: Scheme) {
    this.theming.setScheme(scheme);
  }

  signOut() {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '100%',
      maxWidth: '26rem',
      data: {
         title: this.transloco.translate('layout.user.signOut'),
         message: this.transloco.translate('layout.user.signOutMessage'),
         confirmLabel: this.transloco.translate('layout.user.signOut'),
         cancelLabel: this.transloco.translate('common.cancel'),
        icon: 'log-out',
        destructive: false,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.authService.signOut().subscribe(() => {
        this.router.navigate(['/auth/sign-in']);
      });
    });
  }
}
