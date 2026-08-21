import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guards';

export const routes: Route[] = [

  {
    path: 'home',
    loadChildren: () => import('./domains/website/routes'),
  },

  {
    path: 'auth',
    loadChildren: () => import('./domains/auth/routes'),
  },

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin',
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadChildren: () => import('./domains/admin/routes'),
  },

  {
    path: 'coming-soon',
    loadChildren: () => import('./domains/coming-soon/routes'),
  },

  {
    path: 'maintenance',
    loadChildren: () => import('./domains/maintenance/routes'),
  },

  {
    path: 'legal',
    loadChildren: () => import('./domains/legal/routes'),
  },

  { path: '**', redirectTo: '/admin/404' },
];
