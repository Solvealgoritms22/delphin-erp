import { computed, inject, Injectable, signal } from '@angular/core';
import { Product } from '@features/catalogs/data/products.service';
import { Client } from '@features/sales/data/clients';
import { AuthState } from '@core/auth/auth.state';

export interface CartItem {
  id: string; // product id
  product: Product;
  cantidad: number;
  precioUnitario: number;
  precioLista: number;
  tasaItbis: number;
  descuento: number;
  porcentajeDescuento: number;
  subtotal: number;
  itbis: number;
  total: number;
}

export interface HeldCart {
  id: string;
  createdAt: Date;
  client: Client | null;
  items: CartItem[];
  discountValue: number;
  discountType: 'PERCENT' | 'FIXED';
  note: string;
  total: number;
  itemCount: number;
}

@Injectable({ providedIn: 'root' })
export class PosService {
  private readonly authState = inject(AuthState);

  readonly items = signal<CartItem[]>([]);
  readonly selectedClient = signal<Client | null>(null);
  readonly discountValue = signal<number>(0);
  readonly discountType = signal<'PERCENT' | 'FIXED'>('FIXED');
  readonly note = signal<string>('');
  readonly heldCarts = signal<HeldCart[]>([]);
  readonly searchQuery = signal<string>('');
  readonly selectedCategoryId = signal<string>('ALL');

  private get storageKey(): string {
    const empresaId = this.authState.empresaId() || 'global';
    return `delphin_pos_held_carts_${empresaId}`;
  }

  constructor() {
    this.loadHeldCarts();
  }

  // --- Computed Totals ---
  readonly itemCount = computed(() => this.items().length);

  readonly totalQuantity = computed(() =>
    this.items().reduce((acc, item) => acc + item.cantidad, 0)
  );

  readonly rawSubtotal = computed(() =>
    this.items().reduce((acc, item) => acc + item.subtotal, 0)
  );

  readonly discountTotal = computed(() => {
    const raw = this.rawSubtotal();
    const val = this.discountValue();
    if (val <= 0) return 0;
    if (this.discountType() === 'PERCENT') {
      return Number(((raw * Math.min(val, 100)) / 100).toFixed(2));
    }
    return Math.min(val, raw);
  });

  readonly taxableSubtotal = computed(() =>
    Math.max(0, this.rawSubtotal() - this.discountTotal())
  );

  readonly taxTotal = computed(() => {
    const raw = this.rawSubtotal();
    const discount = this.discountTotal();
    const ratio = raw > 0 ? (raw - discount) / raw : 1;

    return this.items().reduce((acc, item) => {
      const itemSubtotal = item.subtotal * ratio;
      const tax = (itemSubtotal * item.tasaItbis) / 100;
      return acc + tax;
    }, 0);
  });

  readonly grandTotal = computed(() =>
    Number((this.taxableSubtotal() + this.taxTotal()).toFixed(2))
  );

  // --- Cart Operations ---
  addItem(product: Product, quantity = 1): void {
    const currentItems = [...this.items()];
    const existingIndex = currentItems.findIndex((i) => i.id === product.id);

    const unitPrice =
      product.enOferta && product.precioOferta != null && product.precioOferta > 0
        ? Number(product.precioOferta)
        : Number(product.precioVenta);

    const listPrice = Number(product.precioVenta);
    const taxRate = product.impuesto?.tasa != null ? Number(product.impuesto.tasa) : (product.taxRate ?? 18);

    if (existingIndex > -1) {
      const existing = currentItems[existingIndex];
      const newQty = existing.cantidad + quantity;
      currentItems[existingIndex] = this.calculateLine({
        ...existing,
        cantidad: newQty,
      });
    } else {
      const newLine = this.calculateLine({
        id: product.id,
        product,
        cantidad: quantity,
        precioUnitario: unitPrice,
        precioLista: listPrice,
        tasaItbis: taxRate,
        descuento: 0,
        porcentajeDescuento: 0,
        subtotal: 0,
        itbis: 0,
        total: 0,
      });
      currentItems.push(newLine);
    }

    this.items.set(currentItems);
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(productId);
      return;
    }

    const currentItems = this.items().map((item) => {
      if (item.id === productId) {
        return this.calculateLine({ ...item, cantidad: quantity });
      }
      return item;
    });

    this.items.set(currentItems);
  }

  incrementQuantity(productId: string): void {
    const item = this.items().find((i) => i.id === productId);
    if (item) {
      this.updateQuantity(productId, item.cantidad + 1);
    }
  }

  decrementQuantity(productId: string): void {
    const item = this.items().find((i) => i.id === productId);
    if (item) {
      this.updateQuantity(productId, item.cantidad - 1);
    }
  }

  removeItem(productId: string): void {
    this.items.set(this.items().filter((i) => i.id !== productId));
  }

  clearCart(): void {
    this.items.set([]);
    this.selectedClient.set(null);
    this.discountValue.set(0);
    this.note.set('');
  }

  setDiscount(value: number, type: 'PERCENT' | 'FIXED' = 'FIXED'): void {
    this.discountValue.set(Math.max(0, value));
    this.discountType.set(type);
  }

  setNote(note: string): void {
    this.note.set(note);
  }

  setClient(client: Client | null): void {
    this.selectedClient.set(client);
  }

  // --- Held Carts (Carritos en Pausa) ---
  holdCurrentCart(): boolean {
    if (this.items().length === 0) return false;

    const held: HeldCart = {
      id: `HELD-${Date.now()}`,
      createdAt: new Date(),
      client: this.selectedClient(),
      items: [...this.items()],
      discountValue: this.discountValue(),
      discountType: this.discountType(),
      note: this.note(),
      total: this.grandTotal(),
      itemCount: this.items().length,
    };

    const updated = [held, ...this.heldCarts()];
    this.heldCarts.set(updated);
    this.saveHeldCarts(updated);

    this.clearCart();
    return true;
  }

  resumeHeldCart(heldId: string): void {
    const found = this.heldCarts().find((h) => h.id === heldId);
    if (!found) return;

    // Set current active cart
    this.items.set(found.items);
    this.selectedClient.set(found.client);
    this.discountValue.set(found.discountValue);
    this.discountType.set(found.discountType);
    this.note.set(found.note);

    // Remove from held list
    const updated = this.heldCarts().filter((h) => h.id !== heldId);
    this.heldCarts.set(updated);
    this.saveHeldCarts(updated);
  }

  deleteHeldCart(heldId: string): void {
    const updated = this.heldCarts().filter((h) => h.id !== heldId);
    this.heldCarts.set(updated);
    this.saveHeldCarts(updated);
  }

  private loadHeldCarts(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.heldCarts.set(parsed);
      }
    } catch {
      this.heldCarts.set([]);
    }
  }

  private saveHeldCarts(list: HeldCart[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(list));
    } catch {}
  }

  private calculateLine(item: CartItem): CartItem {
    const qty = Math.max(0.01, item.cantidad);
    const subtotal = Number((item.precioUnitario * qty).toFixed(2));
    const itbis = Number(((subtotal * item.tasaItbis) / 100).toFixed(2));
    const total = Number((subtotal + itbis).toFixed(2));

    return {
      ...item,
      cantidad: qty,
      subtotal,
      itbis,
      total,
    };
  }

  getProductStock(product: Product): number {
    if (!product.stocks || product.stocks.length === 0) return 0;
    return product.stocks.reduce((sum, s) => sum + (s.cantidad || 0), 0);
  }
}
