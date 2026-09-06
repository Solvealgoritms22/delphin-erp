import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  DOP: 'RD$',
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  MXN: 'Mex$',
  BRL: 'R$',
  CHF: 'CHF',
  JPY: '¥',
};

export interface BillingTax {
  id: string;
  codigo: string;
  nombre: string;
  tasa: number;
  tipo?: string;
  indicadorFacturacion?: string;
  activo?: boolean;
}

export interface BillingCompanyConfig {
  monedaBase: string;
  zonaHoraria: string;
  locale: string;
  precisionMoneda: number;
  precisionCantidad: number;
  metodoRedondeo: string;
  redondeoPor: string;
  preciosIncluyenImpuesto: boolean;
  diasGracia: number;
}

@Injectable({ providedIn: 'root' })
export class CurrencyConfigService {
  private readonly http = inject(HttpClient);

  private readonly initialCurrency = typeof localStorage !== 'undefined'
    ? localStorage.getItem('delphin_currency_code') || 'DOP'
    : 'DOP';

  readonly currencyCode = signal<string>(this.initialCurrency);
  readonly currency = this.currencyCode;
  readonly currencySymbol = signal<string>(CURRENCY_SYMBOLS[this.initialCurrency] || 'RD$');
  readonly taxes = signal<BillingTax[]>([]);
  readonly config = signal<BillingCompanyConfig | null>(null);
  readonly exchangeRates = signal<Record<string, number>>({ USD: 60.0, EUR: 65.0 });

  /**
   * Tasa de impuesto activa por defecto de la empresa (ej: 16 o 18).
   * Se obtiene de la configuración fiscal de facturación (impuesto gravado activo).
   */
  readonly defaultTaxRate = computed<number>(() => {
    const list = this.taxes().filter((t) => t.activo !== false);
    // Prioridad 1: Impuesto activo con indicador DGII '1' (Gravado) y tasa > 0
    const gravado = list.find((t) => t.indicadorFacturacion === '1' && Number(t.tasa) > 0);
    if (gravado) return Number(gravado.tasa);

    // Prioridad 2: Cualquier impuesto con tasa > 0
    const anyTax = list.find((t) => Number(t.tasa) > 0);
    if (anyTax) return Number(anyTax.tasa);

    return 18; // Fallback general si no hay configuración
  });

  /**
   * Nombre del impuesto base (ej: 'ITBIS', 'IVA')
   */
  readonly defaultTaxName = computed<string>(() => {
    const list = this.taxes().filter((t) => t.activo !== false);
    const gravado = list.find((t) => t.indicadorFacturacion === '1' && Number(t.tasa) > 0);
    if (gravado?.tipo) return gravado.tipo;
    if (gravado?.nombre?.toUpperCase().includes('ITBIS')) return 'ITBIS';
    if (gravado?.nombre?.toUpperCase().includes('IVA')) return 'IVA';
    return 'ITBIS';
  });

  /**
   * Etiqueta formateada del impuesto base (ej: 'ITBIS (16%)')
   */
  readonly defaultTaxLabel = computed<string>(() => {
    return `${this.defaultTaxName()} (${this.defaultTaxRate()}%)`;
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.http.get<any>(`${environment.apiUrl}/billing-config`).subscribe({
      next: (data) => {
        const code = data?.configuracion?.monedaBase || 'DOP';
        this.currencyCode.set(code);
        this.currencySymbol.set(this.getSymbol(code));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('delphin_currency_code', code);
        }

        if (data?.configuracion) {
          this.config.set(data.configuracion);
          if (data.configuracion.tasasCambio && typeof data.configuracion.tasasCambio === 'object') {
            this.exchangeRates.set({
              USD: 60.0,
              EUR: 65.0,
              ...data.configuracion.tasasCambio,
            });
          }
        }

        if (Array.isArray(data?.impuestos)) {
          this.taxes.set(data.impuestos);
        }
      },
      error: () => {},
    });
  }

  getSymbol(code?: string | null): string {
    if (!code) return this.currencySymbol();
    return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
  }

  getTaxRate(taxId?: string | null): number {
    if (!taxId) return this.defaultTaxRate();
    const found = this.taxes().find((t) => t.id === taxId);
    return found ? Number(found.tasa) : this.defaultTaxRate();
  }

  /**
   * Convierte un monto entre dos divisas usando las tasas de cambio de facturación.
   */
  convertAmount(amount: number, fromCurrency?: string | null, toCurrency?: string | null): number {
    const from = (fromCurrency || this.currencyCode()).toUpperCase();
    const to = (toCurrency || this.currencyCode()).toUpperCase();
    if (!amount || isNaN(amount) || from === to) return Number((amount || 0).toFixed(2));

    const rates = this.exchangeRates();
    const base = this.currencyCode().toUpperCase();

    // Llevar monto a moneda base
    let inBase = amount;
    if (from !== base) {
      const rate = Number(rates[from]) || (from === 'USD' ? 60.0 : 1);
      inBase = amount * rate;
    }

    // Convertir de base a moneda destino
    if (to === base) {
      return Number(inBase.toFixed(2));
    } else {
      const rate = Number(rates[to]) || (to === 'USD' ? 60.0 : 1);
      return Number((inBase / rate).toFixed(2));
    }
  }
}

