import { inject, Injectable } from '@angular/core';
import { AuthState } from '../auth/auth.state';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: ['*'],
  ADMIN: ['*'],
  MEMBER: ['read:*', 'write:own'],
  VIEWER: ['read:*'],
};

@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private authState = inject(AuthState);

  hasPermission(permission: string): boolean {
    const user = this.authState.user();
    if (!user) return false;

    // 1. Check custom user/role permissions array
    if (user.permissions && Array.isArray(user.permissions)) {
      if (user.permissions.includes('*')) return true;
      if (user.permissions.includes(permission)) return true;

      const [mod, action] = permission.split(':');
      if (user.permissions.includes(`${mod}:*`)) return true;
      if (action && user.permissions.includes(`*:${action}`)) return true;
    }

    // 2. Fallback to built-in system role
    const rawRole = (user.role || 'MEMBER').toUpperCase();
    const role = (rawRole in ROLE_PERMISSIONS ? rawRole : 'MEMBER') as Role;
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['MEMBER'];

    if (permissions.includes('*')) return true;

    for (const p of permissions) {
      if (p === permission) return true;
      if (p.endsWith(':*')) {
        const mod = p.slice(0, -2);
        if (permission.startsWith(`${mod}:`)) return true;
      }
      if (p.startsWith('read:') && permission.endsWith(':read')) return true;
      if (p.startsWith('write:') && permission.endsWith(':write')) return true;
      if (p.startsWith('delete:') && permission.endsWith(':delete')) return true;
    }

    return false;
  }
}
