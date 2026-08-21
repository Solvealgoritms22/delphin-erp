import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('../../layout/public/legal-layout.component'),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'terms',
      },
      {
        path: 'privacy',
        loadComponent: () => import('./features/privacy/privacy'),
      },
      {
        path: 'terms',
        loadComponent: () => import('./features/terms/terms'),
      },
      {
        path: 'cookies',
        loadComponent: () => import('./features/cookies/cookies'),
      },
      {
        path: 'subscription',
        loadComponent: () => import('./features/subscription/subscription'),
      },
    ],
  },
] as Routes;
