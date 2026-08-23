import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/notifications-list.component'),
  },
];

export default routes;
