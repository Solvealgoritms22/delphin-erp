import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { LanguageSwitcher } from '@layout/admin/ui/locale-selector.component';

@Component({
  selector: 'auth-mfa-login',
  standalone: true,
  templateUrl: './mfa-login.component.html',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink,
    TranslocoPipe,
    LanguageSwitcher,
  ],
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
