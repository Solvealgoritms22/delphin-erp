import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout.component';
import { permissionGuard } from '@core/auth/auth.guards';

const routes: Routes = [
  {
    path: '404',
    loadComponent: () =>
      import('@features/public/error/features/error-404'),
  },
  {
    path: '500',
    loadComponent: () =>
      import('@features/public/error/features/error-500'),
  },
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboards/general' },
      {
        path: 'dashboards',
        loadChildren: () => import('@features/dashboard/routes'),
      },
      {
        path: 'catalogs',
        loadChildren: () => import('@features/catalogs/routes'),
      },
      {
        path: 'commercial',
        children: [
          {
            path: 'invoices',
            canActivate: [permissionGuard],
            data: { permissions: ['invoices:read'] },
            loadComponent: () =>
              import('@features/sales/features/invoices/invoices.component').then(
                (c) => c.InvoicesComponent
              ),
          },
          {
            path: 'sequences',
            canActivate: [permissionGuard],
            data: { permissions: ['sequences:read'] },
            loadComponent: () =>
              import(
                '@features/sales/features/sequences/sequences.component'
              ).then((c) => c.SequencesComponent),
          },
          {
            path: 'clients',
            canActivate: [permissionGuard],
            data: { permissions: ['commercial:read'] },
            loadComponent: () =>
              import('@features/sales/features/clients/clients-list.component').then(
                (c) => c.Clients
              ),
          },
          {
            path: 'clients/:id',
            canActivate: [permissionGuard],
            data: { permissions: ['commercial:write'] },
            loadComponent: () =>
              import(
                '@features/sales/features/clients/client-form/client-form.component'
              ).then((c) => c.ClientForm),
          },
          {
            path: 'suppliers',
            canActivate: [permissionGuard],
            data: { permissions: ['commercial:read'] },
            loadComponent: () =>
              import(
                '@features/purchases/features/suppliers/suppliers-list.component'
              ).then((c) => c.Suppliers),
          },
          {
            path: 'suppliers/:id',
            canActivate: [permissionGuard],
            data: { permissions: ['commercial:write'] },
            loadComponent: () =>
              import(
                '@features/purchases/features/suppliers/supplier-form/supplier-form.component'
              ).then((c) => c.SupplierForm),
          },
        ],
      },
      {
        path: 'sucursales',
        canActivate: [permissionGuard],
        data: { permissions: ['sucursales:read'] },
        loadChildren: () => import('@features/branches/routes'),
      },
      {
        path: 'settings',
        loadChildren: () => import('@features/settings/routes'),
      },
      {
        path: 'ai-chat',
        canActivate: [permissionGuard],
        data: { permissions: ['ai_chat:read'] },
        loadChildren: () => import('@features/ai-assistant/routes'),
      },
      {
        path: 'apps/ai-chat',
        redirectTo: 'ai-chat',
      },
      {
        path: 'billing',
        canActivate: [permissionGuard],
        data: { permissions: ['billing:read'] },
        loadChildren: () => import('@features/billing/billing-app/routes'),
      },
      {
        path: 'plans',
        loadChildren: () => import('@features/billing/plans/routes'),
      },
      {
        path: 'activity',
        canActivate: [permissionGuard],
        data: { permissions: ['activity:read'] },
        loadChildren: () => import('@features/activity/routes'),
      },
      {
        path: 'legal',
        loadChildren: () => import('@features/public/legal/routes'),
      },
      {
        path: 'notifications',
        loadChildren: () => import('@features/notifications/routes'),
      },
      {
        path: 'error',
        loadChildren: () => import('@features/public/error/routes'),
      },
      { path: '**', redirectTo: '404' },
    ],
  },
];

export default routes;
