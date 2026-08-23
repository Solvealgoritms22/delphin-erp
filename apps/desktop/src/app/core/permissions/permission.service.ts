import { inject, Injectable } from '@angular/core';
import { AuthState } from '../auth/auth.state';

export type Role = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: ['*'],
  ADMIN: ['read:*', 'write:*', 'delete:*'],
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

    const role = user.role as Role;
    if (!ROLE_PERMISSIONS[role]) return false;

    const permissions = ROLE_PERMISSIONS[role];
    if (permissions.includes('*')) return true;

    for (const p of permissions) {
      if (p === permission) return true;
      if (p.endsWith('*')) {
        const prefix = p.slice(0, -1);
        if (permission.startsWith(prefix)) return true;
      }
    }

    return false;
  }
}
