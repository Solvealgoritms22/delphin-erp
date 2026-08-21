import { Routes } from '@angular/router';
import { AdminLayout } from './layout';

const routes: Routes = [
  {
    path: '404',
    loadComponent: () =>
      import('../../features/public/error/features/error-404'),
  },
  {
    path: '500',
    loadComponent: () =>
      import('../../features/public/error/features/error-500'),
  },
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboards/general' },
      {
        path: 'dashboards',
        loadChildren: () => import('../../features/dashboard/routes'),
      },
      {
        path: 'catalogs',
        loadChildren: () => import('../../features/catalogs/routes'),
      },
      {
        path: 'commercial',
        children: [
          {
            path: 'invoices',
            loadComponent: () => import('../../features/sales/features/invoices/invoices.component').then((c) => c.InvoicesComponent),
          },
          {
            path: 'sequences',
            loadComponent: () => import('../../features/sales/features/sequences/sequences.component').then((c) => c.SequencesComponent),
          },
          {
            path: 'clients',
            loadComponent: () => import('../../features/sales/features/clients/clients').then((c) => c.Clients),
          },
          {
            path: 'clients/:id',
            loadComponent: () => import('../../features/sales/features/clients/client-form/client-form').then((c) => c.ClientForm),
          },
          {
            path: 'suppliers',
            loadComponent: () => import('../../features/purchases/features/suppliers/suppliers').then((c) => c.Suppliers),
          },
          {
            path: 'suppliers/:id',
            loadComponent: () => import('../../features/purchases/features/suppliers/supplier-form/supplier-form').then((c) => c.SupplierForm),
          },
        ],
      },
      {
        path: 'sucursales',
        loadChildren: () => import('../../features/branches/routes'),
      },
      {
        path: 'settings',
        loadChildren: () => import('../../features/settings/routes'),
      },
      {
        path: 'ai-chat',
        loadChildren: () => import('../../features/ai-assistant/routes'),
      },
      {
        path: 'apps/ai-chat',
        redirectTo: 'ai-chat',
      },
      {
        path: 'billing',
        loadChildren: () => import('../../features/billing/billing-app/routes'),
      },
      {
        path: 'plans',
        loadChildren: () => import('../../features/billing/plans/routes'),
      },
      {
        path: 'activity',
        loadChildren: () => import('../../features/activity/routes'),
      },
      {
        path: 'legal',
        loadChildren: () => import('../../features/public/legal/routes'),
      },
      {
        path: 'notifications',
        loadChildren: () => import('../../features/notifications/routes'),
      },
      {
        path: 'error',
        loadChildren: () => import('../../features/public/error/routes'),
      },
      { path: '**', redirectTo: '404' },
    ],
  },
];

export default routes;
