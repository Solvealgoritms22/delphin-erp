import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/list';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { RouterLink, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Scheme, Theming } from '@/app/core/theming';
import { AuthService } from '@/app/core/auth/auth.service';
import { AuthState } from '@/app/core/auth/auth.state';
import { ConfirmDialogComponent } from '@/app/shared/components/confirm-dialog/confirm-dialog.component';
import { AccountDialogComponent } from './account-dialog.component';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'user',
  imports: [
    MatDivider,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatPseudoCheckbox,
    MatMenuTrigger,
    RouterLink,
    TranslocoPipe,
  ],
  template: `
    <button
      class="flex w-full cursor-pointer items-center gap-x-3 rounded-xl p-2 text-left hover:bg-neutral-700/10 dark:hover:bg-neutral-300/10"
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
      <mat-icon
        class="size-4"
        svgIcon="ellipsis-vertical"
      />
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
           <mat-icon svgIcon="arrow-up-right" />
           {{ 'layout.user.upgrade' | transloco }}
        </button>
        <mat-divider />
      }
      <button mat-menu-item (click)="openAccountModal()">
        <mat-icon svgIcon="user-round" />
         {{ 'layout.user.account' | transloco }}
      </button>
      <button mat-menu-item routerLink="/admin/billing">
        <mat-icon svgIcon="wallet" />
         {{ 'layout.user.billing' | transloco }}
      </button>
       <button mat-menu-item routerLink="/admin/notifications">
        <mat-icon svgIcon="bell" />
         {{ 'layout.user.notifications' | transloco }}
      </button>
      <mat-divider />
      <button
        mat-menu-item
        [matMenuTriggerFor]="appearanceMenu"
      >
        <mat-icon svgIcon="sun-moon" />
         {{ 'layout.user.appearance' | transloco }}
      </button>
      <mat-divider />
      <button
        mat-menu-item
        (click)="signOut()"
      >
        <mat-icon svgIcon="log-out" />
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
  // Dependencies
  private http = inject(HttpClient);
  private theming = inject(Theming);
  private authService = inject(AuthService);
  private authState = inject(AuthState);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private transloco = inject(TranslocoService);

  // State
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
