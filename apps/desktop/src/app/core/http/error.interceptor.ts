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
        // Avoid a hard reload loop: only redirect when there was an active session.
        if (hadSession && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          router.navigate(['/auth/sign-in']);
        }
      } else if (error.status === 503) {
        router.navigate(['/maintenance']);
      }

      const errorMessage = error.error?.message || error.statusText;
      console.error('API Error:', errorMessage);

      return throwError(() => new Error(errorMessage));
    })
  );
};
