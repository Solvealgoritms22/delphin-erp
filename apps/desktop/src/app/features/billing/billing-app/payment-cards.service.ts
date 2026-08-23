import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

export type PaymentCard = {
  id: string;
  nombre: string;
  numeroEnmascarado: string;
  marca: string;
  expiracion: string;
  isPrimary?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PaymentCardsService {
  private http = inject(HttpClient);
  readonly cards = signal<PaymentCard[]>([]);

  load(): void {
    this.http.get<any>(`${environment.apiUrl}/payments/azul/payment-method`).subscribe({
      next: (res) => {
        if (res.hasPaymentMethod) {
          this.cards.set([{
            id: 'azul-primary',
            nombre: res.cardHolder || 'Titular',
            numeroEnmascarado: `•••• ${res.cardLast4}`,
            marca: res.cardBrand || 'Desconocida',
            expiracion: res.expiration,
            isPrimary: true
          }]);
        } else {
          this.cards.set([]);
        }
      },
      error: () => this.cards.set([])
    });
  }

  add(_input: any): void {
    // Re-fetch from server to ensure sync
    this.load();
  }

  remove(_id: string): void {
    this.http.delete(`${environment.apiUrl}/payments/azul/payment-method`).subscribe({
      next: () => this.cards.set([]),
      error: (err) => console.error('Failed to remove card', err)
    });
  }

  setDefault(_id: string): void {
    // Only 1 card supported for now
  }

  update(_id: string, _updates: Partial<PaymentCard>): void {
    // No-op for now
  }
}

function _detectBrand(numero: string): string {
  const digits = numero.replace(/\s/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Tarjeta';
}
