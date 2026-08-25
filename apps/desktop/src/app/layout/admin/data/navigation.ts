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
    icon: 'layout-dashboard',
    expanded: true,
    children: [
      {
        id: 'dashboards/general',
        label: 'nav.dashboard',
        icon: 'layout-dashboard',
        route: '/admin/dashboards/general',
        activeOptions: { exact: false },
        requiredPermission: 'dashboard:read',
      },
      {
        id: 'ai-chat',
        label: 'nav.aiChat',
        icon: 'sparkles',
        route: '/admin/ai-chat',
        activeOptions: { exact: false },
        requiredPermission: 'ai_chat:read',
      },
    ],
  },
  {
    id: 'catalogs',
    label: 'nav.catalogs',
    description: 'nav.catalogsDescription',
    icon: 'package',
    expanded: false,
    children: [
      {
        id: 'catalogs/products',
        label: 'nav.products',
        icon: 'package',
        route: '/admin/catalogs/products',
        activeOptions: { exact: false },
        requiredPermission: 'catalogs:read',
      },
      {
        id: 'catalogs/services',
        label: 'nav.services',
        icon: 'wrench',
        route: '/admin/catalogs/services',
        activeOptions: { exact: false },
        requiredPermission: 'catalogs:read',
      },
      {
        id: 'catalogs/categories',
        label: 'nav.categories',
        icon: 'folder-tree',
        route: '/admin/catalogs/categories',
        activeOptions: { exact: false },
        requiredPermission: 'catalogs:read',
      },
      {
        id: 'catalogs/brands',
        label: 'nav.brands',
        icon: 'tag',
        route: '/admin/catalogs/brands',
        activeOptions: { exact: false },
        requiredPermission: 'catalogs:read',
      },
      {
        id: 'catalogs/units',
        label: 'nav.units',
        icon: 'scale',
        route: '/admin/catalogs/units',
        activeOptions: { exact: false },
        requiredPermission: 'catalogs:read',
      },
      {
        id: 'catalogs/inventory',
        label: 'nav.inventory',
        icon: 'boxes',
        route: '/admin/catalogs/inventory',
        activeOptions: { exact: false },
        requiredPermission: 'inventory:read',
      },
    ],
  },
  {
    id: 'commercial',
    label: 'nav.commercial',
    description: 'nav.commercialDescription',
    icon: 'shopping-bag',
    expanded: false,
    children: [
      {
        id: 'commercial/invoices',
        label: 'nav.invoices',
        icon: 'file-text',
        route: '/admin/commercial/invoices',
        activeOptions: { exact: false },
        requiredPermission: 'invoices:read',
      },
      {
        id: 'commercial/sequences',
        label: 'nav.sequences',
        icon: 'hash',
        route: '/admin/commercial/sequences',
        activeOptions: { exact: false },
        requiredPermission: 'sequences:read',
      },
      {
        id: 'commercial/clients',
        label: 'nav.clients',
        icon: 'users',
        route: '/admin/commercial/clients',
        activeOptions: { exact: false },
        requiredPermission: 'commercial:read',
      },
      {
        id: 'commercial/suppliers',
        label: 'nav.suppliers',
        icon: 'truck',
        route: '/admin/commercial/suppliers',
        activeOptions: { exact: false },
        requiredPermission: 'commercial:read',
      },
    ],
  },
  {
    id: 'settings',
    label: 'nav.settings',
    description: 'nav.settingsDescription',
    icon: 'sliders-horizontal',
    expanded: false,
    children: [
      {
        id: 'sucursales',
        label: 'nav.branches',
        icon: 'store',
        route: '/admin/sucursales',
        activeOptions: { exact: false },
        requiredPermission: 'sucursales:read',
      },
      {
        id: 'settings/empresas',
        label: 'nav.companies',
        icon: 'briefcase',
        route: '/admin/settings/empresas',
        activeOptions: { exact: false },
        requiredPermission: 'company:read',
      },
      {
        id: 'settings/backups',
        label: 'nav.backups',
        icon: 'archive',
        route: '/admin/settings/backups',
        activeOptions: { exact: false },
        requiredPermission: 'backups:read',
      },
      {
        id: 'settings/billing',
        label: 'nav.billingSettings',
        icon: 'sliders-horizontal',
        route: '/admin/settings/billing',
        activeOptions: { exact: false },
        requiredPermission: 'billing:read',
      },
    ],
  },
  {
    id: 'security',
    label: 'nav.security',
    description: 'nav.securityDescription',
    icon: 'shield-check',
    expanded: false,
    children: [
      {
        id: 'settings/roles',
        label: 'nav.roles',
        icon: 'shield-check',
        route: '/admin/settings/roles',
        activeOptions: { exact: false },
        requiredPermission: 'roles:read',
      },
      {
        id: 'settings/users',
        label: 'nav.users',
        icon: 'users',
        route: '/admin/settings/users',
        activeOptions: { exact: false },
        requiredPermission: 'users:read',
      },
      {
        id: 'settings/security-logs',
        label: 'nav.securityLogs',
        icon: 'shield-alert',
        route: '/admin/settings/security-logs',
        activeOptions: { exact: false },
        requiredPermission: 'security:read',
      },
      {
        id: 'settings/current-sessions',
        label: 'nav.sessions',
        icon: 'monitor-smartphone',
        route: '/admin/settings/current-sessions',
        activeOptions: { exact: false },
        requiredPermission: 'sessions:read',
      },
    ],
  },
  {
    id: 'sistema',
    label: 'nav.system',
    description: 'nav.systemDescription',
    icon: 'cpu',
    expanded: false,
    children: [
      {
        id: 'activity',
        label: 'nav.activity',
        icon: 'activity',
        route: '/admin/activity',
        activeOptions: { exact: false },
        requiredPermission: 'activity:read',
      },
      {
        id: 'legal',
        label: 'nav.legal',
        icon: 'file-text',
        route: '/admin/legal',
        activeOptions: { exact: false },
      },
      {
        id: 'about',
        label: 'updater.checkManually',
        icon: 'package',
        route: '/admin/settings/about',
        activeOptions: { exact: true },
      },
    ],
  },
];
