import { Routes } from '@angular/router';
import { guestGuard } from '@/app/core/auth/auth.guards';

const routes: Routes = [
  {
    path: '',
    canActivate: [guestGuard],
    canActivateChild: [guestGuard],
    loadComponent: () => import('./layout'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'sign-in',
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/forgot-password/forgot-password'),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/reset-password/reset-password'),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/change-password/change-password'),
      },
      {
        path: 'google/setup',
        loadComponent: () =>
          import('./features/google-setup/google-setup'),
      },
      {
        path: 'accept-invitation',
        loadComponent: () =>
          import('./features/accept-invitation/accept-invitation'),
      },
      {
        path: 'sign-in',
        loadComponent: () => import('./features/sign-in/sign-in'),
      },
      {
        path: 'sign-up',
        loadComponent: () => import('./features/sign-up/sign-up'),
      },
      {
        path: 'verify-account',
        loadComponent: () => import('./features/verify-account/verify-account'),
      },
    ],
  },
];

export default routes;
