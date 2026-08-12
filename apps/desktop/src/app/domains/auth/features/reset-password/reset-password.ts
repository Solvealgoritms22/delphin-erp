import { Component, inject, signal } from '@angular/core';
import {
  form,
  FormField,
  required,
  submit,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
@Component({
  selector: 'auth-reset-password',
  templateUrl: './reset-password.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FormField,
    MatCard,
    TranslocoPipe,
  ],
})
export default class AuthResetPassword {
  // Dependencies
  private router = inject(Router);
  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);

  // State
  protected resetPasswordFormModel = signal({
    email: '',
    otp: '',
    password: '',
    passwordValidation: '',
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
      const { email, otp, password } = this.resetPasswordFormModel();
      this.authService.resetPassword(email, otp, password).subscribe({
        next: () => {
          this.router.navigateByUrl('/auth/sign-in');
        },
        error: (err) => {
          console.error(err);
        }
      });
    });
  }
}
