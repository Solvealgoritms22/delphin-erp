import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./legal'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'terms',
      },
      {
        path: 'terms',
        loadComponent: () =>
          import('../../../../legal/features/terms/terms'),
      },
      {
        path: 'privacy',
        loadComponent: () =>
          import('../../../../legal/features/privacy/privacy'),
      },
      {
        path: 'cookies',
        loadComponent: () =>
          import('../../../../legal/features/cookies/cookies'),
      },
      {
        path: 'subscription',
        loadComponent: () =>
          import('../../../../legal/features/subscription/subscription'),
      },
    ],
  },
] as Routes;
