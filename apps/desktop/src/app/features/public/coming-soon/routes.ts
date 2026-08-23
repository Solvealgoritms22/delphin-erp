import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('@layout/public/coming-soon-layout.component'),
    children: [
      {
        path: '',
        loadComponent: () => import('./coming-soon.component'),
      },
    ],
  },
];

export default routes;
