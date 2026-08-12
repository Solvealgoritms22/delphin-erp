import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { AuthState } from '@/app/core/auth/auth.state';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'auth-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex min-h-full items-center justify-center bg-neutral-50 px-6 py-10 dark:bg-neutral-950">
      <div class="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div class="mb-8">
          <div class="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <mat-icon svgIcon="lock-keyhole" class="icon-size-5"></mat-icon>
          </div>
           <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{{ 'auth.changePassword.firstAccess' | transloco }}</p>
           <h1 class="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">{{ 'auth.changePassword.title' | transloco }}</h1>
          <p class="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">
             {{ 'auth.changePassword.description' | transloco }}
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          <mat-form-field appearance="outline">
             <mat-label>{{ 'auth.changePassword.currentPassword' | transloco }}</mat-label>
            <input matInput formControlName="currentPassword" type="password" placeholder="Contraseña actual" autocomplete="current-password">
          </mat-form-field>
          <mat-form-field appearance="outline">
             <mat-label>{{ 'auth.fields.newPassword' | transloco }}</mat-label>
            <input matInput formControlName="newPassword" type="password" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
            @if (form.get('newPassword')?.hasError('minlength')) {
               <mat-error>{{ 'auth.validation.minPassword' | transloco }}</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
             <mat-label>{{ 'auth.fields.confirmNewPassword' | transloco }}</mat-label>
            <input matInput formControlName="confirmPassword" type="password" placeholder="Repite la nueva contraseña" autocomplete="new-password">
          </mat-form-field>

          @if (errorMessage()) {
            <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ errorMessage() }}</p>
          }

          <button type="submit" [disabled]="form.invalid || isSaving()" class="mt-2 h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
             {{ (isSaving() ? 'common.saving' : 'auth.changePassword.submit') | transloco }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export default class AuthChangePassword {
  private readonly authService = inject(AuthService);
  private readonly authState = inject(AuthState);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  isSaving = signal(false);
  errorMessage = signal('');
  user = this.authState.user;

  form = this.formBuilder.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid) return;

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
       this.errorMessage.set(this.transloco.translate('auth.validation.passwordsMismatch'));
      return;
    }

    this.isSaving.set(true);
    this.authService.changePassword(currentPassword!, newPassword!).subscribe({
      next: () => {
        const currentUser = this.authState.user();
        if (currentUser) {
          this.authState.setUser({ ...currentUser, mustChangePassword: false });
        }
        this.isSaving.set(false);
        this.router.navigateByUrl('/admin/dashboards');
      },
      error: (error) => {
        this.isSaving.set(false);
         this.errorMessage.set(error?.error?.message || this.transloco.translate('auth.changePassword.error'));
      },
    });
  }
}
