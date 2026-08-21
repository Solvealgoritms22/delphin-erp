import { Routes } from '@angular/router';
import { AdminLayout } from './layout/layout';

const routes: Routes = [

  {
    path: '404',
    loadComponent: () =>
      import('./modules/extras/error/features/error-404'),
  },

  {
    path: '500',
    loadComponent: () =>
      import('./modules/extras/error/features/error-500'),
  },
  {
    path: '',
    component: AdminLayout,
    children: [

      { path: '', pathMatch: 'full', redirectTo: 'dashboards/general' },

      {
        path: 'dashboards',
        loadChildren: () => import('./modules/dashboards/routes'),
      },

      {
        path: 'catalogs',
        loadChildren: () => import('./modules/catalogs/routes'),
      },

      {
        path: 'commercial',
        loadChildren: () => import('./modules/commercial/routes'),
      },

      {
        path: 'sucursales',
        loadChildren: () => import('./modules/sucursales/routes'),
      },

      {
        path: 'settings',
        loadChildren: () => import('./modules/settings/routes'),
      },

      {
        path: 'ai-chat',
        loadChildren: () => import('./modules/apps/ai-chat/routes'),
      },
      {
        path: 'apps/ai-chat',
        redirectTo: 'ai-chat',
      },

      {
        path: 'billing',
        loadChildren: () => import('./modules/apps/billing/routes'),
      },
      {
        path: 'plans',
        loadChildren: () => import('./modules/apps/plans/routes'),
      },
      {
        path: 'activity',
        loadChildren: () => import('./modules/apps/activity/routes'),
      },
      {
        path: 'legal',
        loadChildren: () => import('./modules/apps/legal/routes'),
      },
      {
        path: 'notifications',
        loadChildren: () => import('./modules/extras/notifications/routes'),
      },
      {
        path: 'error',
        loadChildren: () => import('./modules/extras/error/routes'),
      },

      { path: '**', redirectTo: '404' },
    ],
  },
];

export default routes;
