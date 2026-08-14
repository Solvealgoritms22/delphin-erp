export type PermissionsObject = Record<
  string,
  { read?: boolean; write?: boolean; delete?: boolean }
>;

export type PermissionsInput = string | string[] | PermissionsObject;

// Mapea los slugs de módulos de la UI a los namespaces de permiso
// usados por los guards (ej: settings_roles -> roles, roles:write).
export const MODULE_PERMISSION_NAMESPACES: Record<string, string> = {
  settings_roles: 'roles',
  settings_users: 'users',
  settings_company: 'company',
  dashboard: 'dashboard',
  catalogs: 'catalogs',
  commercial: 'commercial',
  sucursales: 'sucursales',
  billing: 'billing',
  ai_chat: 'ai_chat',
  'ai-chat': 'ai_chat',
  security_logs: 'security',
  'security-logs': 'security',
  current_sessions: 'sessions',
  'current-sessions': 'sessions',
  activity: 'activity',
  inventory: 'inventory',
  about: 'about',
  legal: 'legal',
};

/**
 * Normaliza cualquier formato de permisos (string JSON, array de strings
 * u objeto { modulo: { read, write, delete } }) a un array plano de
 * strings "modulo:accion", que es el formato que consumen los guards y el JWT.
 */
export function normalizePermissions(
  input: PermissionsInput | null | undefined,
): string[] {
  if (!input) return [];

  let parsed: unknown = input;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return [...new Set(parsed.filter((p): p is string => typeof p === 'string'))];
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const out: string[] = [];
    for (const [slug, actions] of Object.entries(parsed as PermissionsObject)) {
      if (!actions || typeof actions !== 'object') continue;
      const ns = MODULE_PERMISSION_NAMESPACES[slug] || slug;
      if (actions.read) out.push(`${ns}:read`);
      if (actions.write) out.push(`${ns}:write`);
      if (actions.delete) out.push(`${ns}:delete`);
    }
    return [...new Set(out)];
  }

  return [];
}
