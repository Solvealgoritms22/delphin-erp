import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDivider } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'auth-sign-in',
  templateUrl: './sign-in.html',
  imports: [
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FormField,
    MatDivider,
    TranslocoPipe,
  ],
})
export default class AuthSignIn {
  // Dependencies
  private router = inject(Router);
  protected authService = inject(AuthService);
  private transloco = inject(TranslocoService);
  private snackBar = inject(MatSnackBar);

  // State
  protected signInFormModel = signal({
    email: 'admin@dolphin.com',
    password: 'admin123',
  });
  protected signInForm = form(this.signInFormModel, (form) => {
    required(form.email, { message: this.transloco.translate('auth.validation.emailRequired') });
    email(form.email, { message: this.transloco.translate('auth.validation.emailInvalid') });

    required(form.password, { message: this.transloco.translate('auth.validation.passwordRequired') });
  });
  protected isLoading = signal(false);
  protected accessMode = signal<'owner' | 'member'>('owner');

  signIn(event: Event) {
    event.preventDefault();

    submit(this.signInForm, async () => {
      this.isLoading.set(true);

      this.authService.signIn({
        email: this.signInFormModel().email,
        password: this.signInFormModel().password,
        accessMode: this.accessMode()
      }).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.router.navigateByUrl(
            response.user.mustChangePassword
              ? '/auth/change-password'
              : '/admin/dashboards',
          );
        },
        error: (err: any) => {
          this.isLoading.set(false);
          const message = this.transloco.translate('auth.errors.invalidCredentials');
          this.snackBar.open(message, this.transloco.translate('common.close'), {
            duration: 5000,
            panelClass: ['snack-error'],
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        }
      });
    });
  }
}
