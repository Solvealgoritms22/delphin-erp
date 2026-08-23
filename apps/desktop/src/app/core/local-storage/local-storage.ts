import { isPlatformServer } from '@angular/common';
import {
  inject,
  Injectable,
  makeStateKey,
  PLATFORM_ID,
  TransferState,
} from '@angular/core';

const STORAGE_STATE_KEY = makeStateKey<[string, string][]>('APP_STORAGE_STATE');

@Injectable({ providedIn: 'root' })
export class LocalStorage {

  private transferState = inject(TransferState);

  private isServer = isPlatformServer(inject(PLATFORM_ID));
  private storage = new Map<string, string>();

  constructor() {

    if (!this.isServer) {
      new Map(this.transferState.get(STORAGE_STATE_KEY, [])).forEach(
        (value, key) => {
          localStorage.setItem(key, value);
        }
      );
    }
  }

  private updateTransferState(map: Map<string, string>) {
    this.transferState.set(STORAGE_STATE_KEY, Array.from(map.entries()));
  }

  get length(): number {
    return this.storage.size;
  }

  setItem(key: string, value: string): void {
    if (this.isServer) {
      this.storage.set(key, value);
      this.updateTransferState(this.storage);
      return;
    }

    localStorage.setItem(key, value);
  }

  getItem(key: string): string | null {
    if (this.isServer) {
      return this.storage.get(key) ?? null;
    }

    return localStorage.getItem(key);
  }

  removeItem(key: string): void {
    if (this.isServer) {
      this.storage.delete(key);
      this.updateTransferState(this.storage);
      return;
    }

    localStorage.removeItem(key);
  }

  clear(): void {
    if (this.isServer) {
      this.storage.clear();
      this.updateTransferState(this.storage);
    }

    localStorage.clear();
  }

  key(index: number): string | null {
    if (this.isServer) {
      return Array.from(this.storage.keys())[index] ?? null;
    }

    return localStorage.key(index);
  }
}
