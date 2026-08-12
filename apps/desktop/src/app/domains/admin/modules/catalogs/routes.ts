import { Routes } from '@angular/router';

export default [
  {
    path: 'products',
    loadComponent: () => import('./features/products/products.component'),
  },
  {
    path: 'products/new',
    loadComponent: () => import('./features/products/product-form.component'),
  },
  {
    path: 'products/:id',
    loadComponent: () => import('./features/products/product-form.component'),
  },
  {
    path: 'categories',
    loadComponent: () => import('./features/categories/categories.component'),
  },
  {
    path: 'brands',
    loadComponent: () => import('./features/brands/brands.component'),
  },
  {
    path: 'units',
    loadComponent: () => import('./features/units/units.component'),
  }
] as Routes;
