import { normalizePermissions } from './permissions.util';

describe('normalizePermissions', () => {
  it('devuelve vacío para entrada null/undefined', () => {
    expect(normalizePermissions(null)).toEqual([]);
    expect(normalizePermissions(undefined)).toEqual([]);
  });

  it('preserva un array de strings', () => {
    expect(normalizePermissions(['roles:read', 'roles:write'])).toEqual([
      'roles:read',
      'roles:write',
    ]);
  });

  it('parsea un string JSON con array', () => {
    expect(normalizePermissions('["roles:read","users:read"]')).toEqual([
      'roles:read',
      'users:read',
    ]);
  });

  it('ignora un string JSON inválido', () => {
    expect(normalizePermissions('not-json')).toEqual([]);
  });

  it('aplana formato objeto mapeando slugs a namespaces', () => {
    expect(
      normalizePermissions({
        settings_roles: { read: true, write: true, delete: false },
        dashboard: { read: true, write: false, delete: false },
      }),
    ).toEqual(['roles:read', 'roles:write', 'dashboard:read']);
  });

  it('deduplica permisos repetidos', () => {
    expect(
      normalizePermissions(['roles:read', 'roles:read', 'roles:write']),
    ).toEqual(['roles:read', 'roles:write']);
  });
});
