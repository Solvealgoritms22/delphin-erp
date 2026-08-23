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
  selector: 'auth-google-setup',
  standalone: true,
   imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, TranslocoPipe],
  template: `
    <div class="flex min-h-full items-center justify-center bg-neutral-50 px-6 py-10 dark:bg-neutral-950">
      <div class="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
         <p class="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">{{ 'auth.googleSetup.label' | transloco }}</p>
         <h1 class="mt-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white">{{ 'auth.googleSetup.title' | transloco }}</h1>
         <p class="mt-2 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{{ 'auth.googleSetup.description' | transloco }}{{ needsCompany() ? ('auth.googleSetup.companySuffix' | transloco) : '' }}.</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-8 flex flex-col gap-4">
          @if (needsCompany()) {
            <mat-form-field appearance="outline">
               <mat-label>{{ 'auth.fields.company' | transloco }}</mat-label>
              <input matInput formControlName="companyName" placeholder="Nombre comercial de tu empresa">
            </mat-form-field>
            <mat-form-field appearance="outline">
               <mat-label>{{ 'auth.googleSetup.taxId' | transloco }}</mat-label>
              <input matInput formControlName="rnc" placeholder="130123456">
            </mat-form-field>
          }

          <mat-checkbox formControlName="acceptedPolicies">
             {{ 'legal.agreeTo' | transloco }} <a class="text-blue-600 underline" routerLink="/legal/terms" target="_blank">{{ 'legal.terms' | transloco }}</a>, {{ 'legal.the' | transloco }}
             <a class="text-blue-600 underline" routerLink="/legal/privacy" target="_blank">{{ 'legal.privacy' | transloco }}</a> {{ 'legal.and' | transloco }}
             <a class="text-blue-600 underline" routerLink="/legal/cookies" target="_blank">{{ 'legal.cookies' | transloco }}</a>.
          </mat-checkbox>

          @if (errorMessage()) {
            <p class="text-sm font-medium text-red-600 dark:text-red-400">{{ errorMessage() }}</p>
          }
          <button type="submit" [disabled]="form.invalid || isSaving()" class="mt-3 h-11 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
             {{ (isSaving() ? 'auth.googleSetup.preparing' : 'auth.googleSetup.submit') | transloco }}
          </button>
        </form>
      </div>
    </div>
  `,
})
export default class AuthGoogleSetup implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly transloco = inject(TranslocoService);

  code = '';
  needsCompany = signal(false);
  isSaving = signal(false);
  errorMessage = signal('');
  form = this.fb.group({
    companyName: [''],
    rnc: [''],
    acceptedPolicies: [false, Validators.requiredTrue],
  });

  ngOnInit(): void {
    this.code = this.route.snapshot.queryParamMap.get('code') || '';
    const needsCompany = this.route.snapshot.queryParamMap.get('needsCompany') === 'true';
    this.needsCompany.set(needsCompany);
    if (needsCompany) this.form.controls.companyName.addValidators(Validators.required);
     if (!this.code) this.errorMessage.set(this.transloco.translate('auth.googleSetup.invalid'));
  }

  submit(): void {
    this.errorMessage.set('');
    if (this.form.invalid || !this.code) return;
    this.isSaving.set(true);
    const value = this.form.getRawValue();
    this.authService.completeGoogleSetup({
      code: this.code,
      acceptedPolicies: value.acceptedPolicies === true,
      companyName: value.companyName || undefined,
      rnc: value.rnc || undefined,
    }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.router.navigateByUrl('/admin/dashboards');
      },
      error: (error) => {
        this.isSaving.set(false);
         this.errorMessage.set(error?.error?.message || this.transloco.translate('auth.googleSetup.error'));
      },
    });
  }
}
