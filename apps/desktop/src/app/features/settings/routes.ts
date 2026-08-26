import { Routes } from '@angular/router';
import { permissionGuard } from '@core/auth/auth.guards';

export default [
  {
    path: '',
    children: [
      { path: '', redirectTo: 'empresas', pathMatch: 'full' },
      {
        path: 'billing',
        canActivate: [permissionGuard],
        data: { permissions: ['billing:read'] },
        loadComponent: () =>
          import('./features/billing/billing-settings.component').then(
            (c) => c.BillingSettingsComponent
          ),
      },
      {
        path: 'backups',
        canActivate: [permissionGuard],
        data: { permissions: ['backups:read'] },
        loadComponent: () =>
          import('./features/backups/database-backups.component').then(
            (c) => c.BackupsComponent
          ),
      },
      {
        path: 'api-access',
        canActivate: [permissionGuard],
        data: { permissions: ['company:read'] },
        loadComponent: () =>
          import('./features/api-access/api-access.component'),
      },
      {
        path: 'empresas',
        canActivate: [permissionGuard],
        data: { permissions: ['company:read'] },
        loadComponent: () =>
          import('./features/empresas/empresas-list.component').then(
            (c) => c.EmpresasComponent
          ),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard],
        data: { permissions: ['roles:read'] },
        loadComponent: () =>
          import('./features/roles/roles-permissions.component').then(
            (c) => c.RolesComponent
          ),
      },
      {
        path: 'users',
        canActivate: [permissionGuard],
        data: { permissions: ['users:read'] },
        loadComponent: () =>
          import('./features/users/users-management.component').then(
            (c) => c.UsersComponent
          ),
      },
      {
        path: 'security-logs',
        canActivate: [permissionGuard],
        data: { permissions: ['security:read'] },
        loadComponent: () =>
          import('./features/security-logs/security-audit-logs.component'),
      },
      {
        path: 'current-sessions',
        canActivate: [permissionGuard],
        data: { permissions: ['sessions:read'] },
        loadComponent: () =>
          import('./features/current-sessions/current-sessions.component'),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/about/system-information.component').then(
            (c) => c.AboutComponent
          ),
      },
    ],
  },
] as Routes;
