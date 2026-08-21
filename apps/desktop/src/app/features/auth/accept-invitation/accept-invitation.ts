import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '@core/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'auth-accept-invitation',
  standalone: true,
   imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, TranslocoPipe],
  template: `
    <div class="flex min-h-full items-center justify-center bg-neutral-50 px-6 py-10 dark:bg-neutral-950">
      <div class="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
         <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{{ 'auth.invitation.label' | transloco }}</p>
         <h1 class="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">{{ 'auth.invitation.title' | transloco }}</h1>
         <p class="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{{ 'auth.invitation.description' | transloco }}</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 flex flex-col gap-4">
          <mat-form-field appearance="outline">
             <mat-label>{{ 'auth.fields.newPassword' | transloco }}</mat-label>
            <input matInput formControlName="newPassword" type="password" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
          </mat-form-field>
          <mat-form-field appearance="outline">
             <mat-label>{{ 'auth.fields.confirmPassword' | transloco }}</mat-label>
            <input matInput formControlName="confirmPassword" type="password" placeholder="Repite tu contraseña" autocomplete="new-password">
          </mat-form-field>
           <p class="text-xs text-neutral-500">{{ 'auth.invitation.passwordHint' | transloco }}</p>
          <mat-checkbox formControlName="acceptedPolicies">
             {{ 'legal.agreeTo' | transloco }} <a class="text-blue-600 underline" routerLink="/legal/terms" target="_blank">{{ 'legal.terms' | transloco }}</a>, {{ 'legal.the' | transloco }}
             <a class="text-blue-600 underline" routerLink="/legal/privacy" target="_blank">{{ 'legal.privacy' | transloco }}</a> {{ 'legal.and' | transloco }}
             <a class="text-blue-600 underline" routerLink="/legal/cookies" target="_blank">{{ 'legal.cookies' | transloco }}</a>.
          </mat-checkbox>
          @if (errorMessage()) {
            <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ errorMessage() }}</p>
          }
          <button type="submit" [disabled]="form.invalid || isSaving()" class="mt-2 h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
             {{ (isSaving() ? 'auth.invitation.activating' : 'auth.invitation.submit') | transloco }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export default class AuthAcceptInvitation implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  token = '';
  isSaving = signal(false);
  errorMessage = signal('');
  form = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
    acceptedPolicies: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
     if (!this.token) this.errorMessage.set(this.transloco.translate('auth.invitation.invalid'));
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid || !this.token) return;
    const value = this.form.getRawValue();
    if (value.newPassword !== value.confirmPassword) {
       this.errorMessage.set(this.transloco.translate('auth.validation.passwordsMismatch'));
      return;
    }
    this.isSaving.set(true);
    this.authService.acceptInvitation({
      token: this.token,
      newPassword: value.newPassword!,
      confirmPassword: value.confirmPassword!,
      acceptedPolicies: value.acceptedPolicies === true,
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigate(['/auth/sign-in'], { queryParams: { invited: 'accepted' } });
      },
      error: (error) => {
        this.isSaving.set(false);
         this.errorMessage.set(error?.error?.message || this.transloco.translate('auth.invitation.error'));
      },
    });
  }
}
