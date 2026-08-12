import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'general',
  },
  {
    path: 'general',
    loadComponent: () => import('./features/general/general').then(m => m.DashboardGeneralComponent),
  },
  {
    path: 'project',
    loadComponent: () => import('./features/project/project'),
  },
  {
    path: 'analytics',
    loadComponent: () => import('./features/analytics/analytics'),
  },
  {
    path: 'finance',
    loadComponent: () => import('./features/finance/finance'),
  },
];

export default routes;
