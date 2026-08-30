import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PagoCliente } from '../../data/customer-payments.service';

export type PaymentReceiptPreviewData = {
  payment: PagoCliente;
}

@Component({
  selector: 'app-payment-receipt-preview',
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
          <mat-icon svgIcon="file-text" class="icon-size-4 text-emerald-600"></mat-icon>
          <span class="font-bold text-sm">
            Recibo Oficial de Ingreso / Cobro
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

      <!-- Printable Document Body -->
      <div class="flex-1 overflow-y-auto p-8 space-y-6 bg-white dark:bg-neutral-900 print:p-0">
        <!-- Header Info -->
        <div class="flex justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-6">
          <div>
            <span class="text-xs uppercase font-extrabold tracking-wider text-emerald-600 dark:text-emerald-400">
              Dolphin ERP • Recibo de Caja / Ingreso
            </span>
            <h1 class="text-2xl font-black mt-1 text-neutral-900 dark:text-white">
              {{ data.payment.numeroRecibo || ('REC-' + data.payment.id.substring(0, 8)) }}
            </h1>
            <p class="text-xs text-neutral-500 mt-1">
              Fecha de Cobro: {{ data.payment.fechaPago | date: 'dd/MM/yyyy hh:mm a' }}
            </p>
          </div>

          <div class="text-right">
            <span
              class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border"
              [ngClass]="{
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-500/20':
                  data.payment.estado === 'REGISTRADO',
                'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-200/60 dark:border-rose-500/20':
                  data.payment.estado === 'ANULADO'
              }"
            >
              {{ data.payment.estado === 'REGISTRADO' ? 'Cobro Efectuado' : 'Cobro Anulado' }}
            </span>
            @if (data.payment.usuario; as user) {
              <p class="text-[11px] text-neutral-400 mt-2">
                Cobrado por: {{ user.nombre || user.email }}
              </p>
            }
          </div>
        </div>

        <!-- Cliente y Método de Pago -->
        <div class="grid grid-cols-2 gap-6 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 text-xs">
          <div>
            <span class="font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Recibido de (Cliente)
            </span>
            <p class="font-bold text-sm text-neutral-900 dark:text-white">
              {{ data.payment.cliente ? data.payment.cliente.nombreRazonSocial : 'Cliente General' }}
            </p>
            <p class="text-neutral-500 mt-0.5">
              RNC / Cédula: {{ data.payment.cliente ? data.payment.cliente.numeroDocumento : 'N/D' }}
            </p>
            @if (data.payment.cliente && data.payment.cliente.telefono) {
              <p class="text-neutral-500">Tel: {{ data.payment.cliente.telefono }}</p>
            }
          </div>

          <div>
            <span class="font-bold text-neutral-500 uppercase tracking-wider block mb-1">
              Detalle de Pago
            </span>
            <p class="text-neutral-700 dark:text-neutral-300">
              <span class="font-semibold">Forma de Pago:</span> {{ data.payment.metodo }}
            </p>
            @if (data.payment.referencia) {
              <p class="text-neutral-700 dark:text-neutral-300 mt-0.5">
                <span class="font-semibold">Referencia:</span> {{ data.payment.referencia }}
              </p>
            }
            <p class="text-neutral-700 dark:text-neutral-300 mt-0.5">
              <span class="font-semibold">Moneda:</span> {{ data.payment.moneda }}
            </p>
          </div>
        </div>

        <!-- Facturas Saldadas -->
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
            Facturas a las que se aplicó el cobro
          </h3>
          <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
            <table class="w-full text-left text-xs">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 font-bold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th class="py-3 px-4">No. Factura</th>
                  <th class="py-3 px-4">NCF</th>
                  <th class="py-3 px-3 text-right">Total Factura</th>
                  <th class="py-3 px-4 text-right">Monto Aplicado</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
                @for (app of data.payment.aplicaciones; track app.id) {
                  <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20">
                    <td class="py-3 px-4 font-bold text-neutral-900 dark:text-white">
                      {{ app.factura ? app.factura.numeroFactura : 'Factura' }}
                    </td>
                    <td class="py-3 px-4 font-mono text-neutral-600 dark:text-neutral-400">
                      {{ app.factura && app.factura.ncf ? app.factura.ncf : 'Sin NCF' }}
                    </td>
                    <td class="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                      RD$ {{ (app.factura ? app.factura.total : app.monto) | number: '1.2-2' }}
                    </td>
                    <td class="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                      RD$ {{ app.monto | number: '1.2-2' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Total Recibo -->
        <div class="flex justify-between items-center p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20">
          <span class="text-sm font-bold text-emerald-900 dark:text-emerald-300">
            TOTAL RECIBIDO:
          </span>
          <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            RD$ {{ data.payment.monto | number: '1.2-2' }}
          </span>
        </div>

        @if (data.payment.notas) {
          <div class="p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
            <span class="font-bold block mb-0.5">Observaciones:</span>
            {{ data.payment.notas }}
          </div>
        }

        <!-- Firmas -->
        <div class="grid grid-cols-2 gap-12 pt-8 text-center text-xs text-neutral-500 border-t border-neutral-200 dark:border-neutral-800">
          <div>
            <div class="border-b border-neutral-300 dark:border-neutral-700 pb-8 mb-2"></div>
            <p class="font-semibold text-neutral-700 dark:text-neutral-300">Firma de Quien Entrega (Cliente)</p>
          </div>
          <div>
            <div class="border-b border-neutral-300 dark:border-neutral-700 pb-8 mb-2"></div>
            <p class="font-semibold text-neutral-700 dark:text-neutral-300">Firma Autorizada (Cajero / Cobrador)</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PaymentReceiptPreviewComponent {
  dialogRef = inject(MatDialogRef<PaymentReceiptPreviewComponent>);
  data = inject<PaymentReceiptPreviewData>(MAT_DIALOG_DATA);

  printReceipt() {
    window.print();
  }
}
