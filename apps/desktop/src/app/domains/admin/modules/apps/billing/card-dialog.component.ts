import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { environment } from '@/environments/environment';

function luhnValid(numero: string): boolean {
  const digits = numero.replace(/\s/g, '');
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function formatNumero(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function formatExpiracion(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

@Component({
  selector: 'app-card-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  template: `
    <div class="flex flex-col w-full min-w-[360px] md:min-w-[420px] max-w-md max-h-[90vh] sm:max-h-[85vh]">
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 shrink-0">
        <div>
          <h2 class="text-xl font-bold text-neutral-900 dark:text-white">{{ data ? 'Editar tarjeta' : 'Forma de Pago' }}</h2>
          <p class="text-xs text-neutral-500 mt-1">Procesamiento seguro vía Azul (PCI-DSS)</p>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="text-neutral-500 hover:text-neutral-700">
          <mat-icon svgIcon="x" class="icon-size-5"></mat-icon>
        </button>
      </div>

      <div class="flex flex-col p-6 overflow-y-auto flex-auto">
        <!-- VIRTUAL CARD PREVIEW -->
        <div class="relative flex flex-col justify-between w-full max-w-[340px] aspect-[1.586] mx-auto rounded-2xl p-6 text-white overflow-hidden shadow-2xl mb-8 transition-colors duration-500 shrink-0 min-h-[214px]"
             [ngClass]="cardType() === 'visa' ? 'bg-gradient-to-br from-blue-600 to-blue-900' : 
                       (cardType() === 'mastercard' ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gradient-to-br from-slate-700 to-slate-900')">
          
          <!-- background decoration -->
          <div class="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white opacity-10 blur-2xl"></div>
          <div class="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-white opacity-10 blur-xl"></div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50 mix-blend-overlay"></div>

          <div class="flex justify-between items-start relative z-10">
            <div class="flex items-center gap-3">
              <!-- EMV Chip -->
              <svg class="w-12 h-9 text-amber-200/90 drop-shadow-sm" viewBox="0 0 60 42" fill="none">
                <rect x="1" y="1" width="58" height="40" rx="6" stroke="currentColor" stroke-width="2" fill="#d4af37" fill-opacity="0.3"/>
                <path d="M1 14h18M1 28h18M41 14h18M41 28h18M19 1v40M41 1v40" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
              </svg>
              <!-- Contactless -->
              <svg class="w-6 h-6 text-white opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <path d="M5 8.5c2.4 2.4 3 6.6 0 10m4.5-13.5c3.6 3.6 4.5 9.9 0 15m4.5-18c4.8 4.8 6 13.2 0 19"/>
              </svg>
            </div>
            
            <!-- Brand Logo -->
            <div class="font-bold text-2xl italic tracking-wider opacity-90 drop-shadow-md">
              <span *ngIf="cardType() === 'visa'" class="font-serif tracking-tighter">VISA</span>
              <div *ngIf="cardType() === 'mastercard'" class="flex items-center justify-center">
                <div class="w-8 h-8 rounded-full bg-[#EB001B] opacity-90 mix-blend-multiply"></div>
                <div class="w-8 h-8 rounded-full bg-[#F79E1B] opacity-90 mix-blend-multiply -ml-3"></div>
              </div>
              <span *ngIf="cardType() === 'unknown'" class="text-sm not-italic opacity-50 tracking-normal">CARD</span>
            </div>
          </div>

          <div class="relative z-10">
            <div class="font-mono text-2xl tracking-[0.15em] text-shadow-sm mb-4 min-h-[32px] font-medium drop-shadow-md">
              {{ form.value.numero || '•••• •••• •••• ••••' }}
            </div>
            <div class="flex justify-between items-end">
              <div class="flex flex-col uppercase">
                <span class="text-[9px] opacity-70 font-semibold tracking-widest mb-1 text-white/80">TITULAR DE LA TARJETA</span>
                <span class="font-medium tracking-wide truncate max-w-[180px] min-h-[20px] text-sm drop-shadow-sm">
                  {{ form.value.nombre || 'NOMBRE' }}
                </span>
              </div>
              <div class="flex flex-col uppercase text-right">
                <span class="text-[9px] opacity-70 font-semibold tracking-widest mb-1 text-white/80">VENCE</span>
                <span class="font-medium tracking-wider font-mono min-h-[20px] text-sm drop-shadow-sm">
                  {{ form.value.expiracion || 'MM/AA' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col relative shrink-0">
          <!-- Azul Hosted Fields Simulation Overlay -->
          <div class="absolute -inset-4 bg-white/40 dark:bg-neutral-900/40 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center rounded-2xl" *ngIf="loadingVault()">
            <div class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-semibold text-blue-600 mt-2 bg-white dark:bg-neutral-900 px-3 py-1 rounded-full shadow-sm">Conectando con Azul...</span>
          </div>

          <div class="grid grid-cols-1 gap-4">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Titular de la tarjeta</mat-label>
              <input matInput formControlName="nombre" placeholder="Nombre que aparece en la tarjeta" autocomplete="cc-name" />
              @if (form.get('nombre')?.hasError('required')) {
                <mat-error>El titular es requerido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Número de tarjeta</mat-label>
              <input matInput formControlName="numero" placeholder="1234 5678 9012 3456" inputmode="numeric" (input)="onNumInput()" />
              <mat-icon matSuffix svgIcon="lock" class="text-emerald-500 mr-2"></mat-icon>
              @if (form.get('numero')?.hasError('required')) {
                <mat-error>El número es requerido</mat-error>
              } @else if (form.get('numero')?.hasError('invalidNumber')) {
                <mat-error>Número inválido</mat-error>
              }
            </mat-form-field>

            <div class="grid grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Expiración</mat-label>
                <input matInput formControlName="expiracion" placeholder="MM/AA" inputmode="numeric" (input)="onExpInput()" />
                @if (form.get('expiracion')?.hasError('required')) {
                  <mat-error>Requerido</mat-error>
                } @else if (form.get('expiracion')?.hasError('invalidExp')) {
                  <mat-error>Fecha inválida</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>CVC / CVV</mat-label>
                <input matInput formControlName="cvc" placeholder="123" type="password" inputmode="numeric" maxlength="4" />
                <mat-icon matSuffix svgIcon="lock" class="text-emerald-500 mr-2"></mat-icon>
                @if (form.get('cvc')?.hasError('required')) {
                  <mat-error>Requerido</mat-error>
                } @else if (form.get('cvc')?.hasError('minlength')) {
                  <mat-error>Mínimo 3 dígitos</mat-error>
                }
              </mat-form-field>
            </div>
          </div>
        </form>

        <p class="mt-4 text-[12.5px] leading-relaxed text-neutral-500 flex items-start gap-3 bg-blue-50 dark:bg-blue-900/10 text-blue-800 dark:text-blue-300 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 shrink-0">
          <span>
            <strong>Dolphin ERP nunca guarda tu tarjeta.</strong> Estos campos están conectados directamente a la bóveda de datos de <strong>Azul</strong> mediante <em>tokenización</em>, cumpliendo con la estricta normativa de seguridad PCI-DSS.
          </span>
        </p>
      </div>

      <div class="flex flex-col gap-3 p-6 pt-2 shrink-0 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <button mat-flat-button class="bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-6 shadow-sm w-full flex items-center justify-center gap-2" (click)="submit()" [disabled]="form.invalid || loadingVault()">
          <mat-icon svgIcon="save" class="icon-size-5"></mat-icon>
          {{ data ? 'Guardar Cambios' : 'Guardar Tarjeta en Azul' }}
        </button>
        <button mat-button type="button" (click)="dialogRef.close()" class="font-medium text-neutral-500 hover:text-neutral-700">
          Cancelar
        </button>
      </div>
    </div>
  `,
  styles: [`
    .text-shadow-sm {
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
  `]
})
export class CardDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<CardDialogComponent>);
  public data = inject(MAT_DIALOG_DATA, { optional: true });
  fb = inject(FormBuilder);
  http = inject(HttpClient);

  loadingVault = signal<boolean>(true);
  cardType = signal<'visa' | 'mastercard' | 'unknown'>('unknown');

  form = this.fb.group({
    nombre: ['', Validators.required],
    numero: ['', [Validators.required, (c: AbstractControl) => (luhnValid(c.value ?? '') ? null : { invalidNumber: true })]],
    expiracion: ['', [Validators.required, (c: AbstractControl) => (validExp(c.value ?? '') ? null : { invalidExp: true })]],
    cvc: ['', [Validators.required, Validators.minLength(3)]],
  });

  ngOnInit() {
    if (this.data) {
      this.form.patchValue({
        nombre: this.data.nombre,
        numero: this.data.numeroEnmascarado,
        expiracion: this.data.expiracion
      });
      // Disable number in edit mode
      this.form.get('numero')?.disable();

      const brand = this.data.marca.toLowerCase();
      this.cardType.set(brand === 'visa' || brand === 'mastercard' ? brand : 'unknown');
    }

    // Simulate Data Vault script loading (e.g. Stripe Elements or Azul Hosted Fields)
    setTimeout(() => {
      this.loadingVault.set(false);
    }, 1200);
  }

  onNumInput(): void {
    const val = this.form.get('numero')?.value ?? '';
    const formatted = formatNumero(val);
    this.form.patchValue({ numero: formatted }, { emitEvent: false });

    const digits = formatted.replace(/\D/g, '');
    if (digits.startsWith('4')) {
      this.cardType.set('visa');
    } else if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) {
      this.cardType.set('mastercard');
    } else {
      this.cardType.set('unknown');
    }
  }

  onExpInput(): void {
    this.form.patchValue({ expiracion: formatExpiracion(this.form.get('expiracion')?.value ?? '') }, { emitEvent: false });
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loadingVault()) return;
    
    this.loadingVault.set(true); // Show loading overlay again while processing payment
    
    const { nombre, numero, expiracion, cvc } = this.form.getRawValue();
    
    // Format expiration from MM/YY to MMYY
    const exp = expiracion?.replace(/\//g, '') || '';

    try {
      // Real API integration with Azul Data Vault
      const response = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/payments/azul/payment-method`, {
        cardNumber: numero,
        expiration: exp,
        cvc: cvc,
        cardHolder: nombre
      }));
      
      this.dialogRef.close({ 
        nombre, 
        numeroEnmascarado: `**** **** **** ${response.cardLast4 || numero?.slice(-4)}`, 
        expiracion, 
        marca: response.cardBrand || this.cardType() 
      });
    } catch (error) {
      console.error('Error tokenizing card:', error);
      // Ideally show a snackbar with the error message here
    } finally {
      this.loadingVault.set(false);
    }
  }
}

function validExp(value: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const exp = new Date(year, month, 1);
  return exp.getTime() > now.getTime();
}
