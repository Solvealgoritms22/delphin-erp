import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthState } from '../auth/auth.state';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authState = inject(AuthState);
  const router = inject(Router);
  const dialog = inject(MatDialog, { optional: true });

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // El endpoint de setup de MFA maneja sus propios errores en el componente; no debe invalidar la sesión completa
        if (req.url.includes('/auth/mfa/setup')) {
          return throwError(() => error);
        }

        const hadSession = authState.isAuthenticated();
        authState.clearSession();
        dialog?.closeAll();

        if (hadSession && typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
          router.navigate(['/auth/sign-in']);
        }
      } else if (error.status === 503) {
        dialog?.closeAll();
        router.navigate(['/maintenance']);
      }

      return throwError(() => error);
    })
  );
};
