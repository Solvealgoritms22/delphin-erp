import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';

@Component({
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink, TranslocoPipe],
  template: `
    <div class="w-full max-w-sm mx-auto text-neutral-900 dark:text-white">
      <h1 class="text-3xl font-bold">{{ 'mfa.loginTitle' | transloco }}</h1>
      <p class="mt-3 mb-6 text-sm text-neutral-500 dark:text-neutral-400">{{ 'mfa.loginHelp' | transloco }}</p>
      <form (ngSubmit)="verify()" class="flex flex-col gap-4">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>{{ 'mfa.code' | transloco }}</mat-label>
          <input matInput name="code" [(ngModel)]="code" autocomplete="one-time-code" placeholder="123456" maxlength="40" required />
        </mat-form-field>
        @if (error()) { <p role="alert" class="text-sm text-rose-600 dark:text-rose-400">{{ 'mfa.invalidCode' | transloco }}</p> }
        <button mat-flat-button type="submit" [disabled]="busy() || !code.trim()">{{ 'mfa.verify' | transloco }}</button>
        <a mat-button routerLink="/auth/sign-in">{{ 'mfa.back' | transloco }}</a>
      </form>
    </div>`,
})
export default class MfaLoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  code = '';
  busy = signal(false);
  error = signal(false);
  verify() {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(false);
    this.auth.verifyMfa(this.code).subscribe({
      next: result => void this.router.navigateByUrl(result.user.mustChangePassword ? '/auth/change-password' : '/admin/dashboards'),
      error: () => { this.busy.set(false); this.error.set(true); this.code = ''; },
      complete: () => this.busy.set(false),
    });
  }
}
