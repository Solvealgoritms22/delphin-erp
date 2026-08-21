import { Component, computed, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  required,
  submit,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { EyeOffIcon } from 'ng-animated-icons';
import { CountryFlagComponent } from '@shared/components/country-flag/country-flag.component';

@Component({
  selector: 'auth-sign-up',
  templateUrl: './sign-up.component.html',
  imports: [
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    FormField,
    TranslocoPipe,
    EyeOffIcon,
    CountryFlagComponent,
  ],
})
export default class AuthSignUp {

  private router = inject(Router);
  private authService = inject(AuthService);
  private transloco = inject(TranslocoService);
  private snackBar = inject(MatSnackBar);

  protected isLoading = signal(false);
  protected signUpFormModel = signal({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    country: 'DO',
    documentType: 'RNC',
    documentNumber: '',
    phone: '+1 809 ',
    agreements: false,
    subscription: false,
  });
  protected signUpForm = form(this.signUpFormModel, (form) => {
    required(form.name, { message: this.transloco.translate('auth.validation.nameRequired') });
    required(form.email, { message: this.transloco.translate('auth.validation.emailRequired') });
    email(form.email, { message: this.transloco.translate('auth.validation.emailInvalid') });
    required(form.password, { message: this.transloco.translate('auth.validation.passwordRequired') });
    required(form.confirmPassword, { message: this.transloco.translate('auth.validation.confirmPasswordRequired') });
    required(form.company, { message: this.transloco.translate('auth.validation.companyRequired') });
    required(form.country, { message: this.transloco.translate('auth.validation.countryRequired') });
    required(form.documentType, { message: this.transloco.translate('auth.validation.documentTypeRequired') });
    required(form.documentNumber, { message: this.transloco.translate('auth.validation.documentNumberRequired') });
    required(form.agreements, { message: this.transloco.translate('auth.validation.termsRequired') });
    required(form.subscription, { message: this.transloco.translate('auth.validation.subscriptionRequired') });
  });

  protected passwordStrength = computed(() => {
    const password = this.signUpFormModel().password;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    const levels = [
      { label: this.transloco.translate('auth.passwordStrength.none'), color: '#d4d4d8' },
      { label: this.transloco.translate('auth.passwordStrength.veryWeak'), color: '#ef4444' },
      { label: this.transloco.translate('auth.passwordStrength.weak'), color: '#f97316' },
      { label: this.transloco.translate('auth.passwordStrength.medium'), color: '#eab308' },
      { label: this.transloco.translate('auth.passwordStrength.good'), color: '#22c55e' },
      { label: this.transloco.translate('auth.passwordStrength.strong'), color: '#16a34a' },
    ];
    return { score, ...levels[score] };
  });

  protected passwordsMatch = computed(() => {
    const value = this.signUpFormModel();
    return !value.confirmPassword || value.password === value.confirmPassword;
  });

  protected countries = [
    { code: 'DO', label: 'República Dominicana', disabled: false },
    { code: 'US', label: 'Estados Unidos', disabled: true },
    { code: 'ES', label: 'España', disabled: true },
  ];

  protected documentTypes = computed(() => {
    const country = this.signUpFormModel().country;
    if (country === 'US') return [{ value: 'EIN', label: 'EIN' }, { value: 'SSN', label: 'SSN' }];
    if (country === 'ES') return [{ value: 'NIF', label: 'NIF' }, { value: 'CIF', label: 'CIF' }];
    return [{ value: 'RNC', label: 'RNC' }];
  });

  protected phonePlaceholder = computed(() => {
    const country = this.signUpFormModel().country;
    return country === 'DO' ? '+1 809 555 0000' : country === 'US' ? '+1 555 000 0000' : '+34 600 000 000';
  });

  protected setCountry(country: string): void {
    const documentType = country === 'US' ? 'EIN' : country === 'ES' ? 'NIF' : 'RNC';
    const phone = country === 'DO' ? '+1 809 ' : country === 'US' ? '+1 ' : '+34 ';
    this.signUpFormModel.update((value) => ({ ...value, country, documentType, phone }));
  }

  signUp(event: Event) {
    event.preventDefault();

    submit(this.signUpForm, async () => {
      this.isLoading.set(true);
      this.authService.signUp(this.signUpFormModel()).subscribe({
        next: (res) => {
          this.isLoading.set(false);
           if (res && res.needsVerification) {
             this.router.navigate(['/auth/verify-account'], { queryParams: { email: res.email } });
           } else {
             this.router.navigateByUrl('/auth/sign-in');
           }
        },
        error: (err) => {
          this.isLoading.set(false);
          console.error(err);
          const message = err?.error?.message || 'Ocurrió un error al intentar registrarte.';
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
