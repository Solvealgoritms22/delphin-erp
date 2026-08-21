import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guards';

export const routes: Route[] = [

  {
    path: 'home',
    loadChildren: () => import('./features/public/website/routes'),
  },

  {
    path: 'auth',
    loadChildren: () => import('./features/auth/routes'),
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
    loadChildren: () => import('./layout/admin/routes'),
  },

  {
    path: 'coming-soon',
    loadChildren: () => import('./features/public/coming-soon/routes'),
  },

  {
    path: 'maintenance',
    loadChildren: () => import('./features/public/maintenance/routes'),
  },

  {
    path: 'legal',
    loadChildren: () => import('./features/public/legal/routes'),
  },

  { path: '**', redirectTo: '/admin/404' },
];
