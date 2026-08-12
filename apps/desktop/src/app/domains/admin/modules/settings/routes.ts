import { Routes } from '@angular/router';
import { permissionGuard } from '../../../../core/auth/auth.guards';

export default [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'empresas', pathMatch: 'full' },
      {
        path: 'empresas',
        loadComponent: () => import('./features/empresas/empresas').then(c => c.EmpresasComponent)
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { permissions: ['roles:read'] },
        loadComponent: () => import('./features/roles/roles').then(c => c.RolesComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users').then(c => c.UsersComponent)
      },
      {
        path: 'security-logs',
        loadComponent: () => import('./features/security-logs/security-logs')
      },
      {
        path: 'current-sessions',
        loadComponent: () => import('./features/current-sessions/current-sessions')
      }
    ]
  }
] as Routes;


