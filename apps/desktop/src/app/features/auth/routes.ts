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
          import('./forgot-password/forgot-password.component'),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./reset-password/reset-password.component'),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./change-password/change-password.component'),
      },
      {
        path: 'google/setup',
        loadComponent: () =>
          import('./google-setup/google-setup.component'),
      },
      {
        path: 'accept-invitation',
        loadComponent: () =>
          import('./accept-invitation/accept-invitation.component'),
      },
      {
        path: 'sign-in',
        loadComponent: () => import('./sign-in/sign-in.component'),
      },
      {
        path: 'sign-up',
        loadComponent: () => import('./sign-up/sign-up.component'),
      },
      {
        path: 'verify-account',
        loadComponent: () => import('./verify-account/verify-account.component'),
      },
    ],
  },
];

export default routes;
