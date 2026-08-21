import { Routes } from '@angular/router';
import { AdminLayout } from './layout/layout';

const routes: Routes = [
  // 404 Standalone (Fullscreen)
  {
    path: '404',
    loadComponent: () =>
      import('./modules/extras/error/features/error-404'),
  },
  // 500 Standalone (Fullscreen)
  {
    path: '500',
    loadComponent: () =>
      import('./modules/extras/error/features/error-500'),
  },
  {
    path: '',
    component: AdminLayout,
    children: [
      // Redirect empty path to dashboards
      { path: '', pathMatch: 'full', redirectTo: 'dashboards/general' },

      // -----------------------------------------------------------------------
      // Dashboards
      // -----------------------------------------------------------------------
      {
        path: 'dashboards',
        loadChildren: () => import('./modules/dashboards/routes'),
      },
      
      // -----------------------------------------------------------------------
      // Catalogs
      // -----------------------------------------------------------------------
      {
        path: 'catalogs',
        loadChildren: () => import('./modules/catalogs/routes'),
      },
      
      // -----------------------------------------------------------------------
      // Commercial
      // -----------------------------------------------------------------------
      {
        path: 'commercial',
        loadChildren: () => import('./modules/commercial/routes'),
      },

      // -----------------------------------------------------------------------
      // Sucursales
      // -----------------------------------------------------------------------
      {
        path: 'sucursales',
        loadChildren: () => import('./modules/sucursales/routes'),
      },

      // -----------------------------------------------------------------------
      // Settings
      // -----------------------------------------------------------------------
      {
        path: 'settings',
        loadChildren: () => import('./modules/settings/routes'),
      },

      // -----------------------------------------------------------------------
      // AI Chat
      // -----------------------------------------------------------------------
      {
        path: 'ai-chat',
        loadChildren: () => import('./modules/apps/ai-chat/routes'),
      },
      {
        path: 'apps/ai-chat',
        redirectTo: 'ai-chat',
      },

      // -----------------------------------------------------------------------
      // System & Extras
      // -----------------------------------------------------------------------
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

      // Catch all
      { path: '**', redirectTo: '404' },
    ],
  },
];

export default routes;
