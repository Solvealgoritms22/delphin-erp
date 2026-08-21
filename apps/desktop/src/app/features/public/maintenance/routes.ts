import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../../layout/public/maintenance-layout.component'),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/maintenance'),
      },
    ],
  },
];

export default routes;
