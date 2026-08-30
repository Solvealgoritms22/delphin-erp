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

export interface PosCheckoutData {
  items: CartItem[];
  client: Client | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  note: string;
}

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
    <div class="flex flex-col p-6 min-w-[360px] sm:min-w-[520px] max-w-lg max-h-[90vh] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl overflow-hidden">
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
                RD$ {{ data.total | number:'1.2-2' }}
              </div>
            </div>
            <div class="text-right text-xs text-neutral-500 dark:text-neutral-400 space-y-0.5">
              <div>Subtotal: <span class="font-mono font-medium text-neutral-700 dark:text-neutral-300">RD$ {{ data.subtotal | number:'1.2-2' }}</span></div>
              @if (data.discount > 0) {
                <div class="text-rose-600 dark:text-rose-400">Desc: <span class="font-mono font-medium">- RD$ {{ data.discount | number:'1.2-2' }}</span></div>
              }
              <div>ITBIS (18%): <span class="font-mono font-medium text-neutral-700 dark:text-neutral-300">RD$ {{ data.tax | number:'1.2-2' }}</span></div>
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
                  (click)="selectedMethod = method.value"
                  class="py-2 px-2 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
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

          <!-- Sección de Efectivo: Monto recibido y cambio -->
          @if (selectedMethod === 'EFECTIVO' || selectedMethod === 'MIXTO') {
            <div class="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700/70 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-3">
              
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <!-- Input Monto -->
                <div class="flex-1">
                  <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">
                    {{ 'pos.cashReceived' | transloco }}
                  </label>
                  <div class="relative">
                    <span class="absolute left-3 top-2 text-xs font-bold text-neutral-400">RD$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      [(ngModel)]="cashReceived"
                      (ngModelChange)="onCashInput()"
                      placeholder="0.00"
                      class="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 py-1.5 pr-3 pl-10 text-base font-bold font-mono text-neutral-900 dark:text-white outline-none focus:border-primary-500"
                      cdkFocusInitial
                    />
                  </div>
                </div>

                <!-- Display Cambio / Devuelta -->
                <div class="sm:w-44 p-2.5 rounded-lg border text-center"
                  [ngClass]="changeAmount >= 0 ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'"
                >
                  <span class="text-[10px] font-semibold uppercase tracking-wider block">
                    {{ changeAmount >= 0 ? ('pos.change' | transloco) : ('pos.missing' | transloco) }}
                  </span>
                  <span class="text-base font-bold font-mono">
                    RD$ {{ Math.abs(changeAmount) | number:'1.2-2' }}
                  </span>
                </div>
              </div>

              <!-- Atajos de Billetes Dominicanos -->
              <div class="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  type="button"
                  (click)="setCash(data.total)"
                  class="px-2.5 py-1 rounded-md text-xs font-bold bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-primary-600 dark:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  {{ 'pos.exact' | transloco }}
                </button>
                @for (preset of cashPresets; track preset) {
                  <button
                    type="button"
                    (click)="setCash(preset)"
                    class="px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  >
                    RD$ {{ preset }}
                  </button>
                }
              </div>
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
            [disabled]="processing() || (selectedMethod === 'EFECTIVO' && cashReceived < data.total)"
            class="!rounded-xl !px-6 !py-2.5 !text-xs !font-bold"
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
          </div>

          <!-- Resumen Devuelta -->
          @if (cashReceived > data.total) {
            <div class="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 w-full max-w-xs">
              <div class="text-[10px] uppercase font-bold tracking-wider">Entregar Cambio:</div>
              <div class="text-xl font-bold font-mono mt-0.5">
                RD$ {{ changeAmount | number:'1.2-2' }}
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
  private readonly posService = inject(PosService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  readonly Math = Math;
  readonly processing = signal(false);
  readonly createdInvoice = signal<FacturaVenta | null>(null);

  selectedMethod = 'EFECTIVO';
  selectedNcfType = 'E32';
  cashReceived: number = this.data.total;

  readonly cashPresets = [50, 100, 200, 500, 1000, 2000];

  readonly paymentMethods = [
    { value: 'EFECTIVO', labelKey: 'pos.cash', icon: 'banknote' },
    { value: 'TARJETA', labelKey: 'pos.card', icon: 'credit-card' },
    { value: 'TRANSFERENCIA', labelKey: 'pos.transfer', icon: 'send' },
    { value: 'MIXTO', labelKey: 'pos.split', icon: 'wallet' },
  ];

  get changeAmount(): number {
    const rec = Number(this.cashReceived) || 0;
    return Number((rec - this.data.total).toFixed(2));
  }

  setCash(amount: number): void {
    this.cashReceived = amount;
  }

  onCashInput(): void {
    // reactive calculation via getter
  }

  processPayment(): void {
    this.processing.set(true);

    const payload: CreateInvoiceDto = {
      clienteId: this.data.client?.id,
      tipoNcf: this.selectedNcfType || undefined,
      tipoPago: 'CONTADO',
      metodoPago: this.selectedMethod,
      descuento: this.data.discount > 0 ? this.data.discount : undefined,
      notas: this.data.note || 'Venta Punto de Venta (POS)',
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
          this.cashReceived,
          this.changeAmount >= 0 ? this.changeAmount : 0
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
        this.cashReceived,
        this.changeAmount >= 0 ? this.changeAmount : 0
      );
    }
  }

  newSale(): void {
    this.dialogRef.close({ completed: true });
  }
}
