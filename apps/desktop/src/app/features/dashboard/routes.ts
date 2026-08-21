import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'general',
  },
  {
    path: 'general',
    loadComponent: () =>
      import('./features/general/general').then(
        (m) => m.DashboardGeneralComponent
      ),
  },
];

export default routes;
