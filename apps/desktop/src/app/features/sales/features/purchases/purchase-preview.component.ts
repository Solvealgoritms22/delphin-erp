import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FacturaCompra } from '../../data/purchases.service';

export type PurchasePreviewData = {
  purchase: FacturaCompra;
}

@Component({
  selector: 'app-purchase-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    DecimalPipe,
    DatePipe,
  ],
  template: `
    <div class="flex flex-col w-full min-w-0 max-h-[90vh] overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
      <!-- Top Action Bar (no-print) -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 shrink-0 print:hidden">
        <div class="flex items-center gap-2">
          <mat-icon svgIcon="file-text" class="icon-size-4 text-blue-600"></mat-icon>
          <span class="font-bold text-sm">
            Comprobante de Recepción de Compra / Gasto
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button
            (click)="printReceipt()"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors cursor-pointer"
          >
            <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
            Imprimir
          </button>
          <button
            (click)="dialogRef.close()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
          >
            <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
          </button>
        </div>
      </div>

      <!-- Printable Purchase Document Area -->
      <div class="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-neutral-900 print:p-0">
        <!-- Header Info -->
        <div class="flex justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div>
            <span class="text-xs uppercase font-extrabold tracking-wider text-blue-600 dark:text-blue-400">
              Dolphin ERP • Registro de Compra
            </span>
            <h1 class="text-2xl font-black mt-1 text-neutral-900 dark:text-white">
              {{ data.purchase.numeroFactura }}
            </h1>
            @if (data.purchase.ncf) {
              <p class="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-300 mt-0.5">
                NCF Proveedor: {{ data.purchase.ncf }}
              </p>
            }
          </div>

          <div class="text-right">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
              [ngClass]="{
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400':
                  data.purchase.estado === 'PAGADA',
                'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400':
                  data.purchase.estado === 'REGISTRADA' ||
                  data.purchase.estado === 'PAGADA_PARCIAL',
                'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400':
                  data.purchase.estado === 'ANULADA'
              }"
            >
              {{ data.purchase.estado }}
            </span>
            <p class="text-xs text-neutral-500 mt-2">
              Fecha: {{ data.purchase.fecha | date: 'dd/MM/yyyy' }}
            </p>
            @if (data.purchase.fechaVencimiento) {
              <p class="text-xs text-neutral-500">
                Vence: {{ data.purchase.fechaVencimiento | date: 'dd/MM/yyyy' }}
              </p>
            }
          </div>
        </div>

        <!-- Proveedor, Almacén y Condiciones -->
        <div class="grid grid-cols-2 gap-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs">
          <div>
            <span class="font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Proveedor
            </span>
            <p class="font-bold text-sm text-neutral-900 dark:text-white">
              {{ data.purchase.proveedor ? data.purchase.proveedor.nombreRazonSocial : 'Proveedor General' }}
            </p>
            <p class="text-neutral-500 mt-0.5">
              RNC / Cédula: {{ data.purchase.proveedor ? data.purchase.proveedor.numeroDocumento : 'N/D' }}
            </p>
            @if (data.purchase.proveedor && data.purchase.proveedor.telefono) {
              <p class="text-neutral-500">Tel: {{ data.purchase.proveedor.telefono }}</p>
            }
            @if (data.purchase.proveedor && data.purchase.proveedor.direccion) {
              <p class="text-neutral-500">{{ data.purchase.proveedor.direccion }}</p>
            }
          </div>

          <div>
            <span class="font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Datos de Recepción
            </span>
            <p class="text-neutral-700 dark:text-neutral-300">
              <span class="font-semibold">Almacén Destino:</span>
              {{ data.purchase.almacen ? data.purchase.almacen.nombre : 'Almacén Principal' }}
            </p>
            <p class="text-neutral-700 dark:text-neutral-300 mt-0.5">
              <span class="font-semibold">Condición de Pago:</span>
              {{ data.purchase.tipoPago }} ({{ data.purchase.metodoPago }})
            </p>
            @if (data.purchase.tipoGasto) {
              <p class="text-neutral-700 dark:text-neutral-300 mt-0.5">
                <span class="font-semibold">Tipo de Gasto DGII:</span>
                Tipo {{ data.purchase.tipoGasto }}
              </p>
            }
          </div>
        </div>

        <!-- Tabla de Detalles -->
        <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
          <table class="w-full text-left text-xs">
            <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 font-bold border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th class="py-3 px-4">Descripción</th>
                <th class="py-3 px-3 text-center">Cant.</th>
                <th class="py-3 px-3 text-right">Costo Unit.</th>
                <th class="py-3 px-3 text-right">% ITBIS</th>
                <th class="py-3 px-3 text-right">Descuento</th>
                <th class="py-3 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
              @for (det of data.purchase.detalles; track det.id) {
                <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                  <td class="py-3 px-4 font-medium text-neutral-900 dark:text-white">
                    {{ det.descripcion }}
                    @if (det.afectaInventario) {
                      <span class="block text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                        ✓ Ingresó a Inventario
                      </span>
                    }
                  </td>
                  <td class="py-3 px-3 text-center">{{ det.cantidad | number: '1.0-2' }}</td>
                  <td class="py-3 px-3 text-right">RD$ {{ det.costoUnitario | number: '1.2-2' }}</td>
                  <td class="py-3 px-3 text-right">{{ det.tasaItbis }}%</td>
                  <td class="py-3 px-3 text-right text-red-600 dark:text-red-400">
                    {{ det.descuento > 0 ? ('- RD$ ' + (det.descuento | number: '1.2-2')) : '-' }}
                  </td>
                  <td class="py-3 px-4 text-right font-bold text-neutral-900 dark:text-white">
                    RD$ {{ det.total | number: '1.2-2' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Resumen de Totales -->
        <div class="flex justify-end pt-2">
          <div class="w-72 space-y-2 text-xs">
            <div class="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>Subtotal:</span>
              <span class="font-bold text-neutral-900 dark:text-white">
                RD$ {{ data.purchase.subtotal | number: '1.2-2' }}
              </span>
            </div>
            @if (data.purchase.descuento > 0) {
              <div class="flex justify-between text-red-600 dark:text-red-400">
                <span>Descuento:</span>
                <span class="font-bold">- RD$ {{ data.purchase.descuento | number: '1.2-2' }}</span>
              </div>
            }
            <div class="flex justify-between text-neutral-600 dark:text-neutral-400">
              <span>ITBIS:</span>
              <span class="font-bold text-neutral-900 dark:text-white">
                RD$ {{ data.purchase.itbis | number: '1.2-2' }}
              </span>
            </div>
            @if (data.purchase.itbisRetenido > 0) {
              <div class="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Retención ITBIS:</span>
                <span class="font-bold">- RD$ {{ data.purchase.itbisRetenido | number: '1.2-2' }}</span>
              </div>
            }
            @if (data.purchase.retencionRenta > 0) {
              <div class="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Retención ISR:</span>
                <span class="font-bold">- RD$ {{ data.purchase.retencionRenta | number: '1.2-2' }}</span>
              </div>
            }
            <div class="pt-2 border-t border-neutral-300 dark:border-neutral-700 flex justify-between text-sm font-black">
              <span>Total Factura:</span>
              <span class="text-blue-600 dark:text-blue-400">
                RD$ {{ data.purchase.total | number: '1.2-2' }}
              </span>
            </div>
            <div class="flex justify-between text-emerald-600 dark:text-emerald-400 pt-1">
              <span>Monto Pagado:</span>
              <span class="font-bold">RD$ {{ data.purchase.montoPagado | number: '1.2-2' }}</span>
            </div>
            <div class="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
              <span>Balance Pendiente:</span>
              <span>RD$ {{ data.purchase.balancePendiente | number: '1.2-2' }}</span>
            </div>
          </div>
        </div>

        @if (data.purchase.notas) {
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
            <span class="font-bold block mb-0.5">Observaciones:</span>
            {{ data.purchase.notas }}
          </div>
        }
      </div>
    </div>
  `,
})
export class PurchasePreviewComponent {
  dialogRef = inject(MatDialogRef<PurchasePreviewComponent>);
  data = inject<PurchasePreviewData>(MAT_DIALOG_DATA);

  printReceipt() {
    window.print();
  }
}
