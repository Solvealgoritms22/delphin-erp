import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CreatePurchaseDto,
  PurchaseItemDto,
} from '../../data/purchases.service';
import { SuppliersService } from '../../data/suppliers.service';
import { ProductsService, Product } from '../../../catalogs/data/products.service';
import { InventoryService, Warehouse } from '../../../catalogs/data/inventory.service';

export type PurchaseItemRow = {
  productoId?: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  descuento: number;
  tasaItbis: number;
  afectaInventario: boolean;
}

@Component({
  selector: 'app-purchase-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatDatepickerModule,
    DecimalPipe,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full min-w-0 max-h-[90vh] overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div>
          <h2 class="text-xl font-bold tracking-tight">
            {{ 'commercial.purchases.dialog.title' | transloco }}
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">
            {{ 'commercial.purchases.dialog.subtitle' | transloco }}
          </p>
        </div>
        <button
          (click)="dialogRef.close()"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
        >
          <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
        </button>
      </div>

      <!-- Modal Body Form -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Encabezado de Compra: Proveedor, NCF, Gasto y Almacén -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
          <!-- Proveedor -->
          <div class="lg:col-span-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.supplier' | transloco }} *</mat-label>
              <mat-select [(ngModel)]="purchaseData.proveedorId" [placeholder]="'common.select' | transloco">
                @for (sup of suppliers(); track sup.id) {
                  <mat-option [value]="sup.id">
                    {{ sup.nombreRazonSocial }} ({{ sup.numeroDocumento }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <!-- NCF del Proveedor -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.ncf' | transloco }}</mat-label>
              <input
                matInput
                [(ngModel)]="purchaseData.ncf"
                placeholder="B0100000123"
              />
            </mat-form-field>
          </div>

          <!-- Almacén de Destino -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.warehouse' | transloco }} *</mat-label>
              <mat-select [(ngModel)]="purchaseData.almacenId" [placeholder]="'common.select' | transloco">
                @for (wh of warehouses(); track wh.id) {
                  <mat-option [value]="wh.id">
                    {{ wh.nombre }} {{ wh.esPrincipal ? '(Principal)' : '' }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Tipo de Gasto DGII 606 -->
          <div class="lg:col-span-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.expenseType' | transloco }} (DGII 606)</mat-label>
              <mat-select [(ngModel)]="purchaseData.tipoGasto" [placeholder]="'common.select' | transloco">
                <mat-option value="09">09 - Compras que forman parte del costo de venta</mat-option>
                <mat-option value="02">02 - Gastos por trabajos, suministros y servicios</mat-option>
                <mat-option value="01">01 - Gastos de personal</mat-option>
                <mat-option value="03">03 - Arrendamientos</mat-option>
                <mat-option value="04">04 - Gastos de activos fijos</mat-option>
                <mat-option value="05">05 - Gastos de representación</mat-option>
                <mat-option value="06">06 - Otras deducciones admitidas</mat-option>
                <mat-option value="07">07 - Gastos financieros</mat-option>
                <mat-option value="08">08 - Gastos extraordinarios</mat-option>
                <mat-option value="10">10 - Adquisiciones de activos fijos</mat-option>
                <mat-option value="11">11 - Gastos de seguros</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Tipo de Pago (Contado / Crédito) -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.paymentType' | transloco }}</mat-label>
              <mat-select [(ngModel)]="purchaseData.tipoPago" [placeholder]="'common.select' | transloco">
                <mat-option value="CONTADO">Contado</mat-option>
                <mat-option value="CREDITO">Crédito</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Método de Pago -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.paymentMethod' | transloco }}</mat-label>
              <mat-select [(ngModel)]="purchaseData.metodoPago" [placeholder]="'common.select' | transloco">
                <mat-option value="TRANSFERENCIA">Transferencia Bancaria</mat-option>
                <mat-option value="CHEQUE">Cheque</mat-option>
                <mat-option value="EFECTIVO">Efectivo</mat-option>
                <mat-option value="TARJETA">Tarjeta</mat-option>
                <mat-option value="OTRO">Otro</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Fecha de Emisión con Datepicker -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.date' | transloco }}</mat-label>
              <input
                matInput
                [matDatepicker]="pickerFecha"
                [(ngModel)]="fechaEmision"
                placeholder="dd/mm/aaaa"
              />
              <mat-datepicker-toggle matIconSuffix [for]="pickerFecha"></mat-datepicker-toggle>
              <mat-datepicker #pickerFecha></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Fecha de Vencimiento con Datepicker -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.dueDate' | transloco }}</mat-label>
              <input
                matInput
                [matDatepicker]="pickerVencimiento"
                [(ngModel)]="fechaVencimiento"
                placeholder="dd/mm/aaaa"
              />
              <mat-datepicker-toggle matIconSuffix [for]="pickerVencimiento"></mat-datepicker-toggle>
              <mat-datepicker #pickerVencimiento></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- No. Factura Proveedor / Referencia -->
          <div class="lg:col-span-2">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.dialog.invoiceNumber' | transloco }}</mat-label>
              <input
                matInput
                [(ngModel)]="purchaseData.numeroFactura"
                placeholder="FAC-009843"
              />
            </mat-form-field>
          </div>
        </div>

        <!-- Tabla de Artículos y Líneas de Gasto -->
        <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-3 bg-neutral-100/70 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800">
            <h3 class="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              {{ 'commercial.purchases.dialog.itemsTitle' | transloco }}
            </h3>
            <button
              type="button"
              (click)="addItem()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <mat-icon svgIcon="plus" class="icon-size-3.5"></mat-icon>
              {{ 'commercial.purchases.dialog.addItem' | transloco }}
            </button>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-neutral-50 dark:bg-neutral-800/40 text-neutral-500 dark:text-neutral-400 text-xs border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th class="py-3 px-4 min-w-[200px]">Producto / Descripción</th>
                  <th class="py-3 px-2 w-24">Cant.</th>
                  <th class="py-3 px-2 w-28">Costo Unit.</th>
                  <th class="py-3 px-2 w-24">% ITBIS</th>
                  <th class="py-3 px-2 w-24">Descuento</th>
                  <th class="py-3 px-3 w-28 text-right">Subtotal</th>
                  <th class="py-3 px-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
                @for (item of items(); track $index; let i = $index) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <!-- Selector de Producto / Descripción -->
                    <td class="py-2.5 px-4">
                      <div class="space-y-1.5">
                        <select
                          [ngModel]="item.productoId"
                          (ngModelChange)="onProductSelected(i, $event)"
                          class="w-full text-xs font-medium bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 outline-none focus:border-blue-500"
                        >
                          <option [ngValue]="undefined">-- Línea de Gasto / Servicio Libre --</option>
                          @for (p of products(); track p.id) {
                            <option [ngValue]="p.id">
                              {{ p.codigo ? '[' + p.codigo + '] ' : '' }}{{ p.nombre }}
                            </option>
                          }
                        </select>
                        <input
                          type="text"
                          [(ngModel)]="item.descripcion"
                          placeholder="Descripción del item / servicio..."
                          class="w-full text-xs bg-transparent border-b border-neutral-200 dark:border-neutral-700 pb-1 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </td>

                    <!-- Cantidad -->
                    <td class="py-2.5 px-2">
                      <input
                        type="number"
                        min="0.01"
                        step="1"
                        [(ngModel)]="item.cantidad"
                        (ngModelChange)="recalculate()"
                        class="w-full text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 text-right"
                      />
                    </td>

                    <!-- Costo Unitario -->
                    <td class="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        [(ngModel)]="item.costoUnitario"
                        (ngModelChange)="recalculate()"
                        class="w-full text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 text-right"
                      />
                    </td>

                    <!-- % ITBIS -->
                    <td class="py-2.5 px-2">
                      <select
                        [(ngModel)]="item.tasaItbis"
                        (ngModelChange)="recalculate()"
                        class="w-full text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2"
                      >
                        <option [value]="18">18%</option>
                        <option [value]="16">16%</option>
                        <option [value]="0">0% (Exento)</option>
                      </select>
                    </td>

                    <!-- Descuento de Línea -->
                    <td class="py-2.5 px-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        [(ngModel)]="item.descuento"
                        (ngModelChange)="recalculate()"
                        class="w-full text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2 text-right"
                      />
                    </td>

                    <!-- Subtotal de Línea -->
                    <td class="py-2.5 px-3 text-right font-bold text-neutral-900 dark:text-white">
                      RD$ {{ getItemTotal(item) | number: '1.2-2' }}
                    </td>

                    <!-- Eliminar fila -->
                    <td class="py-2.5 px-2 text-center">
                      @if (items().length > 1) {
                        <button
                          type="button"
                          (click)="removeItem(i)"
                          class="text-neutral-400 hover:text-rose-500 transition-colors p-1"
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

        <!-- Resumen de Totales y Retenciones -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <!-- Notas -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Notas u Observaciones</mat-label>
              <textarea
                matInput
                [(ngModel)]="purchaseData.notas"
                rows="4"
                placeholder="Detalles sobre entrega, crédito, condición de mercancía..."
              ></textarea>
            </mat-form-field>
          </div>

          <!-- Cuadro de Totales Fiscales -->
          <div class="bg-neutral-50 dark:bg-neutral-800/40 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2 text-sm">
            <div class="flex justify-between text-neutral-600 dark:text-neutral-400 text-xs">
              <span>Subtotal Bruto</span>
              <span class="font-medium text-neutral-900 dark:text-white">
                RD$ {{ subtotalBruto() | number: '1.2-2' }}
              </span>
            </div>
            <div class="flex justify-between text-rose-600 dark:text-rose-400 text-xs">
              <span>Descuento Total</span>
              <span class="font-medium">
                - RD$ {{ totalDescuento() | number: '1.2-2' }}
              </span>
            </div>
            <div class="flex justify-between text-neutral-600 dark:text-neutral-400 text-xs">
              <span>ITBIS Facturado</span>
              <span class="font-medium text-neutral-900 dark:text-white">
                RD$ {{ totalItbis() | number: '1.2-2' }}
              </span>
            </div>

            <!-- Retenciones Fiscales (606) -->
            <div class="pt-2 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-2 gap-3">
              <div>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Retención ITBIS (RD$)</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    step="0.01"
                    [(ngModel)]="purchaseData.itbisRetenido"
                    (ngModelChange)="recalculate()"
                  />
                </mat-form-field>
              </div>
              <div>
                <mat-form-field appearance="outline" class="w-full">
                  <mat-label>Retención ISR (RD$)</mat-label>
                  <input
                    matInput
                    type="number"
                    min="0"
                    step="0.01"
                    [(ngModel)]="purchaseData.retencionRenta"
                    (ngModelChange)="recalculate()"
                  />
                </mat-form-field>
              </div>
            </div>

            <!-- Gran Total -->
            <div class="pt-2 border-t border-neutral-300 dark:border-neutral-700 flex justify-between items-baseline">
              <span class="text-base font-bold text-neutral-900 dark:text-white">Total a Pagar</span>
              <span class="text-xl font-black text-blue-600 dark:text-blue-400">
                RD$ {{ grandTotal() | number: '1.2-2' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 shrink-0">
        <button
          type="button"
          (click)="dialogRef.close()"
          class="px-4 py-2 text-sm font-semibold rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {{ 'common.cancel' | transloco }}
        </button>
        <button
          type="button"
          (click)="submit()"
          [disabled]="isSubmitting() || !isValid()"
          class="px-5 py-2.5 text-sm font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-all cursor-pointer shadow-sm"
        >
          {{ isSubmitting() ? 'Guardando...' : ('commercial.purchases.dialog.submit' | transloco) }}
        </button>
      </div>
    </div>
  `,
})
export class PurchaseDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PurchaseDialogComponent>);
  suppliersService = inject(SuppliersService);
  productsService = inject(ProductsService);
  inventoryService = inject(InventoryService);

  suppliers = this.suppliersService.suppliers;
  warehouses = signal<Warehouse[]>([]);
  products = signal<Product[]>([]);
  isSubmitting = signal(false);

  fechaEmision: Date = new Date();
  fechaVencimiento?: Date;

  purchaseData: Partial<CreatePurchaseDto> = {
    proveedorId: undefined,
    ncf: '',
    tipoGasto: '09',
    tipoPago: 'CONTADO',
    metodoPago: 'TRANSFERENCIA',
    itbisRetenido: 0,
    retencionRenta: 0,
    notas: '',
  };

  items = signal<PurchaseItemRow[]>([
    {
      productoId: undefined,
      descripcion: '',
      cantidad: 1,
      costoUnitario: 0,
      descuento: 0,
      tasaItbis: 18,
      afectaInventario: true,
    },
  ]);

  subtotalBruto = signal(0);
  totalDescuento = signal(0);
  totalItbis = signal(0);
  grandTotal = signal(0);

  ngOnInit() {
    this.suppliersService.findAll().subscribe();
    this.inventoryService.getWarehouses().subscribe((whs) => {
      this.warehouses.set(whs);
      if (whs.length > 0 && !this.purchaseData.almacenId) {
        const principal = whs.find((w) => w.esPrincipal) || whs[0];
        this.purchaseData.almacenId = principal.id;
      }
    });
    this.productsService.findAll().subscribe((prods) => {
      this.products.set(prods || []);
    });
    this.recalculate();
  }

  addItem() {
    this.items.update((curr) => [
      ...curr,
      {
        productoId: undefined,
        descripcion: '',
        cantidad: 1,
        costoUnitario: 0,
        descuento: 0,
        tasaItbis: 18,
        afectaInventario: true,
      },
    ]);
  }

  removeItem(index: number) {
    this.items.update((curr) => curr.filter((_, i) => i !== index));
    this.recalculate();
  }

  onProductSelected(index: number, productoId: string | undefined) {
    const product = this.products().find((p) => p.id === productoId);
    this.items.update((curr) => {
      const copy = [...curr];
      if (product) {
        copy[index] = {
          ...copy[index],
          productoId: product.id,
          descripcion: product.nombre,
          costoUnitario: Number(product.costo) || 0,
          tasaItbis: Number(product.taxRate) || 18,
          afectaInventario: product.tipo !== 'SERVICIO',
        };
      } else {
        copy[index] = {
          ...copy[index],
          productoId: undefined,
          descripcion: '',
          costoUnitario: 0,
          afectaInventario: false,
        };
      }
      return copy;
    });
    this.recalculate();
  }

  getItemTotal(item: PurchaseItemRow): number {
    const sub = item.cantidad * item.costoUnitario - (item.descuento || 0);
    const tax = sub * (item.tasaItbis / 100);
    return Math.max(0, sub + tax);
  }

  recalculate() {
    let subtotal = 0;
    let desc = 0;
    let itbis = 0;

    for (const item of this.items()) {
      const base = item.cantidad * item.costoUnitario;
      const d = item.descuento || 0;
      const lineSub = Math.max(0, base - d);
      const lineTax = lineSub * (item.tasaItbis / 100);

      subtotal += base;
      desc += d;
      itbis += lineTax;
    }

    this.subtotalBruto.set(subtotal);
    this.totalDescuento.set(desc);
    this.totalItbis.set(itbis);

    const totalBeforeRet = subtotal - desc + itbis;
    const retItbis = Number(this.purchaseData.itbisRetenido) || 0;
    const retIsr = Number(this.purchaseData.retencionRenta) || 0;

    this.grandTotal.set(Math.max(0, totalBeforeRet - retItbis - retIsr));
  }

  isValid(): boolean {
    if (!this.purchaseData.proveedorId || !this.purchaseData.almacenId) {
      return false;
    }
    if (this.items().length === 0) return false;
    for (const item of this.items()) {
      if (!item.descripcion?.trim() || item.cantidad <= 0 || item.costoUnitario < 0) {
        return false;
      }
    }
    return true;
  }

  submit() {
    if (!this.isValid()) return;

    this.isSubmitting.set(true);

    const payload: CreatePurchaseDto = {
      proveedorId: this.purchaseData.proveedorId!,
      almacenId: this.purchaseData.almacenId!,
      numeroFactura: this.purchaseData.numeroFactura?.trim() || undefined,
      ncf: this.purchaseData.ncf?.trim() || undefined,
      tipoGasto: this.purchaseData.tipoGasto,
      tipoPago: this.purchaseData.tipoPago as any,
      metodoPago: this.purchaseData.metodoPago as any,
      fecha: this.fechaEmision instanceof Date ? this.fechaEmision.toISOString() : new Date(this.fechaEmision).toISOString(),
      fechaVencimiento: this.fechaVencimiento
        ? this.fechaVencimiento instanceof Date
          ? this.fechaVencimiento.toISOString()
          : new Date(this.fechaVencimiento).toISOString()
        : undefined,
      itbisRetenido: Number(this.purchaseData.itbisRetenido) || 0,
      retencionRenta: Number(this.purchaseData.retencionRenta) || 0,
      notas: this.purchaseData.notas?.trim() || undefined,
      items: this.items().map(
        (it) =>
          ({
            productoId: it.productoId || undefined,
            descripcion: it.descripcion.trim(),
            cantidad: Number(it.cantidad),
            costoUnitario: Number(it.costoUnitario),
            descuento: Number(it.descuento) || 0,
            tasaItbis: Number(it.tasaItbis) || 0,
            afectaInventario: it.afectaInventario,
          }) satisfies PurchaseItemDto,
      ),
    };

    this.dialogRef.close(payload);
  }
}
