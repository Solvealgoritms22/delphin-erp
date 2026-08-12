import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '@/environments/environment';

export interface CheckoutDialogData {
  planId: string;
  planNombre: string;
  amount: number;
  billingCycle: 'monthly' | 'annual';
  simulated: boolean;
}

export interface CheckoutResult {
  ok: boolean;
  simulated: boolean;
  plan: string;
  error?: string;
}

@Component({
  selector: 'app-checkout-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col w-full">
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
        <h2 class="text-xl font-bold text-neutral-900 dark:text-white">Confirmar pago</h2>
        <button mat-icon-button (click)="dialogRef.close(null)" class="text-neutral-500 hover:text-neutral-700">
          <mat-icon svgIcon="x" class="icon-size-5"></mat-icon>
        </button>
      </div>

      <div class="flex flex-col px-6 py-6 gap-6">
        <!-- Order summary -->
        <div class="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-medium text-neutral-900 dark:text-white">{{ data.planNombre }}</div>
              <div class="text-sm text-neutral-500">Facturado {{ data.billingCycle === 'annual' ? 'anualmente' : 'mensualmente' }}</div>
            </div>
            <div class="text-2xl font-bold text-neutral-900 dark:text-white">$<ng-container>{{ data.amount }}</ng-container></div>
          </div>
        </div>

        <!-- Checkout button -->
        <button mat-flat-button
          (click)="pay()"
          [disabled]="isProcessing()"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 text-base font-bold">
          @if (isProcessing()) {
            <span class="flex items-center justify-center gap-2">
              {{ data.simulated ? 'Procesando pago simulado...' : 'Procesando pago...' }}
            </span>
          } @else {
            <span class="flex items-center justify-center gap-2">
              <mat-icon svgIcon="wallet" class="icon-size-5"></mat-icon>
              {{ data.simulated ? 'Pagar' : 'Confirmar suscripción' }}
            </span>
          }
        </button>

        @if (data.simulated) {
          <p class="text-center text-xs text-neutral-400">
            Modo desarrollo activo: el pago se procesará en <span class="font-medium">modo simulado</span> (solo pruebas).
          </p>
        }

        @if (error()) {
          <div class="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            <mat-icon svgIcon="alert-triangle" class="icon-size-4 shrink-0"></mat-icon>
            {{ error() }}
          </div>
        }
      </div>
    </div>
  `,
})
export class CheckoutDialogComponent {
  dialogRef = inject(MatDialogRef<CheckoutDialogComponent>);
  data = inject<CheckoutDialogData>(MAT_DIALOG_DATA);
  private http = inject(HttpClient);

  isProcessing = signal(false);
  private _error = signal('');
  error = this._error.asReadonly();

  pay() {
    this.isProcessing.set(true);
    this._error.set('');

    this.http
      .post<any>(`${environment.apiUrl}/payments/change-plan`, {
        planId: this.data.planId,
        billingCycle: this.data.billingCycle,
      })
      .subscribe({
        next: (res) => {
          this.isProcessing.set(false);
          this.dialogRef.close({ ok: true, simulated: res.simulated, plan: res.plan } as CheckoutResult);
        },
        error: (err) => this.fail(err),
      });
  }

  private fail(err: any) {
    this.isProcessing.set(false);
    this._error.set(err?.error?.message || 'No se pudo procesar el pago. Inténtalo de nuevo.');
  }
}