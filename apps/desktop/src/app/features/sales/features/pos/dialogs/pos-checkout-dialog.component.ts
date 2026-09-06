import { Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CreateInvoiceDto, FacturaVenta, InvoicesService } from '@features/sales/data/invoices.service';
import { Client } from '@features/sales/data/clients';
import { CartItem, PosService } from '../data/pos.service';
import { PosReceiptService } from '../data/pos-receipt.service';

export type PosCheckoutData = {
  items: CartItem[];
  client: Client | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string;
};

@Component({
  selector: 'app-pos-checkout-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col p-6 min-w-[360px] sm:min-w-[540px] max-w-lg max-h-[92vh] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl overflow-hidden">
      @if (!createdInvoice()) {
        <!-- Header Limpio -->
        <div class="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
          <div>
            <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ 'pos.checkoutTitle' | transloco }}</h2>
            <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {{ data.items.length }} {{ 'pos.items' | transloco }} · {{ data.client?.nombreRazonSocial || 'Cliente General' }}
            </p>
          </div>
          <button mat-icon-button (click)="dialogRef.close()" class="!w-8 !h-8 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
            <mat-icon svgIcon="circle-x" class="!w-4 !h-4"></mat-icon>
          </button>
        </div>

        <!-- Scrollable Body -->
        <div class="py-4 overflow-y-auto flex-auto min-h-0 space-y-4">
          
          <!-- Resumen de Monto a Pagar -->
          <div class="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between">
            <div>
              <span class="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{{ 'pos.totalToPay' | transloco }}</span>
              <div class="text-2xl font-bold font-mono text-neutral-900 dark:text-white">
                {{ currencySymbol() }} {{ data.total | number:'1.2-2' }}
              </div>
            </div>
            <div class="text-right text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
              <div>Subtotal: <span class="font-mono font-medium text-neutral-700 dark:text-neutral-300">{{ currencySymbol() }} {{ data.subtotal | number:'1.2-2' }}</span></div>
              @if (data.discount > 0) {
                <div class="text-rose-600 dark:text-rose-400">Desc: <span class="font-mono font-medium">- {{ currencySymbol() }} {{ data.discount | number:'1.2-2' }}</span></div>
              }
              <div>{{ posService.taxLabel() }}: <span class="font-mono font-medium text-neutral-700 dark:text-neutral-300">{{ currencySymbol() }} {{ data.tax | number:'1.2-2' }}</span></div>
            </div>
          </div>

          <!-- Selector de Método de Pago en Segmented Control -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {{ 'pos.paymentMethod' | transloco }}
            </label>
            <div class="grid grid-cols-4 gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
              @for (method of paymentMethods; track method.value) {
                <button
                  type="button"
                  (click)="selectMethod(method.value)"
                  class="py-2 px-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer"
                  [ngClass]="selectedMethod === method.value
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'"
                >
                  <mat-icon [svgIcon]="method.icon" class="!w-3.5 !h-3.5"></mat-icon>
                  <span>{{ method.labelKey | transloco }}</span>
                </button>
              }
            </div>
          </div>

          <!-- 1. CASO EFECTIVO -->
          @if (selectedMethod === 'EFECTIVO') {
            <div class="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/70 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex-1">
                  <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    {{ 'pos.cashReceived' | transloco }}
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs font-bold text-neutral-400">{{ currencySymbol() }}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      [(ngModel)]="cashReceived"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1.5 pr-3 pl-10 text-base font-bold font-mono text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                      cdkFocusInitial
                    />
                  </div>
                </div>

                <!-- Display Cambio -->
                <div class="sm:w-44 p-2.5 rounded-lg border text-center"
                  [ngClass]="changeAmount >= 0 ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'"
                >
                  <span class="text-[10px] font-semibold uppercase tracking-wider block">
                    {{ changeAmount >= 0 ? ('pos.change' | transloco) : ('pos.missing' | transloco) }}
                  </span>
                  <span class="text-base font-bold font-mono">
                    {{ currencySymbol() }} {{ Math.abs(changeAmount) | number:'1.2-2' }}
                  </span>
                </div>
              </div>

              <!-- Atajos de Billetes Dominicanos -->
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  (click)="setCash(data.total)"
                  class="px-2.5 py-1 rounded-md text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary-600 dark:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                >
                  {{ 'pos.exact' | transloco }}
                </button>
                @for (preset of cashPresets; track preset) {
                  <button
                    type="button"
                    (click)="setCash(preset)"
                    class="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    {{ currencySymbol() }} {{ preset }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- 2. CASO TARJETA -->
          @if (selectedMethod === 'TARJETA') {
            <div class="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <mat-icon svgIcon="credit-card" class="!w-5 !h-5"></mat-icon>
                </div>
                <div>
                  <div class="text-xs font-bold text-neutral-900 dark:text-white">
                    {{ 'pos.cardPaymentNotice' | transloco }}
                  </div>
                  <div class="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    Monto total a procesar: <strong class="text-blue-600 dark:text-blue-400 font-bold">{{ currencySymbol() }} {{ data.total | number:'1.2-2' }}</strong>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  {{ 'pos.cardReference' | transloco }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="paymentReference"
                  [placeholder]="'pos.cardReference' | transloco"
                  class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1.5 px-3 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-primary-500 placeholder:text-neutral-400"
                />
              </div>
            </div>
          }

          <!-- 3. CASO TRANSFERENCIA -->
          @if (selectedMethod === 'TRANSFERENCIA') {
            <div class="p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 space-y-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <mat-icon svgIcon="send" class="!w-5 !h-5"></mat-icon>
                </div>
                <div>
                  <div class="text-xs font-bold text-neutral-900 dark:text-white">
                    {{ 'pos.transferPaymentNotice' | transloco }}
                  </div>
                  <div class="text-xs text-neutral-500 dark:text-neutral-400 font-mono mt-0.5">
                    Monto total a transferir: <strong class="text-purple-600 dark:text-purple-400 font-bold">{{ currencySymbol() }} {{ data.total | number:'1.2-2' }}</strong>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  {{ 'pos.transferReference' | transloco }}
                </label>
                <input
                  type="text"
                  [(ngModel)]="paymentReference"
                  [placeholder]="'pos.transferReference' | transloco"
                  class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1.5 px-3 text-xs font-medium text-neutral-900 dark:text-white outline-none focus:border-primary-500 placeholder:text-neutral-400"
                />
              </div>
            </div>
          }

          <!-- 4. CASO MIXTO (TARJETA + EFECTIVO) -->
          @if (selectedMethod === 'MIXTO') {
            <div class="p-3.5 sm:p-4 rounded-xl border border-neutral-200 dark:border-neutral-700/70 bg-neutral-50/60 dark:bg-neutral-800/30 space-y-3.5">
              
              <!-- Barra de Control Rápido -->
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <mat-icon svgIcon="wallet" class="!w-4 !h-4 text-primary-500"></mat-icon>
                  <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
                    {{ 'pos.splitSummary' | transloco }}
                  </span>
                </div>
                <button
                  type="button"
                  (click)="setSplitFiftyFifty()"
                  class="px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary-600 dark:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all cursor-pointer shadow-xs"
                >
                  {{ 'pos.splitFiftyPercent' | transloco }} ({{ currencySymbol() }} {{ (data.total / 2) | number:'1.2-2' }})
                </button>
              </div>

              <!-- Grid de Desglose: Tarjeta & Efectivo a Pagar -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <!-- Tarjeta -->
                <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <mat-icon svgIcon="credit-card" class="!w-3.5 !h-3.5 text-blue-500"></mat-icon>
                      {{ 'pos.splitCardAmount' | transloco }}
                    </label>
                  </div>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs font-bold text-neutral-400">{{ currencySymbol() }}</span>
                    <input
                      type="number"
                      min="0"
                      [max]="data.total"
                      step="any"
                      [(ngModel)]="splitCardAmount"
                      (ngModelChange)="onSplitCardChange()"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 py-1.5 pr-3 pl-10 text-base font-bold font-mono text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                    />
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="paymentReference"
                    [placeholder]="'pos.cardReference' | transloco"
                    class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1 text-[11px] text-neutral-700 dark:text-neutral-300 outline-none placeholder:text-neutral-400"
                  />
                </div>

                <!-- Efectivo a Pagar -->
                <div class="p-3 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5">
                      <mat-icon svgIcon="banknote" class="!w-3.5 !h-3.5 text-emerald-500"></mat-icon>
                      {{ 'pos.splitCashAmount' | transloco }}
                    </label>
                  </div>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs font-bold text-neutral-400">{{ currencySymbol() }}</span>
                    <input
                      type="number"
                      min="0"
                      [max]="data.total"
                      step="any"
                      [(ngModel)]="splitCashToPay"
                      (ngModelChange)="onSplitCashToPayChange()"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 py-1.5 pr-3 pl-10 text-base font-bold font-mono text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                    />
                  </div>
                  <p class="text-[11px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                    {{ 'pos.splitRemainingCash' | transloco }}
                  </p>
                </div>
              </div>

              <!-- Efectivo Recibido y Cambio -->
              <div class="p-3 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 space-y-2.5">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex-1">
                    <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                      {{ 'pos.splitCashReceived' | transloco }}
                    </label>
                    <div class="relative">
                      <span class="absolute left-3 top-2 text-xs font-bold text-neutral-400">{{ currencySymbol() }}</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        [(ngModel)]="splitCashReceived"
                        placeholder="0.00"
                        class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1.5 pr-3 pl-10 text-base font-bold font-mono text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <!-- Display Devuelta -->
                  <div class="sm:w-44 p-2 rounded-lg border text-center"
                    [ngClass]="changeAmount >= 0 ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'"
                  >
                    <span class="text-[10px] font-semibold uppercase tracking-wider block">
                      {{ changeAmount >= 0 ? ('pos.change' | transloco) : ('pos.missing' | transloco) }}
                    </span>
                    <span class="text-base font-bold font-mono">
                      {{ currencySymbol() }} {{ Math.abs(changeAmount) | number:'1.2-2' }}
                    </span>
                  </div>
                </div>

                <!-- Atajos para la parte en efectivo -->
                <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <button
                    type="button"
                    (click)="setSplitCashExact()"
                    class="px-2.5 py-1 rounded-md text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary-600 dark:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    {{ 'pos.exact' | transloco }} ({{ currencySymbol() }} {{ splitCashToPay | number:'1.2-2' }})
                  </button>
                  @for (preset of cashPresets; track preset) {
                    <button
                      type="button"
                      (click)="setSplitCash(preset)"
                      class="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer"
                    >
                      {{ currencySymbol() }} {{ preset }}
                    </button>
                  }
                </div>
              </div>

              <!-- Alerta si las partes no cuadran -->
              @if (!isSplitSumMatching) {
                <div class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <mat-icon svgIcon="circle-alert" class="!w-4 !h-4 shrink-0"></mat-icon>
                  <span>{{ 'pos.splitTotalMismatch' | transloco }}</span>
                </div>
              }
            </div>
          }

          <!-- Selector de Comprobante Fiscal DGII -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              {{ 'pos.ncfType' | transloco }}
            </label>
            <select
              [(ngModel)]="selectedNcfType"
              class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 py-2 px-3 text-xs sm:text-sm font-medium text-neutral-900 dark:text-white outline-none focus:border-primary-500 transition-all cursor-pointer"
            >
              <option value="E32">e-NCF Consumo (E32)</option>
              <option value="B02">NCF Consumo (B02)</option>
              <option value="E31">e-NCF Crédito Fiscal (E31)</option>
              <option value="B01">NCF Crédito Fiscal (B01)</option>
              <option value="">Sin Comprobante Fiscal</option>
            </select>
            @if (selectedNcfType === 'E31' || selectedNcfType === 'B01') {
              <p class="text-[11px] text-amber-600 dark:text-amber-400 pt-0.5">
                Requiere cliente con RNC registrado para emitir comprobante de Crédito Fiscal.
              </p>
            }
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-800 shrink-0">
          <button mat-button (click)="dialogRef.close()" [disabled]="processing()" class="!rounded-lg !text-xs !text-neutral-400 hover:!text-neutral-700 dark:hover:!text-neutral-200 !px-3">
            {{ 'common.cancel' | transloco }}
          </button>

          <button
            mat-flat-button
            color="primary"
            (click)="processPayment()"
            [disabled]="!isPaymentValid"
            class="!rounded-xl !px-6 !py-2.5 !text-xs !font-bold cursor-pointer"
          >
            <mat-icon [svgIcon]="processing() ? 'refresh-cw' : 'check-circle'" class="!w-4 !h-4 mr-1.5" [class.animate-spin]="processing()"></mat-icon>
            <span>{{ (processing() ? 'pos.processing' : 'pos.confirmAndPay') | transloco }}</span>
          </button>
        </div>
      } @else {
        <!-- Success Screen con Check Normal -->
        <div class="py-8 flex flex-col items-center justify-center text-center space-y-4">
          <mat-icon svgIcon="check" class="!w-12 !h-12 text-emerald-500"></mat-icon>

          <div>
            <h2 class="text-xl font-bold text-neutral-900 dark:text-white">
              {{ 'pos.saleSuccess' | transloco }}
            </h2>
            <p class="text-xs text-neutral-500 mt-1 font-mono">
              Factura: <strong class="text-neutral-900 dark:text-white">{{ createdInvoice()?.numeroFactura }}</strong>
              @if (createdInvoice()?.ncf) {
                <span> · NCF: <strong class="text-primary-600 dark:text-primary-400">{{ createdInvoice()?.ncf }}</strong></span>
              }
            </p>
            @if (selectedMethod === 'MIXTO') {
              <div class="mt-2 text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                Pago Mixto: Tarjeta <strong class="font-mono">{{ currencySymbol() }} {{ splitCardAmount | number:'1.2-2' }}</strong> · Efectivo <strong class="font-mono">{{ currencySymbol() }} {{ splitCashToPay | number:'1.2-2' }}</strong>
              </div>
            }
          </div>

          <!-- Resumen Devuelta -->
          @if (changeAmount > 0 && (selectedMethod === 'EFECTIVO' || selectedMethod === 'MIXTO')) {
            <div class="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 w-full max-w-xs">
              <div class="text-[10px] uppercase font-bold tracking-wider">Entregar Cambio:</div>
              <div class="text-xl font-bold font-mono mt-0.5">
                {{ currencySymbol() }} {{ changeAmount | number:'1.2-2' }}
              </div>
            </div>
          }

          <!-- Acciones Post-Venta -->
          <div class="grid grid-cols-2 gap-2.5 w-full max-w-xs pt-2">
            <button
              mat-stroked-button
              (click)="printTicket()"
              class="!rounded-xl !py-2 !text-xs !font-bold"
            >
              <mat-icon svgIcon="printer" class="!w-3.5 !h-3.5 mr-1.5"></mat-icon>
              {{ 'pos.printTicket' | transloco }}
            </button>

            <button
              mat-flat-button
              color="primary"
              (click)="newSale()"
              class="!rounded-xl !py-2 !text-xs !font-bold"
            >
              <mat-icon svgIcon="plus" class="!w-3.5 !h-3.5 mr-1.5"></mat-icon>
              {{ 'pos.newSale' | transloco }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class PosCheckoutDialogComponent {
  readonly dialogRef = inject(MatDialogRef<PosCheckoutDialogComponent>);
  readonly data: PosCheckoutData = inject(MAT_DIALOG_DATA);
  private readonly invoicesService = inject(InvoicesService);
  private readonly receiptService = inject(PosReceiptService);
  readonly posService = inject(PosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  readonly Math = Math;
  readonly processing = signal(false);
  readonly createdInvoice = signal<FacturaVenta | null>(null);

  readonly currencySymbol = this.posService.currencySymbol;
  readonly currencyCode = this.posService.currencyCode;

  selectedMethod = 'EFECTIVO';
  selectedNcfType = 'E32';
  cashReceived: number = this.data.total;

  // Propiedades para Pago Mixto
  splitCardAmount: number = Number((this.data.total / 2).toFixed(2));
  splitCashToPay: number = Number((this.data.total - this.splitCardAmount).toFixed(2));
  splitCashReceived: number = this.splitCashToPay;
  paymentReference = '';

  readonly cashPresets = [50, 100, 200, 500, 1000, 2000];

  readonly paymentMethods = [
    { value: 'EFECTIVO', labelKey: 'pos.cash', icon: 'banknote' },
    { value: 'TARJETA', labelKey: 'pos.card', icon: 'credit-card' },
    { value: 'TRANSFERENCIA', labelKey: 'pos.transfer', icon: 'send' },
    { value: 'MIXTO', labelKey: 'pos.split', icon: 'wallet' },
  ];

  get isSplitSumMatching(): boolean {
    const sum = Number((this.splitCardAmount + this.splitCashToPay).toFixed(2));
    return Math.abs(sum - this.data.total) <= 0.01;
  }

  get changeAmount(): number {
    if (this.selectedMethod === 'MIXTO') {
      const rec = Number(this.splitCashReceived) || 0;
      const toPay = Number(this.splitCashToPay) || 0;
      return Number((rec - toPay).toFixed(2));
    }
    const rec = Number(this.cashReceived) || 0;
    return Number((rec - this.data.total).toFixed(2));
  }

  get isPaymentValid(): boolean {
    if (this.processing()) return false;

    if (this.selectedMethod === 'EFECTIVO') {
      return Number(this.cashReceived) >= this.data.total;
    }

    if (this.selectedMethod === 'MIXTO') {
      const card = Number(this.splitCardAmount) || 0;
      const cashToPay = Number(this.splitCashToPay) || 0;
      const cashRec = Number(this.splitCashReceived) || 0;

      if (card <= 0 || cashToPay <= 0) return false;
      if (!this.isSplitSumMatching) return false;
      if (cashRec < cashToPay) return false;

      return true;
    }

    return true; // TARJETA o TRANSFERENCIA
  }

  selectMethod(method: string): void {
    this.selectedMethod = method;
    if (method === 'MIXTO') {
      if (this.splitCardAmount <= 0 || !this.isSplitSumMatching) {
        this.setSplitFiftyFifty();
      }
    }
  }

  setCash(amount: number): void {
    this.cashReceived = amount;
  }

  setSplitFiftyFifty(): void {
    const half = Number((this.data.total / 2).toFixed(2));
    this.splitCardAmount = half;
    this.splitCashToPay = Number((this.data.total - half).toFixed(2));
    this.splitCashReceived = this.splitCashToPay;
  }

  onSplitCardChange(): void {
    const card = Math.min(this.data.total, Math.max(0, Number(this.splitCardAmount) || 0));
    this.splitCashToPay = Number((this.data.total - card).toFixed(2));
    if (this.splitCashReceived < this.splitCashToPay) {
      this.splitCashReceived = this.splitCashToPay;
    }
  }

  onSplitCashToPayChange(): void {
    const cash = Math.min(this.data.total, Math.max(0, Number(this.splitCashToPay) || 0));
    this.splitCardAmount = Number((this.data.total - cash).toFixed(2));
    if (this.splitCashReceived < this.splitCashToPay) {
      this.splitCashReceived = this.splitCashToPay;
    }
  }

  setSplitCashExact(): void {
    this.splitCashReceived = this.splitCashToPay;
  }

  setSplitCash(preset: number): void {
    this.splitCashReceived = preset;
  }

  processPayment(): void {
    if (!this.isPaymentValid) return;

    this.processing.set(true);

    let notasFinal = this.data.note || 'Venta Punto de Venta (POS)';
    if (this.selectedMethod === 'MIXTO') {
      const sym = this.currencySymbol();
      const cardPart = `Tarjeta ${sym} ${this.splitCardAmount.toFixed(2)}`;
      const cashPart = `Efectivo ${sym} ${this.splitCashToPay.toFixed(2)} (Recibido: ${sym} ${this.splitCashReceived.toFixed(2)}${this.changeAmount > 0 ? `, Cambio: ${sym} ${this.changeAmount.toFixed(2)}` : ''})`;
      const refPart = this.paymentReference?.trim() ? ` [Ref: ${this.paymentReference.trim()}]` : '';
      notasFinal = `${notasFinal} | Pago Mixto: ${cardPart} + ${cashPart}${refPart}`;
    } else if (this.paymentReference?.trim()) {
      notasFinal = `${notasFinal} | Ref: ${this.paymentReference.trim()}`;
    }

    const payload: CreateInvoiceDto = {
      clienteId: this.data.client?.id,
      tipoNcf: this.selectedNcfType || undefined,
      tipoPago: 'CONTADO',
      metodoPago: this.selectedMethod,
      moneda: this.currencyCode(),
      descuento: this.data.discount > 0 ? this.data.discount : undefined,
      notas: notasFinal,
      estado: 'EMITIDA',
      items: this.data.items.map((item) => ({
        productoId: item.id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioLista: item.precioLista,
        tasaItbis: item.tasaItbis,
        impuestoId: item.product.impuestoId || undefined,
        descuento: item.descuento || 0,
      })),
    };

    this.invoicesService.create(payload).subscribe({
      next: (invoice: FacturaVenta) => {
        this.createdInvoice.set(invoice);
        this.processing.set(false);

        // Auto print thermal ticket
        this.receiptService.printThermalTicket(
          invoice,
          this.selectedMethod === 'MIXTO' ? this.splitCashReceived : this.cashReceived,
          this.changeAmount >= 0 ? this.changeAmount : 0,
          this.selectedMethod === 'MIXTO'
            ? { cardAmount: this.splitCardAmount, cashAmount: this.splitCashToPay }
            : undefined
        );

        this.posService.clearCart();
      },
      error: (err: any) => {
        this.processing.set(false);
        const errorMsg = err?.error?.message || this.transloco.translate('pos.saleError');
        this.snackBar.open(errorMsg, this.transloco.translate('common.close'), {
          duration: 4500,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
    });
  }

  printTicket(): void {
    const inv = this.createdInvoice();
    if (inv) {
      this.receiptService.printThermalTicket(
        inv,
        this.selectedMethod === 'MIXTO' ? this.splitCashReceived : this.cashReceived,
        this.changeAmount >= 0 ? this.changeAmount : 0,
        this.selectedMethod === 'MIXTO'
          ? { cardAmount: this.splitCardAmount, cashAmount: this.splitCashToPay }
          : undefined
      );
    }
  }

  newSale(): void {
    this.dialogRef.close({ completed: true });
  }
}
