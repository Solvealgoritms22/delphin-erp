import { Component, computed, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'auth-reset-password',
  templateUrl: './reset-password.component.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FormField,
    RouterLink,
    TranslocoPipe,
  ],
})
export default class AuthResetPassword {
  private router = inject(Router);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private transloco = inject(TranslocoService);

  isLoading = signal(false);

  protected resetPasswordFormModel = signal({
    email: '',
    otp: '',
    password: '',
    passwordValidation: '',
  });

  protected passwordStrength = computed(() => {
    const password = this.resetPasswordFormModel().password;
    if (!password) {
      return { score: 0, labelKey: '', color: '', textColor: '' };
    }

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
      return {
        score: 1,
        labelKey: 'auth.resetPassword.strengthWeak',
        color: 'bg-red-500',
        textColor: 'text-red-500 dark:text-red-400',
      };
    } else if (score === 2) {
      return {
        score: 2,
        labelKey: 'auth.resetPassword.strengthMedium',
        color: 'bg-amber-500',
        textColor: 'text-amber-500 dark:text-amber-400',
      };
    } else if (score <= 4) {
      return {
        score: 3,
        labelKey: 'auth.resetPassword.strengthGood',
        color: 'bg-blue-500',
        textColor: 'text-blue-500 dark:text-blue-400',
      };
    } else {
      return {
        score: 4,
        labelKey: 'auth.resetPassword.strengthStrong',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-500 dark:text-emerald-400',
      };
    }
  });

  protected resetPasswordForm = form(this.resetPasswordFormModel, (form) => {
    required(form.email, { message: this.transloco.translate('auth.validation.emailRequired') });
    required(form.otp, { message: this.transloco.translate('auth.validation.otpRequired') });
    required(form.password, { message: this.transloco.translate('auth.validation.passwordRequired') });
    required(form.passwordValidation, {
      message: this.transloco.translate('auth.validation.confirmPasswordRequired'),
    });
    validate(form.passwordValidation, (ctx) => {
      const password = ctx.valueOf(form.password);
      const passwordValidation = ctx.value();

      if (!password || !passwordValidation) return null;

      if (password !== passwordValidation) {
        return {
          kind: 'mismatch',
          message: this.transloco.translate('auth.validation.passwordsMismatch'),
        };
      }

      return null;
    });
  });

  resetPassword(event: Event) {
    event.preventDefault();

    submit(this.resetPasswordForm, async () => {
      this.isLoading.set(true);
      const { email, otp, password } = this.resetPasswordFormModel();
      this.authService.resetPassword(email, otp, password).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open(
            this.transloco.translate('auth.resetPassword.successMessage'),
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 3000 },
          );
          this.router.navigateByUrl('/auth/sign-in');
        },
        error: (err) => {
          this.isLoading.set(false);
          const errorMsg =
            err?.error?.message ||
            'No se pudo restablecer la contraseña. Verifica el código OTP.';
          this.snackBar.open(
            errorMsg,
            this.transloco.translate('common.close') || 'Cerrar',
            { duration: 4000 },
          );
        },
      });
    });
  }
}
