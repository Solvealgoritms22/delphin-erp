import { Routes } from '@angular/router';
import { WebLayout } from '@/app/domains/website/layout/layout';

const routes: Routes = [
  {
    path: '',
    component: WebLayout,
    children: [

      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },

      {
        path: '',
        loadChildren: () => import('./modules/home/routes'),
      },

      { path: '**', redirectTo: '/' },
    ],
  },
];

export default routes;
