import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/copilot-chat.component'),
    children: [
      {
        path: ':id',
        loadComponent: () => import('./features/copilot-conversation.component'),
      },
    ],
  },
];

export default routes;
