import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthState } from './auth.state';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  const token = authState.accessToken();

  let clonedReq = req;
  const isAuthRequest = req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/verify-otp') ||
    req.url.includes('/auth/reset-password') ||
    req.url.includes('/auth/verify-account') ||
    req.url.includes('/auth/resend-verification') ||
    req.url.includes('/auth/invitations/accept') ||
    req.url.includes('/auth/google');

  if (token && !isAuthRequest) {
    clonedReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 402: Trial expirado o suscripción inactiva → redirigir a facturación
      if (error.status === 402) {
        const code = error.error?.code;
        if (code === 'TRIAL_EXPIRED' || code === 'SUBSCRIPTION_INACTIVE') {
          router.navigate(['/admin/billing'], {
            queryParams: { reason: code }
          });
        }
      }
      return throwError(() => error);
    })
  );
};
