import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth/auth.guards';

export default [
  {
    path: 'products',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:read'] },
    loadComponent: () => import('./features/products/products.component'),
  },
  {
    path: 'products/new',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:write'] },
    loadComponent: () => import('./features/products/product-form.component'),
  },
  {
    path: 'products/:id',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:write'] },
    loadComponent: () => import('./features/products/product-form.component'),
  },
  {
    path: 'services',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:read'] },
    loadComponent: () => import('./features/services/services.component'),
  },
  {
    path: 'services/new',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:write'] },
    loadComponent: () => import('./features/products/product-form.component'),
  },
  {
    path: 'services/:id',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:write'] },
    loadComponent: () => import('./features/products/product-form.component'),
  },
  {
    path: 'categories',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:read'] },
    loadComponent: () => import('./features/categories/categories.component'),
  },
  {
    path: 'brands',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:read'] },
    loadComponent: () => import('./features/brands/brands.component'),
  },
  {
    path: 'units',
    canActivate: [permissionGuard],
    data: { permissions: ['catalogs:read'] },
    loadComponent: () => import('./features/units/units.component'),
  },
  {
    path: 'inventory',
    canActivate: [permissionGuard],
    data: { permissions: ['inventory:read'] },
    loadComponent: () => import('./features/inventory/inventory.component'),
  },
] as Routes;
