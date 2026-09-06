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
import { Cotizacion, QuotesService, CreateQuoteDto } from '../../data/quotes.service';
import { ClientsService, Client } from '../../data/clients';
import { ProductsService, Product } from '../../../catalogs/data/products.service';
import { InventoryService, Warehouse } from '../../../catalogs/data/inventory.service';
import { CurrencyConfigService } from '@core/currency/currency-config.service';

type QuoteLineItem = {
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
    <div class="flex flex-col max-h-[92vh] w-full min-w-0 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl overflow-hidden shadow-2xl">
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
      <div class="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <!-- Top Form Section: Client, Warehouse, Currency, Validity -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-800">
          <!-- Client Selector -->
          <div class="md:col-span-5">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Cliente Destinatario</mat-label>
              <mat-select
                [(ngModel)]="selectedClienteId"
                (selectionChange)="onClienteSelected($event.value)"
                placeholder="Seleccionar cliente..."
              >
                <mat-option [value]="null">Consumidor Final / General</mat-option>
                @for (c of clients(); track c.id) {
                  <mat-option [value]="c.id">
                    {{ c.nombreRazonSocial }} {{ c.numeroDocumento ? '(' + c.numeroDocumento + ')' : '' }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (selectedClientEmail) {
              <div class="text-[11px] font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mt-1 px-1">
                <mat-icon svgIcon="mail" class="icon-size-3.5"></mat-icon>
                <span>Correo registrado: <strong>{{ selectedClientEmail }}</strong></span>
              </div>
            }
          </div>

          <!-- Almacén -->
          <div class="md:col-span-3">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Almacén de Despacho</mat-label>
              <mat-select [(ngModel)]="selectedAlmacenId" placeholder="Seleccionar almacén...">
                @for (alm of warehouses(); track alm.id) {
                  <mat-option [value]="alm.id">{{ alm.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Moneda de la Cotización -->
          <div class="md:col-span-2">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Moneda</mat-label>
              <mat-select
                [ngModel]="selectedMoneda()"
                (selectionChange)="onMonedaChanged($event.value)"
                placeholder="Moneda..."
              >
                <mat-option value="DOP">DOP (RD$)</mat-option>
                <mat-option value="USD">USD ($)</mat-option>
                <mat-option value="EUR">EUR (€)</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Validez de Oferta (Días) -->
          <div class="md:col-span-2">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Validez</mat-label>
              <mat-select
                [(ngModel)]="validityDays"
                (selectionChange)="onValidityDaysChanged($event.value)"
                placeholder="Vigencia..."
              >
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
            <table class="w-full text-left text-xs min-w-[980px]">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800 uppercase text-[11px] tracking-wider">
                <tr>
                  <th class="py-3.5 px-3 w-12 text-center">#</th>
                  <th class="py-3.5 px-3 min-w-[340px]">Producto / Descripción</th>
                  <th class="py-3.5 px-2.5 w-28 text-center">Cant.</th>
                  <th class="py-3.5 px-2.5 w-36 text-right">Precio Unit. ({{ currencySymbol() }})</th>
                  <th class="py-3.5 px-2.5 w-28 text-center">Desc. %</th>
                  <th class="py-3.5 px-2.5 w-36 text-center">{{ currencyConfig.defaultTaxLabel() }}</th>
                  <th class="py-3.5 px-3 w-36 text-right font-bold">Total ({{ currencySymbol() }})</th>
                  <th class="py-3.5 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                @for (item of items; track $index; let idx = $index) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td class="py-3 px-3 text-neutral-400 font-mono text-center font-bold align-middle">{{ idx + 1 }}</td>

                    <!-- Product Select / Description Input -->
                    <td class="py-3 px-3 align-middle min-w-[340px]">
                      <div class="space-y-2">
                        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                          <mat-select
                            [(ngModel)]="item.productoId"
                            (selectionChange)="onProductSelected(item)"
                            placeholder="Seleccionar producto del catálogo o libre..."
                          >
                            <mat-option [value]="undefined">-- Producto Libre / Personalizado --</mat-option>
                            @for (p of products(); track p.id) {
                              <mat-option [value]="p.id">
                                {{ p.nombre }} ({{ formatProductPrice(p) }})
                              </mat-option>
                            }
                          </mat-select>
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                          <input
                            matInput
                            type="text"
                            [(ngModel)]="item.descripcion"
                            placeholder="Descripción detallada del ítem..."
                          />
                        </mat-form-field>
                      </div>
                    </td>

                    <!-- Cantidad -->
                    <td class="py-3 px-2.5 align-middle w-28">
                      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <input
                          matInput
                          type="number"
                          [(ngModel)]="item.cantidad"
                          (ngModelChange)="recalculateLine(item)"
                          min="1"
                          placeholder="1"
                          class="text-center font-mono font-bold"
                        />
                      </mat-form-field>
                    </td>

                    <!-- Precio Unitario -->
                    <td class="py-3 px-2.5 align-middle w-36">
                      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <input
                          matInput
                          type="number"
                          [(ngModel)]="item.precioUnitario"
                          (ngModelChange)="recalculateLine(item)"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          class="text-right font-mono font-bold"
                        />
                      </mat-form-field>
                    </td>

                    <!-- Descuento % -->
                    <td class="py-3 px-2.5 align-middle w-28">
                      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <input
                          matInput
                          type="number"
                          [(ngModel)]="item.descuentoPorcentaje"
                          (ngModelChange)="onDiscountPercentChanged(item)"
                          min="0"
                          max="100"
                          placeholder="0"
                          class="text-center font-mono"
                        />
                      </mat-form-field>
                    </td>

                    <!-- Tasa ITBIS -->
                    <td class="py-3 px-2.5 align-middle w-36">
                      <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                        <mat-select
                          [(ngModel)]="item.tasaItbis"
                          (selectionChange)="recalculateLine(item)"
                          placeholder="Tasa..."
                        >
                          @for (tax of availableTaxes(); track tax.id) {
                            <mat-option [value]="tax.tasa">{{ tax.nombre }} ({{ tax.tasa }}%)</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </td>

                    <!-- Total de Línea -->
                    <td class="py-3 px-3 text-right font-mono font-bold text-sm text-neutral-900 dark:text-white align-middle w-36">
                      {{ currencySymbol() }} {{ item.total | number: '1.2-2' }}
                    </td>

                    <!-- Delete Button -->
                    <td class="py-3 px-2 text-center align-middle w-12">
                      @if (items.length > 1) {
                        <button
                          type="button"
                          (click)="removeItemLine(idx)"
                          class="w-8 h-8 inline-flex items-center justify-center rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-3">
          <!-- Commercial Conditions -->
          <div class="lg:col-span-7 space-y-4">
            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Condiciones y Observaciones</mat-label>
              <textarea
                matInput
                [(ngModel)]="notas"
                rows="2"
                placeholder="Tiempo de entrega, garantía, forma de pago (ej: 50% anticipo)..."
              ></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
              <mat-label>Términos Comerciales Adicionales</mat-label>
              <textarea
                matInput
                [(ngModel)]="terminosCondiciones"
                rows="2"
                placeholder="Precios sujetos a cambio, validez estricta..."
              ></textarea>
            </mat-form-field>
          </div>

          <!-- Financial Calculation Box -->
          <div class="lg:col-span-5 p-5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-800 space-y-3.5">
            <div class="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
              <span class="font-medium">Subtotal Neto:</span>
              <span class="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                {{ currencySymbol() }} {{ calculatedSubtotal() | number: '1.2-2' }}
              </span>
            </div>

            <div class="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
              <span class="font-medium">Descuento Global Adicional:</span>
              <div class="w-36">
                <mat-form-field appearance="outline" class="w-full" subscriptSizing="dynamic">
                  <input
                    matInput
                    type="number"
                    [ngModel]="globalDiscount()"
                    (ngModelChange)="onGlobalDiscountChanged($event)"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    class="text-right font-mono font-bold !text-emerald-600 dark:!text-emerald-400"
                  />
                </mat-form-field>
              </div>
            </div>

            <div class="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-400">
              <span class="font-medium">Total {{ currencyConfig.defaultTaxLabel() }}:</span>
              <span class="font-mono font-bold text-neutral-900 dark:text-white text-sm">
                {{ currencySymbol() }} {{ calculatedItbis() | number: '1.2-2' }}
              </span>
            </div>

            <div class="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-baseline">
              <span class="text-sm font-extrabold text-neutral-900 dark:text-white">TOTAL COTIZADO:</span>
              <span class="text-xl font-mono font-black text-blue-600 dark:text-blue-400">
                {{ currencySymbol() }} {{ calculatedGrandTotal() | number: '1.2-2' }}
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
  currencyConfig = inject(CurrencyConfigService);

  isEdit = Boolean(this.data?.quote);
  quote = this.data?.quote;

  clients = signal<Client[]>([]);
  products = signal<Product[]>([]);
  warehouses = signal<Warehouse[]>([]);

  selectedClienteId: string | null = null;
  selectedClientEmail: string | null = null;
  selectedAlmacenId: string | null = null;
  selectedMoneda = signal<string>(this.quote?.moneda || 'DOP');
  validityDays = 30;

  notas = '';
  terminosCondiciones = '';
  globalDiscount = signal<number>(0);

  items: QuoteLineItem[] = [];
  itemsTrigger = signal<number>(0);
  saving = signal<boolean>(false);

  currencySymbol = computed(() => {
    const c = this.selectedMoneda();
    return c === 'USD' ? 'USD $' : c === 'EUR' ? '€' : 'RD$';
  });

  availableTaxes = computed(() => {
    const taxes = this.currencyConfig.taxes();
    if (taxes && taxes.length > 0) {
      const active = taxes.filter((t) => t.activo);
      if (active.length > 0) return active;
    }
    return [
      { id: 'tax-def', nombre: this.currencyConfig.defaultTaxName(), tasa: this.currencyConfig.defaultTaxRate() },
      { id: 'tax-ex', nombre: 'Exento', tasa: 0 },
    ];
  });

  formatProductPrice(p: Product): string {
    const sym = p.moneda === 'USD' ? 'USD $' : p.moneda === 'EUR' ? '€' : 'RD$';
    return `${sym} ${(p.precioVenta || 0).toFixed(2)}`;
  }

  calculatedSubtotal = computed(() => {
    this.itemsTrigger();
    return this.items.reduce((acc, i) => acc + (Number(i.cantidad || 0) * Number(i.precioUnitario || 0) - Number(i.descuento || 0)), 0);
  });

  calculatedItbis = computed(() => {
    this.itemsTrigger();
    return this.items.reduce((acc, i) => acc + Number(i.itbis || 0), 0);
  });

  calculatedGrandTotal = computed(() => {
    const sub = this.calculatedSubtotal();
    const itbis = this.calculatedItbis();
    const grand = sub - this.globalDiscount() + itbis;
    return Math.max(0, grand);
  });

  ngOnInit(): void {
    this.loadCatalogData();

    if (this.isEdit && this.quote) {
      this.selectedClienteId = this.quote.clienteId || null;
      this.selectedClientEmail = this.quote.cliente?.email || null;
      this.selectedAlmacenId = this.quote.almacenId || null;
      this.selectedMoneda.set(this.quote.moneda || this.currencyConfig.currency());
      this.notas = this.quote.notas || '';
      this.terminosCondiciones = this.quote.terminosCondiciones || '';
      this.globalDiscount.set(Number(this.quote.descuento || 0));

      this.items = this.quote.detalles.map((d) => ({
        productoId: d.productoId || undefined,
        descripcion: d.descripcion,
        cantidad: Number(d.cantidad),
        precioUnitario: Number(d.precioUnitario),
        descuentoPorcentaje: Number(d.porcentajeDescuento || 0),
        descuento: Number(d.descuento || 0),
        tasaItbis: Number(d.tasaItbis !== undefined ? d.tasaItbis : this.currencyConfig.defaultTaxRate()),
        itbis: Number(d.itbis || 0),
        subtotal: Number(d.subtotal),
        total: Number(d.total),
      }));
      this.itemsTrigger.update((n) => n + 1);
    } else {
      this.selectedMoneda.set(this.currencyConfig.currency());
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

  onMonedaChanged(newCur: string): void {
    this.selectedMoneda.set(newCur);
    for (const item of this.items) {
      if (item.productoId) {
        const prod = this.products().find((p) => p.id === item.productoId);
        if (prod) {
          const prodCur = prod.moneda || 'DOP';
          const rawPrice = Number(prod.precioVenta || 0);
          item.precioUnitario = this.currencyConfig.convertAmount(rawPrice, prodCur, newCur);
          this.recalculateLine(item);
        }
      }
    }
    this.itemsTrigger.update((n) => n + 1);
  }

  addItemLine(): void {
    this.items.push({
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuentoPorcentaje: 0,
      descuento: 0,
      tasaItbis: this.currencyConfig.defaultTaxRate(),
      itbis: 0,
      subtotal: 0,
      total: 0,
    });
    this.itemsTrigger.update((n) => n + 1);
  }

  removeItemLine(index: number): void {
    if (this.items.length > 1) {
      this.items.splice(index, 1);
      this.itemsTrigger.update((n) => n + 1);
    }
  }

  onProductSelected(item: QuoteLineItem): void {
    if (!item.productoId) return;
    const prod = this.products().find((p) => p.id === item.productoId);
    if (prod) {
      item.descripcion = prod.nombre;
      const targetCur = this.selectedMoneda() || this.currencyConfig.currency();
      const prodCur = prod.moneda || 'DOP';
      const rawPrice = Number(prod.precioVenta || 0);
      item.precioUnitario = this.currencyConfig.convertAmount(rawPrice, prodCur, targetCur);
      item.tasaItbis = prod.taxRate !== undefined && prod.taxRate !== null ? Number(prod.taxRate) : this.currencyConfig.defaultTaxRate();
      this.recalculateLine(item);
    }
  }

  onDiscountPercentChanged(item: QuoteLineItem): void {
    const gross = item.cantidad * item.precioUnitario;
    item.descuento = (gross * (item.descuentoPorcentaje || 0)) / 100;
    this.recalculateLine(item);
  }

  onGlobalDiscountChanged(val: any): void {
    this.globalDiscount.set(Number(val || 0));
  }

  recalculateLine(item: QuoteLineItem): void {
    const gross = Number(item.cantidad || 0) * Number(item.precioUnitario || 0);
    const desc = Number(item.descuento || 0);
    const net = Math.max(0, gross - desc);
    const taxRate = Number(item.tasaItbis !== undefined ? item.tasaItbis : this.currencyConfig.defaultTaxRate());
    const itbis = (net * taxRate) / 100;
    item.subtotal = net;
    item.itbis = itbis;
    item.total = net + itbis;
    this.itemsTrigger.update((n) => n + 1);
  }

  close(): void {
    this.dialogRef.close(false);
  }

  saveQuote(_sendAfterSave = false): void {
    if (this.items.length === 0 || !this.items.some((i) => i.descripcion.trim())) {
      this.snackBar.open('Agrega al menos una línea con descripción válida.', 'Cerrar', { duration: 3500 });
      return;
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + this.validityDays);

    const currentMoneda = this.selectedMoneda();
    const exchangeRate = currentMoneda === 'DOP' ? 1 : (this.currencyConfig.exchangeRates()[currentMoneda] || 1);

    const payload: CreateQuoteDto = {
      clienteId: this.selectedClienteId || undefined,
      almacenId: this.selectedAlmacenId || undefined,
      fechaVencimiento: dueDate.toISOString(),
      notas: this.notas?.trim() || undefined,
      terminosCondiciones: this.terminosCondiciones?.trim() || undefined,
      descuento: Number(this.globalDiscount() || 0),
      moneda: currentMoneda,
      tasaCambio: exchangeRate,
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
