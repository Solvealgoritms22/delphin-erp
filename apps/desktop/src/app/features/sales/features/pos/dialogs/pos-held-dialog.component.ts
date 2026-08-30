import { Component, inject } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { PosService } from '../data/pos.service';

@Component({
  selector: 'app-pos-held-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col p-6 min-w-[360px] sm:min-w-[480px] max-w-lg max-h-[85vh] bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white rounded-2xl">
      <!-- Header Limpio -->
      <div class="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
        <div>
          <h2 class="text-lg font-bold text-neutral-900 dark:text-white">{{ 'pos.heldTitle' | transloco }}</h2>
          <p class="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {{ posService.heldCarts().length }} {{ 'pos.heldCount' | transloco }}
          </p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="!w-8 !h-8 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
          <mat-icon svgIcon="circle-x" class="!w-4 !h-4"></mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="py-4 overflow-y-auto flex-auto min-h-0 space-y-3">
        @if (posService.heldCarts().length === 0) {
          <div class="flex flex-col items-center justify-center py-12 text-center">
            <mat-icon svgIcon="pause" class="!w-10 !h-10 text-neutral-300 dark:text-neutral-700 mb-2"></mat-icon>
            <p class="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              {{ 'pos.noHeldSales' | transloco }}
            </p>
            <p class="text-xs text-neutral-400 max-w-xs mt-0.5">
              {{ 'pos.noHeldSalesDesc' | transloco }}
            </p>
          </div>
        } @else {
          @for (held of posService.heldCarts(); track held.id) {
            <div class="p-4 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/40 hover:border-primary-300 dark:hover:border-primary-800 transition-all flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-neutral-900 dark:text-white">
                      {{ held.client?.nombreRazonSocial || 'Cliente General' }}
                    </span>
                    <span class="text-[11px] text-neutral-400">
                      · {{ held.itemCount }} {{ 'pos.items' | transloco }}
                    </span>
                  </div>
                  <div class="text-[11px] text-neutral-400 mt-0.5 flex items-center gap-1">
                    <mat-icon svgIcon="clock" class="!w-3 !h-3"></mat-icon>
                    {{ held.createdAt | date:'dd/MM/yyyy · hh:mm a' }}
                  </div>
                </div>

                <div class="text-right">
                  <div class="text-base font-black text-neutral-900 dark:text-white">
                    RD$ {{ held.total | number:'1.2-2' }}
                  </div>
                </div>
              </div>

              <!-- Mini lista de items -->
              <div class="text-xs text-neutral-500 dark:text-neutral-400 bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/60 line-clamp-2">
                @for (item of held.items; track item.id; let last = $last) {
                  <span>{{ item.cantidad }}x {{ item.product.nombre }}{{ !last ? ', ' : '' }}</span>
                }
              </div>

              <!-- Actions -->
              <div class="flex items-center justify-end gap-2 pt-1">
                <button
                  mat-button
                  (click)="deleteHeld(held.id)"
                  class="!rounded-lg !text-xs !text-neutral-400 hover:!text-rose-600 dark:hover:!text-rose-400 !px-2.5 !h-7"
                >
                  <mat-icon svgIcon="trash" class="!w-3.5 !h-3.5 mr-1"></mat-icon>
                  {{ 'pos.delete' | transloco }}
                </button>

                <button
                  mat-flat-button
                  color="primary"
                  (click)="resumeHeld(held.id)"
                  class="!rounded-lg !text-xs !font-bold !px-3.5 !h-7"
                >
                  {{ 'pos.resumeSale' | transloco }}
                </button>
              </div>
            </div>
          }
        }
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end pt-3 border-t border-neutral-100 dark:border-neutral-800 shrink-0">
        <button mat-stroked-button (click)="dialogRef.close()" class="!rounded-xl !text-xs">
          {{ 'common.close' | transloco }}
        </button>
      </div>
    </div>
  `,
})
export class PosHeldDialogComponent {
  readonly dialogRef = inject(MatDialogRef<PosHeldDialogComponent>);
  readonly posService = inject(PosService);

  resumeHeld(heldId: string): void {
    this.posService.resumeHeldCart(heldId);
    this.dialogRef.close({ resumed: true });
  }

  deleteHeld(heldId: string): void {
    this.posService.deleteHeldCart(heldId);
  }
}
