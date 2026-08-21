import { Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'auth-forgot-password',
  templateUrl: './forgot-password.component.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    FormField,
    MatCard,
    RouterLink,
    TranslocoPipe,
  ],
})
export default class AuthForgotPassword {

  private router = inject(Router);
  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);

  protected forgotPasswordFormModel = signal({
    email: '',
  });
  protected forgotPasswordForm = form(this.forgotPasswordFormModel, (form) => {
    required(form.email, { message: this.transloco.translate('auth.validation.emailRequired') });
    email(form.email, { message: this.transloco.translate('auth.validation.emailInvalid') });
  });

  forgotPassword(event: Event) {
    event.preventDefault();

    submit(this.forgotPasswordForm, async () => {
      this.authService.forgotPassword(this.forgotPasswordFormModel().email).subscribe({
        next: () => {
          this.router.navigateByUrl('/auth/reset-password');
        },
        error: (err) => {
          console.error(err);
        }
      });
    });
  }
}
