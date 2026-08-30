import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  CustomerPaymentsService,
  CreateCustomerPaymentDto,
  PendingInvoice,
  PaymentApplicationDto,
} from '../../data/customer-payments.service';
import { ClientsService, Client } from '../../data/clients';

export interface PaymentReceiptDialogData {
  clienteId?: string;
  facturaId?: string;
}

interface InvoiceSelectionRow {
  invoice: PendingInvoice;
  selected: boolean;
  montoAplicar: number;
}

@Component({
  selector: 'app-payment-receipt-dialog',
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
    MatDatepickerModule,
    MatCheckboxModule,
    MatTooltipModule,
    DecimalPipe,
    DatePipe,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full min-w-0 max-h-[90vh] overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div>
          <h2 class="text-xl font-bold tracking-tight">
            {{ 'commercial.receivables.dialog.title' | transloco }}
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">
            {{ 'commercial.receivables.dialog.subtitle' | transloco }}
          </p>
        </div>
        <button
          (click)="dialogRef.close()"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
        >
          <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
        </button>
      </div>

      <!-- Body Form -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6">
        <!-- Seleccionar Cliente y Condiciones -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
          <!-- Cliente -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.receivables.dialog.client' | transloco }} *</mat-label>
              <mat-select
                [(ngModel)]="selectedClienteId"
                (ngModelChange)="onClientChange($event)"
                [placeholder]="'common.select' | transloco"
              >
                @for (c of clients(); track c.id) {
                  <mat-option [value]="c.id">
                    {{ c.nombreRazonSocial }} ({{ c.numeroDocumento }})
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Método de Pago -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.receivables.dialog.method' | transloco }} *</mat-label>
              <mat-select [(ngModel)]="paymentData.metodo" [placeholder]="'common.select' | transloco">
                <mat-option value="EFECTIVO">Efectivo en Caja</mat-option>
                <mat-option value="TRANSFERENCIA">Transferencia Bancaria</mat-option>
                <mat-option value="CHEQUE">Cheque Comercial</mat-option>
                <mat-option value="TARJETA">Tarjeta de Débito / Crédito</mat-option>
                <mat-option value="DEPOSITO">Depósito Bancario</mat-option>
                <mat-option value="OTRO">Otro</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Referencia Bancaria / No. Cheque -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.receivables.dialog.reference' | transloco }}</mat-label>
              <input
                matInput
                [(ngModel)]="paymentData.referencia"
                placeholder="Transferencia #89421 o Cheque #5512"
              />
            </mat-form-field>
          </div>

          <!-- Fecha de Cobro -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.receivables.dialog.date' | transloco }}</mat-label>
              <input
                matInput
                [matDatepicker]="pickerPago"
                [(ngModel)]="fechaPago"
                placeholder="dd/mm/aaaa"
              />
              <mat-datepicker-toggle matIconSuffix [for]="pickerPago"></mat-datepicker-toggle>
              <mat-datepicker #pickerPago></mat-datepicker>
            </mat-form-field>
          </div>
        </div>

        <!-- Facturas Pendientes del Cliente -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-bold text-neutral-800 dark:text-neutral-200">
              {{ 'commercial.receivables.dialog.pendingInvoices' | transloco }}
            </h3>
            @if (invoiceRows().length > 0) {
              <button
                type="button"
                (click)="selectAllInvoices()"
                class="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Saldar Todas las Facturas
              </button>
            }
          </div>

          @if (!selectedClienteId) {
            <div class="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-neutral-400">
              Selecciona un cliente arriba para ver sus facturas con saldo pendiente por cobrar.
            </div>
          } @else if (loadingInvoices()) {
            <div class="p-8 text-center text-xs text-neutral-400">
              Cargando facturas pendientes...
            </div>
          } @else if (invoiceRows().length === 0) {
            <div class="p-8 text-center rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Este cliente no tiene facturas con saldo adeudado.
            </div>
          } @else {
            <div class="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
              <table class="w-full text-left text-xs">
                <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 font-bold border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th class="py-3 px-3 w-10 text-center">
                      <mat-checkbox
                        [checked]="isAllSelected()"
                        (change)="toggleSelectAll($event.checked)"
                      ></mat-checkbox>
                    </th>
                    <th class="py-3 px-3">No. Factura / NCF</th>
                    <th class="py-3 px-3">Vencimiento</th>
                    <th class="py-3 px-3 text-right">Total Factura</th>
                    <th class="py-3 px-3 text-right">Balance Adeudado</th>
                    <th class="py-3 px-4 text-right w-36">Monto a Cobrar (RD$)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-neutral-200 dark:divide-neutral-800">
                  @for (row of invoiceRows(); track row.invoice.id) {
                    <tr
                      class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20"
                      [class.bg-blue-50/30]="row.selected"
                      [class.dark:bg-blue-950/10]="row.selected"
                    >
                      <td class="py-3 px-3 text-center">
                        <mat-checkbox
                          [(ngModel)]="row.selected"
                          (ngModelChange)="onRowSelectionChange(row)"
                        ></mat-checkbox>
                      </td>
                      <td class="py-3 px-3">
                        <div class="font-bold text-neutral-900 dark:text-white">
                          {{ row.invoice.numeroFactura }}
                        </div>
                        @if (row.invoice.ncf) {
                          <div class="font-mono text-[11px] text-neutral-500">
                            {{ row.invoice.ncf }}
                          </div>
                        }
                      </td>
                      <td class="py-3 px-3">
                        <div class="text-neutral-700 dark:text-neutral-300">
                          {{ row.invoice.fechaVencimiento | date: 'dd/MM/yyyy' }}
                        </div>
                        @if (row.invoice.enMora) {
                          <span class="inline-flex items-center text-[10px] font-bold text-rose-600 dark:text-rose-400">
                            Vencida hace {{ row.invoice.diasVencido }} días
                          </span>
                        }
                      </td>
                      <td class="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">
                        RD$ {{ row.invoice.total | number: '1.2-2' }}
                      </td>
                      <td class="py-3 px-3 text-right font-bold text-amber-600 dark:text-amber-400">
                        RD$ {{ row.invoice.balancePendiente | number: '1.2-2' }}
                      </td>
                      <td class="py-3 px-4 text-right">
                        <input
                          type="number"
                          min="0.01"
                          [max]="row.invoice.balancePendiente"
                          step="0.01"
                          [(ngModel)]="row.montoAplicar"
                          (ngModelChange)="onAmountChange(row)"
                          [disabled]="!row.selected"
                          class="w-full text-right font-bold text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg py-1.5 px-2.5 outline-none focus:border-blue-500 disabled:opacity-40 disabled:bg-neutral-100 dark:disabled:bg-neutral-900"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        <!-- Resumen de Cobro y Notas -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <!-- Notas -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Notas u Observaciones del Recibo</mat-label>
              <textarea
                matInput
                [(ngModel)]="paymentData.notas"
                rows="3"
                placeholder="Observaciones sobre la transacción..."
              ></textarea>
            </mat-form-field>
          </div>

          <!-- Total a Cobrar -->
          <div class="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-500/20 flex flex-col justify-between">
            <div class="flex justify-between items-center text-xs text-neutral-600 dark:text-neutral-300">
              <span class="font-semibold">Facturas seleccionadas:</span>
              <span class="font-bold">{{ selectedCount() }}</span>
            </div>
            <div class="mt-4 flex justify-between items-baseline border-t border-emerald-200/60 dark:border-emerald-700/40 pt-3">
              <span class="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                TOTAL A COBRAR:
              </span>
              <span class="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                RD$ {{ totalToCollect() | number: '1.2-2' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
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
          class="px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-all cursor-pointer shadow-sm"
        >
          {{ isSubmitting() ? 'Registrando...' : ('commercial.receivables.dialog.submit' | transloco) }}
        </button>
      </div>
    </div>
  `,
})
export class PaymentReceiptDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PaymentReceiptDialogComponent>);
  data = inject<PaymentReceiptDialogData>(MAT_DIALOG_DATA, { optional: true });
  paymentsService = inject(CustomerPaymentsService);
  clientsService = inject(ClientsService);

  clients = this.clientsService.clients;
  selectedClienteId?: string;
  loadingInvoices = signal(false);
  invoiceRows = signal<InvoiceSelectionRow[]>([]);
  isSubmitting = signal(false);

  fechaPago: Date = new Date();
  paymentData: Partial<CreateCustomerPaymentDto> = {
    metodo: 'TRANSFERENCIA',
    referencia: '',
    notas: '',
  };

  selectedCount = computed(() => {
    return this.invoiceRows().filter((r) => r.selected && r.montoAplicar > 0).length;
  });

  totalToCollect = computed(() => {
    return this.invoiceRows()
      .filter((r) => r.selected)
      .reduce((acc, r) => acc + (Number(r.montoAplicar) || 0), 0);
  });

  ngOnInit() {
    this.clientsService.findAll().subscribe(() => {
      if (this.data?.clienteId) {
        this.selectedClienteId = this.data.clienteId;
        this.loadPendingInvoices(this.data.clienteId, this.data.facturaId);
      }
    });
  }

  onClientChange(clienteId: string) {
    this.loadPendingInvoices(clienteId);
  }

  loadPendingInvoices(clienteId: string, preselectFacturaId?: string) {
    if (!clienteId) {
      this.invoiceRows.set([]);
      return;
    }

    this.loadingInvoices.set(true);
    this.paymentsService.getPendingInvoices(clienteId).subscribe({
      next: (invoices) => {
        const rows: InvoiceSelectionRow[] = invoices.map((inv) => {
          const isTarget = preselectFacturaId ? inv.id === preselectFacturaId : false;
          return {
            invoice: inv,
            selected: isTarget,
            montoAplicar: inv.balancePendiente,
          };
        });
        this.invoiceRows.set(rows);
        this.loadingInvoices.set(false);
      },
      error: () => {
        this.invoiceRows.set([]);
        this.loadingInvoices.set(false);
      },
    });
  }

  isAllSelected(): boolean {
    const rows = this.invoiceRows();
    return rows.length > 0 && rows.every((r) => r.selected);
  }

  toggleSelectAll(checked: boolean) {
    this.invoiceRows.update((rows) =>
      rows.map((r) => ({
        ...r,
        selected: checked,
        montoAplicar: checked ? r.invoice.balancePendiente : r.montoAplicar,
      })),
    );
  }

  selectAllInvoices() {
    this.toggleSelectAll(true);
  }

  onRowSelectionChange(row: InvoiceSelectionRow) {
    if (row.selected && (!row.montoAplicar || row.montoAplicar <= 0)) {
      row.montoAplicar = row.invoice.balancePendiente;
    }
  }

  onAmountChange(row: InvoiceSelectionRow) {
    if (row.montoAplicar > row.invoice.balancePendiente) {
      row.montoAplicar = row.invoice.balancePendiente;
    }
    if (row.montoAplicar < 0) {
      row.montoAplicar = 0;
    }
  }

  isValid(): boolean {
    if (!this.selectedClienteId) return false;
    if (!this.paymentData.metodo) return false;
    const selected = this.invoiceRows().filter((r) => r.selected && r.montoAplicar > 0);
    if (selected.length === 0) return false;
    return this.totalToCollect() > 0;
  }

  submit() {
    if (!this.isValid()) return;

    this.isSubmitting.set(true);

    const apps: PaymentApplicationDto[] = this.invoiceRows()
      .filter((r) => r.selected && r.montoAplicar > 0)
      .map((r) => ({
        facturaId: r.invoice.id,
        monto: Number(r.montoAplicar),
      }));

    const payload: CreateCustomerPaymentDto = {
      clienteId: this.selectedClienteId!,
      monto: this.totalToCollect(),
      aplicaciones: apps,
      metodo: this.paymentData.metodo,
      referencia: this.paymentData.referencia?.trim() || undefined,
      fechaPago: this.fechaPago instanceof Date ? this.fechaPago.toISOString() : new Date(this.fechaPago).toISOString(),
      notas: this.paymentData.notas?.trim() || undefined,
    };

    this.dialogRef.close(payload);
  }
}
