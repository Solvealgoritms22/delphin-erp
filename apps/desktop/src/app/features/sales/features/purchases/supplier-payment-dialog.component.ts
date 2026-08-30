import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
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
import { TranslocoPipe } from '@jsverse/transloco';
import { FacturaCompra, CreateSupplierPaymentDto } from '../../data/purchases.service';

export type SupplierPaymentDialogData = {
  purchase: FacturaCompra;
}

@Component({
  selector: 'app-supplier-payment-dialog',
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
    DecimalPipe,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col w-full min-w-0 overflow-hidden bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div>
          <h2 class="text-xl font-bold tracking-tight">
            {{ 'commercial.purchases.payment.title' | transloco }}
          </h2>
          <p class="text-xs text-neutral-500 mt-0.5">
            {{ data.purchase.numeroFactura }} • {{ data.purchase.proveedor?.nombreRazonSocial }}
          </p>
        </div>
        <button
          (click)="dialogRef.close()"
          class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
        >
          <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-5">
        <!-- Balance Info Card -->
        <div class="grid grid-cols-3 gap-3 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 text-center">
          <div>
            <span class="text-[11px] font-semibold text-neutral-500 uppercase">Total Factura</span>
            <p class="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
              RD$ {{ data.purchase.total | number: '1.2-2' }}
            </p>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-neutral-500 uppercase">Abonado</span>
            <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              RD$ {{ data.purchase.montoPagado | number: '1.2-2' }}
            </p>
          </div>
          <div>
            <span class="text-[11px] font-semibold text-neutral-500 uppercase">Pendiente</span>
            <p class="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              RD$ {{ data.purchase.balancePendiente | number: '1.2-2' }}
            </p>
          </div>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4">
          <!-- Monto a Pagar -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.payment.amount' | transloco }} *</mat-label>
              <input
                matInput
                type="number"
                min="0.01"
                [max]="data.purchase.balancePendiente"
                step="0.01"
                [(ngModel)]="paymentData.monto"
              />
            </mat-form-field>
            <div class="flex justify-between items-center px-1 -mt-1 text-[11px] text-neutral-500">
              <span>Máximo a abonar: RD$ {{ data.purchase.balancePendiente | number: '1.2-2' }}</span>
              <button
                type="button"
                (click)="paymentData.monto = data.purchase.balancePendiente"
                class="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
              >
                Pagar Totalidad
              </button>
            </div>
          </div>

          <!-- Método de Pago -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.payment.method' | transloco }} *</mat-label>
              <mat-select [(ngModel)]="paymentData.metodo" [placeholder]="'common.select' | transloco">
                <mat-option value="TRANSFERENCIA">Transferencia Bancaria</mat-option>
                <mat-option value="CHEQUE">Cheque Comercial</mat-option>
                <mat-option value="EFECTIVO">Efectivo en Caja</mat-option>
                <mat-option value="TARJETA">Tarjeta Corporativa</mat-option>
                <mat-option value="OTRO">Otro</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Referencia / No. Comprobante -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.payment.reference' | transloco }}</mat-label>
              <input
                matInput
                [(ngModel)]="paymentData.referencia"
                placeholder="Transferencia #984210 o Cheque #4421"
              />
            </mat-form-field>
          </div>

          <!-- Fecha de Pago -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>{{ 'commercial.purchases.payment.date' | transloco }}</mat-label>
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

          <!-- Notas -->
          <div>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Notas u Observaciones</mat-label>
              <textarea
                matInput
                [(ngModel)]="paymentData.notas"
                rows="2"
                placeholder="Detalle o justificación del pago..."
              ></textarea>
            </mat-form-field>
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
          {{ isSubmitting() ? 'Registrando...' : ('commercial.purchases.payment.submit' | transloco) }}
        </button>
      </div>
    </div>
  `,
})
export class SupplierPaymentDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<SupplierPaymentDialogComponent>);
  data = inject<SupplierPaymentDialogData>(MAT_DIALOG_DATA);

  isSubmitting = signal(false);
  fechaPago: Date = new Date();

  paymentData: Partial<CreateSupplierPaymentDto> = {
    monto: 0,
    metodo: 'TRANSFERENCIA',
    referencia: '',
    notas: '',
  };

  ngOnInit() {
    this.paymentData.monto = this.data.purchase.balancePendiente;
  }

  isValid(): boolean {
    const monto = Number(this.paymentData.monto);
    if (!monto || monto <= 0) return false;
    if (monto > this.data.purchase.balancePendiente) return false;
    if (!this.paymentData.metodo) return false;
    return true;
  }

  submit() {
    if (!this.isValid()) return;

    this.isSubmitting.set(true);

    const payload: CreateSupplierPaymentDto = {
      monto: Number(this.paymentData.monto),
      metodo: this.paymentData.metodo as any,
      referencia: this.paymentData.referencia?.trim() || undefined,
      fechaPago: this.fechaPago instanceof Date ? this.fechaPago.toISOString() : new Date(this.fechaPago).toISOString(),
      notas: this.paymentData.notas?.trim() || undefined,
    };

    this.dialogRef.close(payload);
  }
}
