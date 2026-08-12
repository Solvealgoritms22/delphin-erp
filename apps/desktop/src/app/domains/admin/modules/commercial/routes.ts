import { Routes } from '@angular/router';

export default [
  {
    path: 'clients',
    loadComponent: () => import('./features/clients/clients').then((c) => c.Clients),
  },
  {
    path: 'clients/:id',
    loadComponent: () => import('./features/clients/client-form/client-form').then((c) => c.ClientForm),
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./features/suppliers/suppliers').then((c) => c.Suppliers),
  },
  {
    path: 'suppliers/:id',
    loadComponent: () => import('./features/suppliers/supplier-form/supplier-form').then((c) => c.SupplierForm),
  },
] as Routes;
