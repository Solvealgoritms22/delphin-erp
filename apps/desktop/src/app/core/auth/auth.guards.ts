import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthState } from './auth.state';

export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated() && authState.user()?.mustChangePassword) {
    return router.createUrlTree(['/auth/change-password']);
  }

  if (authState.isAuthenticated()) {
    return true;
  }

  // Redirect to the login page with the return url
  return router.createUrlTree(['/auth/sign-in'], {
    queryParams: { redirectUrl: state.url },
  });
};

export const guestGuard: CanActivateFn = (route) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated()) {
    if (authState.user()?.mustChangePassword) {
      return route.routeConfig?.path === '' || route.routeConfig?.path === 'change-password'
        ? true
        : router.createUrlTree(['/auth/change-password']);
    }
    // Redirect to the admin dashboard
    return router.createUrlTree(['/admin']);
  }

  return true;
};

export const permissionGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (!authState.isAuthenticated()) {
    return router.createUrlTree(['/auth/sign-in'], {
      queryParams: { redirectUrl: state.url },
    });
  }

  const requiredPermissions = route.data['permissions'] as string[];
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true; // No specific permissions required
  }

  const user = authState.user();
  if (!user || !user.permissions) {
    return router.createUrlTree(['/admin']);
  }

  // Owner wildcard check
  if (user.permissions.includes('*')) {
    return true;
  }

  const hasPermission = requiredPermissions.every(p => user.permissions!.includes(p));

  if (!hasPermission) {
    // User does not have the required permissions
    return router.createUrlTree(['/admin/404']);
  }

  return true;
};
