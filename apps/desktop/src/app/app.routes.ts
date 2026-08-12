import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guards';

export const routes: Route[] = [
  // Website routes
  {
    path: 'home',
    loadChildren: () => import('./domains/website/routes'),
  },

  // Auth
  {
    path: 'auth',
    loadChildren: () => import('./domains/auth/routes'),
  },

  // Admin
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

  // Coming soon
  {
    path: 'coming-soon',
    loadChildren: () => import('./domains/coming-soon/routes'),
  },

  // Maintenance
  {
    path: 'maintenance',
    loadChildren: () => import('./domains/maintenance/routes'),
  },

  // Legal
  {
    path: 'legal',
    loadChildren: () => import('./domains/legal/routes'),
  },

  // Global catch all
  { path: '**', redirectTo: '/admin/404' },
];
