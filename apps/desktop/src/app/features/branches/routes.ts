import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () => import('./features/sucursales/sucursales.component'),
  },
] as Routes;
