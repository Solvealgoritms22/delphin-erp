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
      // General
      // -----------------------------------------------------------------------
      {
        path: 'academy',
        loadChildren: () => import('./modules/apps/academy/routes'),
      },
      {
        path: 'ai-chat',
        loadChildren: () => import('./modules/apps/ai-chat/routes'),
      },
      {
        path: 'contacts',
        loadChildren: () => import('./modules/apps/contacts/routes'),
      },
      {
        path: 'file-manager',
        loadChildren: () => import('./modules/apps/file-manager/routes'),
      },
      {
        path: 'help-center',
        loadChildren: () => import('./modules/apps/help-center/routes'),
      },
      {
        path: 'notes',
        loadChildren: () => import('./modules/apps/notes/routes'),
      },
      {
        path: 'orders',
        loadChildren: () => import('./modules/apps/orders/routes'),
      },
      {
        path: 'scrumboard',
        loadChildren: () => import('./modules/apps/scrumboard/routes'),
      },
      {
        path: 'tasks',
        loadChildren: () => import('./modules/apps/tasks/routes'),
      },

      // -----------------------------------------------------------------------
      // Extras
      // -----------------------------------------------------------------------
      {
        path: 'profile',
        loadChildren: () => import('./modules/apps/profile/routes'),
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
        path: 'billing',
        loadChildren: () => import('./modules/apps/billing/routes'),
      },
      {
        path: 'settings',
        loadChildren: () => import('./modules/extras/settings/routes'),
      },
      {
        path: 'notifications',
        loadChildren: () => import('./modules/extras/notifications/routes'),
      },
      {
        path: 'error',
        loadChildren: () => import('./modules/extras/error/routes'),
      },

      // -----------------------------------------------------------------------
      // Documentation
      // -----------------------------------------------------------------------
      {
        path: 'documentation',
        loadChildren: () => import('./modules/documentation/routes'),
      },

      // Catch all
      { path: '**', redirectTo: '404' },
    ],
  },
];

export default routes;
