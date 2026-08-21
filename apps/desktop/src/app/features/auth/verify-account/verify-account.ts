import { Component, inject, signal, OnInit } from '@angular/core';
import {
  form,
  FormField,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'auth-verify-account',
  templateUrl: './verify-account.component.html',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    FormField,
    MatCard,
    RouterLink,
  ],
})
export default class AuthVerifyAccount implements OnInit {

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);
  private snackBar = inject(MatSnackBar);

  protected verifyFormModel = signal({
    email: '',
    otp: '',
  });

  protected verifyForm = form(this.verifyFormModel, (form) => {
    required(form.email, { message: this.transloco.translate('auth.validation.emailRequired') });
    required(form.otp, { message: this.transloco.translate('auth.validation.otpRequired') });
  });

  protected isLoading = signal(false);
  protected isResending = signal(false);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.verifyFormModel.update(model => ({ ...model, email: params['email'] }));
      }
    });
  }

  verifyAccount(event: Event) {
    event.preventDefault();

    submit(this.verifyForm, async () => {
      this.isLoading.set(true);
      const { email, otp } = this.verifyFormModel();
      this.authService.verifyAccount(email, otp).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackBar.open('Cuenta verificada exitosamente. Ya puedes iniciar sesión.', this.transloco.translate('common.close'), {
            duration: 5000,
            panelClass: ['snack-success'],
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
          this.router.navigateByUrl('/auth/sign-in');
        },
        error: (err) => {
          this.isLoading.set(false);
          const message = err?.error?.message || 'Código OTP inválido o expirado';
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

  resendCode(event: Event) {
    event.preventDefault();
    const { email } = this.verifyFormModel();

    if (!email) {
      this.snackBar.open('El correo es requerido para reenviar el código.', this.transloco.translate('common.close'), {
        duration: 3000,
        panelClass: ['snack-error'],
      });
      return;
    }

    this.isResending.set(true);
    this.authService.resendVerification(email).subscribe({
      next: () => {
        this.isResending.set(false);
        this.snackBar.open('Un nuevo código ha sido enviado a tu correo.', this.transloco.translate('common.close'), {
          duration: 5000,
          panelClass: ['snack-success'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      error: (err) => {
        this.isResending.set(false);
        const message = err?.error?.message || 'Error al reenviar el código.';
        this.snackBar.open(message, this.transloco.translate('common.close'), {
          duration: 5000,
          panelClass: ['snack-error'],
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      }
    });
  }
}
