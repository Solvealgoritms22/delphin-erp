import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthState } from './auth.state';
import { PermissionService } from '../permissions/permission.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated() && authState.user()?.mustChangePassword) {
    return router.createUrlTree(['/auth/change-password']);
  }

  if (authState.isAuthenticated()) {
    return true;
  }

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

    return router.createUrlTree(['/admin']);
  }

  return true;
};

export const permissionGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const permissionService = inject(PermissionService);
  const router = inject(Router);

  if (!authState.isAuthenticated()) {
    return router.createUrlTree(['/auth/sign-in'], {
      queryParams: { redirectUrl: state.url },
    });
  }

  const requiredPermissions = route.data?.['permissions'] as string[] | undefined;
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }

  const hasPermission = requiredPermissions.every((p) =>
    permissionService.hasPermission(p)
  );

  if (!hasPermission) {
    return router.createUrlTree(['/admin/dashboards/general']);
  }

  return true;
};
