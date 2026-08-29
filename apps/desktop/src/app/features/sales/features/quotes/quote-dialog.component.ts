import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';
import { Cotizacion, QuotesService, CreateQuoteDto, CreateQuoteItemDto } from '../../data/quotes.service';
import { ClientsService, Client } from '../../data/clients';
import { ProductsService, Product } from '../../../catalogs/data/products.service';
import { InventoryService, Warehouse } from '../../../catalogs/data/inventory.service';
import { SendQuoteEmailDialogComponent } from './send-quote-email-dialog.component';

interface QuoteLineItem {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje: number;
  descuento: number;
  tasaItbis: number;
  itbis: number;
  subtotal: number;
  total: number;
}

@Component({
  selector: 'app-quote-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    DecimalPipe,
  ],
  template: `
    <div class="flex flex-col max-h-[92vh] w-[1180px] max-w-[96vw] bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <mat-icon svgIcon="file-text" class="icon-size-5"></mat-icon>
          </div>
          <div>
            <h2 class="text-base font-bold text-neutral-900 dark:text-white">
              {{ isEdit ? 'Editar Cotización ' + quote?.numeroCotizacion : 'Nueva Cotización' }}
            </h2>
            <p class="text-xs text-neutral-500">
              Registra una propuesta comercial con precios, descuentos e ITBIS
            </p>
          </div>
        </div>

        <button
          type="button"
          (click)="close()"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-colors cursor-pointer"
        >
          <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
        </button>
      </div>

      <!-- Scrollable Form Body -->
      <div class="flex-auto overflow-y-auto p-6 md:p-8 space-y-6">
        <!-- Top Form Section: Client, Dates, Warehouse -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800">
          <!-- Client Selector -->
          <div class="space-y-1.5 md:col-span-6">
            <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Cliente Destinatario
            </label>
            <mat-form-field appearance="outline" class="w-full fuse-mat-dense">
              <mat-select
                [(ngModel)]="selectedClienteId"
                (selectionChange)="onClienteSelected($event.value)"
                placeholder="Seleccionar cliente..."
              >
                <mat-option [value]="null">Consumidor Final / General</mat-option>
                @for (c of clients(); track c.id) {
                  <mat-option [value]="c.id">
                    {{ c.nombreRazonSocial }}
                    @if (c.numeroDocumento) {
                      <span class="text-neutral-400 font-mono text-xs">({{ c.numeroDocumento }})</span>
                    }
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (selectedClientEmail) {
              <div class="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-0.5">
                <mat-icon svgIcon="mail" class="icon-size-3.5"></mat-icon>
                <span>Correo registrado: <strong>{{ selectedClientEmail }}</strong></span>
              </div>
            }
          </div>

          <!-- Almacén -->
          <div class="space-y-1.5 md:col-span-3">
            <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Almacén de Despacho
            </label>
            <mat-form-field appearance="outline" class="w-full fuse-mat-dense">
              <mat-select [(ngModel)]="selectedAlmacenId" placeholder="Seleccionar almacén...">
                @for (alm of warehouses(); track alm.id) {
                  <mat-option [value]="alm.id">{{ alm.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Validez de Oferta (Días) -->
          <div class="space-y-1.5 md:col-span-3">
            <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Validez de la Oferta
            </label>
            <mat-form-field appearance="outline" class="w-full fuse-mat-dense">
              <mat-select [(ngModel)]="validityDays" (selectionChange)="onValidityDaysChanged($event.value)" placeholder="Vigencia...">
                <mat-option [value]="15">15 Días</mat-option>
                <mat-option [value]="30">30 Días (Estándar)</mat-option>
                <mat-option [value]="60">60 Días</mat-option>
                <mat-option [value]="90">90 Días</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </div>

        <!-- Line Items Section -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white">
                Detalle de Productos y Servicios
              </h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                {{ items.length }} {{ items.length === 1 ? 'línea' : 'líneas' }}
              </span>
            </div>

            <button
              type="button"
              (click)="addItemLine()"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-bold transition-colors cursor-pointer"
            >
              <mat-icon svgIcon="plus" class="icon-size-4"></mat-icon>
              <span>Agregar Línea</span>
            </button>
          </div>

          <!-- Items Table -->
          <div class="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xs">
            <table class="w-full text-left text-xs min-w-[960px]">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800 uppercase text-[11px] tracking-wider">
                <tr>
                  <th class="py-3 px-3 w-10 text-center">#</th>
                  <th class="py-3 px-4 min-w-[340px]">Producto / Descripción</th>
                  <th class="py-3 px-3 w-28 text-center">Cant.</th>
                  <th class="py-3 px-3 w-40 text-right">Precio Unit. (RD$)</th>
                  <th class="py-3 px-3 w-28 text-center">Desc. %</th>
                  <th class="py-3 px-3 w-32 text-center">ITBIS</th>
                  <th class="py-3 px-4 w-36 text-right font-bold">Total (RD$)</th>
                  <th class="py-3 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                @for (item of items; track $index; let idx = $index) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td class="py-3 px-3 text-neutral-400 font-mono text-center font-bold">{{ idx + 1 }}</td>

                    <!-- Product Select / Description Input -->
                    <td class="py-3 px-4">
                      <div class="space-y-1.5">
                        <select
                          [(ngModel)]="item.productoId"
                          (change)="onProductSelected(item)"
                          class="w-full h-9 px-3 text-xs font-semibold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                        >
                          <option [value]="undefined">-- Producto / Personalizado --</option>
                          @for (p of products(); track p.id) {
                            <option [value]="p.id">
                              {{ p.nombre }} (RD$ {{ p.precioVenta | number: '1.2-2' }})
                            </option>
                          }
                        </select>
                        <input
                          type="text"
                          [(ngModel)]="item.descripcion"
                          placeholder="Descripción detallada del ítem..."
                          class="w-full h-8 px-3 text-[11px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 outline-none focus:border-blue-500"
                        />
                      </div>
                    </td>

                    <!-- Cantidad -->
                    <td class="py-3 px-3 align-top">
                      <input
                        type="number"
                        [(ngModel)]="item.cantidad"
                        (ngModelChange)="recalculateLine(item)"
                        min="1"
                        class="w-full h-9 text-center px-2 text-xs font-mono font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                      />
                    </td>

                    <!-- Precio Unitario -->
                    <td class="py-3 px-3 align-top">
                      <input
                        type="number"
                        [(ngModel)]="item.precioUnitario"
                        (ngModelChange)="recalculateLine(item)"
                        min="0"
                        step="0.01"
                        class="w-full h-9 text-right px-3 text-xs font-mono font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                      />
                    </td>

                    <!-- Descuento % -->
                    <td class="py-3 px-3 align-top">
                      <input
                        type="number"
                        [(ngModel)]="item.descuentoPorcentaje"
                        (ngModelChange)="onDiscountPercentChanged(item)"
                        min="0"
                        max="100"
                        class="w-full h-9 text-center px-2 text-xs font-mono rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors"
                      />
                    </td>

                    <!-- Tasa ITBIS -->
                    <td class="py-3 px-3 align-top">
                      <select
                        [(ngModel)]="item.tasaItbis"
                        (change)="recalculateLine(item)"
                        class="w-full h-9 text-center px-2 text-xs font-bold rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-900 transition-colors cursor-pointer"
                      >
                        <option [value]="18">18% (ITBIS)</option>
                        <option [value]="16">16%</option>
                        <option [value]="0">0% (Exento)</option>
                      </select>
                    </td>

                    <!-- Total de Línea -->
                    <td class="py-3 px-4 text-right font-mono font-bold text-sm text-neutral-900 dark:text-white align-top pt-4">
                      RD$ {{ item.total | number: '1.2-2' }}
                    </td>

                    <!-- Delete Button -->
                    <td class="py-3 px-2 text-center align-top pt-3.5">
                      @if (items.length > 1) {
                        <button
                          type="button"
                          (click)="removeItemLine(idx)"
                          class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                          <mat-icon svgIcon="trash-2" class="icon-size-4"></mat-icon>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Bottom Section: Commercial Notes & Financial Summary -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <!-- Commercial Conditions -->
          <div class="space-y-4">
            <div class="space-y-1">
              <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Condiciones y Observaciones
              </label>
              <textarea
                [(ngModel)]="notas"
                rows="2"
                placeholder="Tiempo de entrega, garantía, forma de pago (ej: 50% anticipo)..."
                class="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 resize-none"
              ></textarea>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                Términos Comerciales Adicionales
              </label>
              <textarea
                [(ngModel)]="terminosCondiciones"
                rows="2"
                placeholder="Precios sujetos a cambio, validez estricta..."
                class="w-full px-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-white outline-none focus:border-blue-500 resize-none"
              ></textarea>
            </div>
          </div>

          <!-- Financial Calculation Box -->
          <div class="p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <div class="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span>Subtotal Neto:</span>
              <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ calculatedSubtotal() | number: '1.2-2' }}</span>
            </div>

            <div class="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
              <span>Descuento Global Adicional:</span>
              <div class="w-32">
                <input
                  type="number"
                  [(ngModel)]="globalDiscount"
                  (ngModelChange)="onGlobalDiscountChanged()"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full text-right py-1 px-2 text-xs font-mono font-bold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-emerald-600 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div class="flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
              <span>Total ITBIS (18%):</span>
              <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ calculatedItbis() | number: '1.2-2' }}</span>
            </div>

            <div class="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-baseline">
              <span class="text-sm font-extrabold text-neutral-900 dark:text-white">TOTAL COTIZADO:</span>
              <span class="text-xl font-mono font-black text-blue-600 dark:text-blue-400">
                RD$ {{ calculatedGrandTotal() | number: '1.2-2' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <button
          type="button"
          (click)="close()"
          class="w-full sm:w-auto px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          Cancelar
        </button>

        <div class="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            (click)="saveQuote(false)"
            [disabled]="saving()"
            class="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            {{ isEdit ? 'Actualizar Cotización' : 'Guardar Cotización' }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class QuoteDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<QuoteDialogComponent>);
  data = inject<{ quote?: Cotizacion }>(MAT_DIALOG_DATA);
  quotesService = inject(QuotesService);
  clientsService = inject(ClientsService);
  productsService = inject(ProductsService);
  inventoryService = inject(InventoryService);
  snackBar = inject(MatSnackBar);
  dialog = inject(MatDialog);

  isEdit = Boolean(this.data?.quote);
  quote = this.data?.quote;

  clients = signal<Client[]>([]);
  products = signal<Product[]>([]);
  warehouses = signal<Warehouse[]>([]);

  selectedClienteId: string | null = null;
  selectedClientEmail: string | null = null;
  selectedAlmacenId: string | null = null;
  validityDays = 30;

  notas = '';
  terminosCondiciones = '';
  globalDiscount = 0;

  items: QuoteLineItem[] = [];
  saving = signal<boolean>(false);

  calculatedSubtotal = computed(() => {
    return this.items.reduce((acc, i) => acc + (i.cantidad * i.precioUnitario - i.descuento), 0);
  });

  calculatedItbis = computed(() => {
    return this.items.reduce((acc, i) => acc + i.itbis, 0);
  });

  calculatedGrandTotal = computed(() => {
    const sub = this.calculatedSubtotal();
    const itbis = this.calculatedItbis();
    const grand = sub - this.globalDiscount + itbis;
    return Math.max(0, grand);
  });

  ngOnInit(): void {
    this.loadCatalogData();

    if (this.isEdit && this.quote) {
      this.selectedClienteId = this.quote.clienteId || null;
      this.selectedClientEmail = this.quote.cliente?.email || null;
      this.selectedAlmacenId = this.quote.almacenId || null;
      this.notas = this.quote.notas || '';
      this.terminosCondiciones = this.quote.terminosCondiciones || '';
      this.globalDiscount = Number(this.quote.descuento || 0);

      this.items = this.quote.detalles.map((d) => ({
        productoId: d.productoId || undefined,
        descripcion: d.descripcion,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        descuentoPorcentaje: Number(d.porcentajeDescuento || 0),
        descuento: Number(d.descuento || 0),
        tasaItbis: Number(d.tasaItbis || 18),
        itbis: Number(d.itbis || 0),
        subtotal: Number(d.subtotal),
        total: Number(d.total),
      }));
    } else {
      this.addItemLine();
    }
  }

  loadCatalogData(): void {
    this.clientsService.findAll().subscribe((res: any) => {
      this.clients.set(res || []);
    });

    this.productsService.findAll().subscribe((res: any) => {
      this.products.set(res || []);
    });

    this.inventoryService.getWarehouses().subscribe((res: any) => {
      this.warehouses.set(res || []);
      if (res && res.length > 0 && !this.selectedAlmacenId) {
        this.selectedAlmacenId = res[0].id;
      }
    });
  }

  onClienteSelected(clienteId: string | null): void {
    if (!clienteId) {
      this.selectedClientEmail = null;
      return;
    }
    const c = this.clients().find((cl) => cl.id === clienteId);
    this.selectedClientEmail = c?.email || null;
  }

  onValidityDaysChanged(days: number): void {
    this.validityDays = days;
  }

  addItemLine(): void {
    this.items.push({
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuentoPorcentaje: 0,
      descuento: 0,
      tasaItbis: 18,
      itbis: 0,
      subtotal: 0,
      total: 0,
    });
  }

  removeItemLine(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
    }
  }

  onProductSelected(item: QuoteLineItem): void {
    if (!item.productoId) return;
    const prod = this.products().find((p) => p.id === item.productoId);
    if (prod) {
      item.descripcion = prod.nombre;
      item.precioUnitario = Number(prod.precioVenta || 0);
      item.tasaItbis = prod.taxRate !== undefined && prod.taxRate !== null ? Number(prod.taxRate) : 18;
      this.recalculateLine(item);
    }
  }

  onDiscountPercentChanged(item: QuoteLineItem): void {
    const gross = item.cantidad * item.precioUnitario;
    item.descuento = (gross * (item.descuentoPorcentaje || 0)) / 100;
    this.recalculateLine(item);
  }

  onGlobalDiscountChanged(): void {
    // triggers computed signals
  }

  recalculateLine(item: QuoteLineItem): void {
    const gross = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
    const desc = Number(item.descuento || 0);
    const net = Math.max(0, gross - desc);
    const itbis = (net * Number(item.tasaItbis || 18)) / 100;
    item.subtotal = net;
    item.itbis = itbis;
    item.total = net + itbis;
  }

  close(): void {
    this.dialogRef.close(false);
  }

  saveQuote(sendAfterSave = false): void {
    if (this.items.length === 0 || !this.items.some((i) => i.descripcion.trim())) {
      this.snackBar.open('Agrega al menos una línea con descripción válida.', 'Cerrar', { duration: 3500 });
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.validityDays);

    const payload: CreateQuoteDto = {
      clienteId: this.selectedClienteId || undefined,
      almacenId: this.selectedAlmacenId || undefined,
      fechaVencimiento: dueDate.toISOString(),
      notas: this.notas?.trim() || undefined,
      terminosCondiciones: this.terminosCondiciones?.trim() || undefined,
      descuento: Number(this.globalDiscount || 0),
      items: this.items.map((i) => ({
        productoId: i.productoId || undefined,
        descripcion: i.descripcion.trim(),
        cantidad: Number(i.cantidad),
        precioUnitario: Number(i.precioUnitario),
        descuento: Number(i.descuento || 0),
        porcentajeDescuento: Number(i.descuentoPorcentaje || 0),
        tasaItbis: Number(i.tasaItbis),
      })),
    };

    this.saving.set(true);

    const request$ = this.isEdit && this.quote
      ? this.quotesService.updateQuote(this.quote.id, payload)
      : this.quotesService.createQuote(payload);

    request$.subscribe({
      next: (created) => {
        this.saving.set(false);
        this.snackBar.open(
          this.isEdit ? 'Cotización actualizada exitosamente.' : 'Cotización creada exitosamente.',
          'Cerrar',
          { duration: 3500 },
        );
        this.dialogRef.close(created);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err.error?.message || 'Error al guardar la cotización.';
        this.snackBar.open(msg, 'Cerrar', { duration: 4500 });
      },
    });
  }
}
