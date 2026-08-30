import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';

export type PosDiscountData = {
  subtotal: number;
  currentValue: number;
  currentType: 'PERCENT' | 'FIXED';
}

@Component({
  selector: 'app-pos-discount-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col p-6 min-w-[360px] max-w-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl">
      <!-- Header Limpio -->
      <div class="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ 'pos.discountTitle' | transloco }}</h2>
        <button mat-icon-button (click)="dialogRef.close()" class="!w-8 !h-8 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
          <mat-icon svgIcon="circle-x" class="!w-4 !h-4"></mat-icon>
        </button>
      </div>

      <div class="py-5 space-y-4">
        <!-- Selector Tipo de Descuento (Pills) -->
        <div class="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            type="button"
            (click)="type = 'FIXED'"
            class="py-2 text-xs font-bold rounded-lg transition-all"
            [ngClass]="type === 'FIXED' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
          >
            Monto Fijo (RD$)
          </button>
          <button
            type="button"
            (click)="type = 'PERCENT'"
            class="py-2 text-xs font-bold rounded-lg transition-all"
            [ngClass]="type === 'PERCENT' ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'"
          >
            Porcentaje (%)
          </button>
        </div>

        <!-- Input de Valor con espaciado correcto -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            {{ type === 'PERCENT' ? 'Porcentaje de descuento (%)' : 'Monto de descuento (RD$)' }}
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-2.5 text-xs font-bold text-neutral-400">
              {{ type === 'PERCENT' ? '%' : 'RD$' }}
            </span>
            <input
              type="number"
              min="0"
              [max]="type === 'PERCENT' ? 100 : data.subtotal"
              step="any"
              [(ngModel)]="value"
              (keydown.enter)="apply()"
              placeholder="0.00"
              class="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 py-2.5 pr-4 pl-12 text-base font-black font-mono text-neutral-900 dark:text-white outline-none focus:border-primary-500 transition-all placeholder:text-neutral-400"
              cdkFocusInitial
            />
          </div>
        </div>

        <!-- Preview Descuento Calculado -->
        <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between text-xs">
          <span class="text-neutral-500 dark:text-neutral-400">Descuento aplicado:</span>
          <span class="font-bold text-rose-600 dark:text-rose-400 text-sm font-mono">
            - RD$ {{ calculatedDiscount | number:'1.2-2' }}
          </span>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between pt-3 border-t border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          mat-button
          (click)="removeDiscount()"
          class="!rounded-xl !text-xs !text-neutral-400 hover:!text-rose-600 dark:hover:!text-rose-400 !px-3"
        >
          Quitar Descuento
        </button>
        <button
          type="button"
          mat-flat-button
          color="primary"
          (click)="apply()"
          class="!rounded-xl !px-6 !text-xs !font-bold"
        >
          Aplicar
        </button>
      </div>
    </div>
  `,
})
export class PosDiscountDialogComponent {
  readonly dialogRef = inject(MatDialogRef<PosDiscountDialogComponent>);
  readonly data: PosDiscountData = inject(MAT_DIALOG_DATA);

  value = this.data.currentValue || 0;
  type: 'PERCENT' | 'FIXED' = this.data.currentType || 'FIXED';

  get calculatedDiscount(): number {
    const val = Number(this.value) || 0;
    if (val <= 0) return 0;
    if (this.type === 'PERCENT') {
      return Number(((this.data.subtotal * Math.min(val, 100)) / 100).toFixed(2));
    }
    return Math.min(val, this.data.subtotal);
  }

  apply(): void {
    this.dialogRef.close({
      value: Number(this.value) || 0,
      type: this.type,
    });
  }

  removeDiscount(): void {
    this.dialogRef.close({ value: 0, type: 'FIXED' });
  }
}
