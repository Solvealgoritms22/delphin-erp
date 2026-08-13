import { IsActiveMatchOptions } from '@angular/router';

export type NavigationItem = {
  id: string;
  label: string;
  description?: string;
  route?: string;
  icon?: string;
  badge?: string;
  children?: NavigationItem[];
  disabled?: boolean;
  expanded?: boolean;
  activeOptions?: { exact: boolean } | IsActiveMatchOptions;
  requiredPermission?: string;
};

export const NAVIGATION: NavigationItem[] = [
  {
    id: 'dashboards',
    label: 'nav.main',
    description: 'nav.mainDescription',
    children: [
      {
        id: 'dashboards/general',
        label: 'nav.dashboard',
        icon: 'layout-dashboard',
        route: '/admin/dashboards/general',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'catalogs',
    label: 'nav.catalogs',
    description: 'nav.catalogsDescription',
    children: [
      {
        id: 'catalogs/products',
        label: 'nav.products',
        icon: 'package',
        route: '/admin/catalogs/products',
        activeOptions: { exact: false }
      },
      {
        id: 'catalogs/categories',
        label: 'nav.categories',
        icon: 'folder-tree',
        route: '/admin/catalogs/categories',
        activeOptions: { exact: false }
      },
      {
        id: 'catalogs/brands',
        label: 'nav.brands',
        icon: 'tag',
        route: '/admin/catalogs/brands',
        activeOptions: { exact: false }
      },
      {
        id: 'catalogs/units',
        label: 'nav.units',
        icon: 'scale',
        route: '/admin/catalogs/units',
        activeOptions: { exact: false }
      }
    ],
  },
  {
    id: 'commercial',
    label: 'nav.commercial',
    description: 'nav.commercialDescription',
    children: [
      {
        id: 'commercial/clients',
        label: 'nav.clients',
        icon: 'users',
        route: '/admin/commercial/clients',
        activeOptions: { exact: false }
      },
      {
        id: 'commercial/suppliers',
        label: 'nav.suppliers',
        icon: 'truck',
        route: '/admin/commercial/suppliers',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'settings',
    label: 'nav.settings',
    description: 'nav.settingsDescription',
    children: [
      {
        id: 'sucursales',
        label: 'nav.branches',
        icon: 'store',
        route: '/admin/sucursales',
        activeOptions: { exact: false }
      },
      {
        id: 'settings/empresas',
        label: 'nav.companies',
        icon: 'briefcase', 
        route: '/admin/settings/empresas',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'security',
    label: 'nav.security',
    description: 'nav.securityDescription',
    children: [
      {
        id: 'settings/roles',
        label: 'nav.roles',
        icon: 'shield-check',
        route: '/admin/settings/roles',
        activeOptions: { exact: false }
      },
      {
        id: 'settings/users',
        label: 'nav.users',
        icon: 'users',
        route: '/admin/settings/users',
        activeOptions: { exact: false }
      },
      {
        id: 'settings/security-logs',
        label: 'nav.securityLogs',
        icon: 'shield-alert',
        route: '/admin/settings/security-logs',
        activeOptions: { exact: false }
      },
      {
        id: 'settings/current-sessions',
        label: 'nav.sessions',
        icon: 'monitor-smartphone',
        route: '/admin/settings/current-sessions',
        activeOptions: { exact: false }
      }
    ]
  },
  {
    id: 'sistema',
    label: 'nav.system',
    description: 'nav.systemDescription',
    children: [
      {
        id: 'activity',
        label: 'nav.activity',
        icon: 'activity',
        route: '/admin/activity',
        activeOptions: { exact: false }
      },
      {
        id: 'about',
        label: 'updater.checkManually',
        icon: 'package',
        route: '/admin/settings/about',
        activeOptions: { exact: true }
      }
    ]
  }
];
