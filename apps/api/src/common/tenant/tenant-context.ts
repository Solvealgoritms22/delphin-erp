import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextData {
  empresaId?: string;
  usuarioId?: string;
  isSuperAdmin?: boolean;
}

export const tenantStorage = new AsyncLocalStorage<TenantContextData>();

export class TenantContext {
  static run<R>(data: TenantContextData, callback: () => R): R {
    return tenantStorage.run(data, callback);
  }

  static getTenantId(): string | undefined {
    return tenantStorage.getStore()?.empresaId;
  }

  static getUsuarioId(): string | undefined {
    return tenantStorage.getStore()?.usuarioId;
  }

  static isSuperAdmin(): boolean {
    return Boolean(tenantStorage.getStore()?.isSuperAdmin);
  }

  static getStore(): TenantContextData | undefined {
    return tenantStorage.getStore();
  }
}
