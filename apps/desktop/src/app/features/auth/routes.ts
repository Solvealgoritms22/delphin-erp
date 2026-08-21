import { Routes } from '@angular/router';
import { guestGuard } from '@core/auth/auth.guards';

const routes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    canActivateChild: [guestGuard],
    loadComponent: () => import('@layout/auth/auth-layout.component'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sign-in',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/forgot-password/forgot-password.component'),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/reset-password/reset-password.component'),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/change-password/change-password.component'),
      },
      {
        path: 'google/setup',
        loadComponent: () =>
          import('./features/google-setup/google-setup.component'),
      },
      {
        path: 'accept-invitation',
        loadComponent: () =>
          import('./features/accept-invitation/accept-invitation.component'),
      },
      {
        path: 'sign-in',
        loadComponent: () => import('./features/sign-in/sign-in.component'),
      },
      {
        path: 'sign-up',
        loadComponent: () => import('./features/sign-up/sign-up.component'),
      },
      {
        path: 'verify-account',
        loadComponent: () => import('./features/verify-account/verify-account.component'),
      },
    ],
  },
];

export default routes;
