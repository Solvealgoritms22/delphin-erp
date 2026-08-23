import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthState } from '../auth/auth.state';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        const hadSession = authState.isAuthenticated();
        authState.clearSession();

        if (hadSession && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          router.navigate(['/auth/sign-in']);
        }
      } else if (error.status === 503) {
        router.navigate(['/maintenance']);
      }

      return throwError(() => error);
    })
  );
};
