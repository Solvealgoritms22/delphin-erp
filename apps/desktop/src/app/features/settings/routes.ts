import { Routes } from '@angular/router';
import { permissionGuard } from '../../../../core/auth/auth.guards';

export default [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'empresas', pathMatch: 'full' },
      {
        path: 'billing',
        canActivate: [permissionGuard],
        data: { permissions: ['company:read'] },
        loadComponent: () => import('./features/billing/billing-settings').then(c => c.BillingSettingsComponent)
      },
      {
        path: 'backups',
        canActivate: [permissionGuard],
        data: { permissions: ['backups:read'] },
        loadComponent: () => import('./features/backups/backups').then(c => c.BackupsComponent)
      },
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
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about').then(c => c.AboutComponent)
      }
    ]
  }
] as Routes;
