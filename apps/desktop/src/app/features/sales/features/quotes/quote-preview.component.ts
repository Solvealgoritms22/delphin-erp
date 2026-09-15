import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Cotizacion } from '../../data/quotes.service';
import { AuthState } from '@core/auth/auth.state';
import { CurrencyConfigService } from '@core/currency/currency-config.service';
import { environment } from '@/environments/environment';

@Component({
  selector: 'app-quote-preview',
  standalone: true,
  host: { class: 'flex flex-col w-full min-w-0 h-full' },
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslocoPipe,
  ],
  template: `
    <div class="flex flex-col h-full w-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">
      <!-- Modal Header (no-print) -->
      <div class="no-print flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <mat-icon svgIcon="file-text" class="icon-size-5"></mat-icon>
          </div>
          <div>
            <h2 class="text-base font-bold text-neutral-900 dark:text-white">
              {{ 'commercial.quotes.preview.title' | transloco: { number: quote.numeroCotizacion } }}
            </h2>
            <p class="text-xs text-neutral-500">
              {{ 'commercial.quotes.preview.subtitle' | transloco }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="close()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-colors cursor-pointer"
          >
            <mat-icon svgIcon="x" class="icon-size-4"></mat-icon>
          </button>
        </div>
      </div>

      <!-- Printable Visual Document Body -->
      <div class="flex-auto min-h-0 overflow-y-auto p-4 sm:p-6 bg-neutral-100/50 dark:bg-neutral-950">
        <div class="w-full max-w-[760px] mx-auto p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-2xl space-y-6 shadow-sm">
          
          <!-- Document Header -->
          <div class="flex flex-col sm:flex-row justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-6 gap-6">
            <div class="min-w-0 flex-1">
              @if (empresaLogo() && !logoFailed()) {
                <div class="mb-3 max-h-16 max-w-64 flex items-center">
                  <img
                    [src]="empresaLogo()"
                    [alt]="empresaNombre()"
                    (error)="logoFailed.set(true)"
                    class="max-h-16 max-w-64 object-contain object-left"
                  />
                </div>
              } @else {
                <!-- Iniciales como fallback elegante cuando no hay logo -->
                <div class="inline-flex items-center justify-center size-14 rounded-xl bg-blue-600 text-white font-black text-xl mb-3 shadow-xs select-none">
                  {{ empresaIniciales() }}
                </div>
              }
              <h1 class="text-xl font-extrabold text-neutral-900 dark:text-white leading-tight">
                {{ empresaNombre() }}
              </h1>
              @if (empresaRnc() || empresaTelefono()) {
                <p class="text-xs text-neutral-500 mt-1">
                  {{ empresaRnc() }}{{ empresaTelefono() }}
                </p>
              }
              @if (empresaDireccion()) {
                <p class="text-xs text-neutral-500 mt-0.5">
                  {{ empresaDireccion() }}
                </p>
              }
            </div>

            <div class="sm:text-right shrink-0">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {{ 'commercial.quotes.preview.badge' | transloco }}
              </span>
              <div class="text-lg font-mono font-black text-neutral-900 dark:text-white mt-1.5">
                {{ quote.numeroCotizacion }}
              </div>
              <div class="text-xs text-neutral-500 mt-1">
                {{ 'commercial.quotes.preview.date' | transloco }}: <strong>{{ quote.fecha | date: 'dd/MM/yyyy' }}</strong>
              </div>
              <div class="text-xs text-neutral-500">
                {{ 'commercial.quotes.preview.validUntil' | transloco }}: <strong>{{ quote.fechaVencimiento ? (quote.fechaVencimiento | date: 'dd/MM/yyyy') : ('commercial.quotes.preview.validDays' | transloco) }}</strong>
              </div>
            </div>
          </div>

          <!-- Client & Metadata Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 rounded-xl">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{{ 'commercial.quotes.preview.quotedFor' | transloco }}</span>
              @if (quote.cliente; as cli) {
                <div class="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                  {{ cli.nombreRazonSocial }}
                </div>
                @if (cli.numeroDocumento) {
                  <div class="text-xs font-mono text-neutral-500 mt-0.5">
                    RNC/Cédula: {{ cli.numeroDocumento }}
                  </div>
                }
                @if (cli.email) {
                  <div class="text-xs text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1">
                    <mat-icon svgIcon="mail" class="icon-size-3.5"></mat-icon>
                    <span>{{ cli.email }}</span>
                  </div>
                }
              } @else {
                <div class="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                  {{ 'commercial.quotes.preview.finalConsumer' | transloco }}
                </div>
              }
            </div>

            <div class="sm:text-right">
              <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{{ 'commercial.quotes.preview.offerStatus' | transloco }}</span>
              <div class="mt-1">
                <span class="inline-flex items-center px-2.5 py-1 text-xs font-bold border rounded-lg"
                  [ngClass]="{
                    'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700': quote.estado === 'BORRADOR',
                    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800': quote.estado === 'ENVIADA',
                    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800': quote.estado === 'ACEPTADA' || quote.estado === 'FACTURADA',
                    'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800': quote.estado === 'RECHAZADA' || quote.estado === 'VENCIDA'
                  }">
                  {{ quote.estado }}
                </span>
              </div>
              @if (quote.enviadaPorEmail) {
                <div class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex sm:justify-end items-center gap-1">
                  <mat-icon svgIcon="check" class="icon-size-3.5"></mat-icon>
                  <span>{{ 'commercial.quotes.preview.sentTo' | transloco: { email: quote.emailDestino } }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Items Table -->
          <div class="overflow-x-auto border border-neutral-200 dark:border-neutral-800 rounded-xl">
            <table class="w-full text-left text-xs">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th class="py-3 px-4">{{ 'commercial.quotes.preview.itemNumber' | transloco }}</th>
                  <th class="py-3 px-4">{{ 'commercial.quotes.preview.description' | transloco }}</th>
                  <th class="py-3 px-4 text-center">{{ 'commercial.quotes.preview.qty' | transloco }}</th>
                  <th class="py-3 px-4 text-right">{{ 'commercial.quotes.preview.unitPrice' | transloco }}</th>
                  <th class="py-3 px-4 text-right">{{ getTaxLabel() }}</th>
                  <th class="py-3 px-4 text-right">{{ 'commercial.quotes.preview.total' | transloco }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
                @for (d of quote.detalles; track d.id; let idx = $index) {
                  <tr>
                    <td class="py-3 px-4 text-neutral-400 font-mono">{{ idx + 1 }}</td>
                    <td class="py-3 px-4 font-semibold text-neutral-900 dark:text-white">
                      {{ d.descripcion }}
                      @if (d.descuento > 0) {
                        <div class="text-[10px] text-emerald-600 dark:text-emerald-400">
                          {{ 'commercial.quotes.preview.discountApplied' | transloco }}: -{{ getCurrencySymbol() }} {{ d.descuento | number: '1.2-2' }}
                        </div>
                      }
                    </td>
                    <td class="py-3 px-4 text-center font-mono font-bold">{{ d.cantidad }}</td>
                    <td class="py-3 px-4 text-right font-mono">{{ getCurrencySymbol() }} {{ d.precioUnitario | number: '1.2-2' }}</td>
                    <td class="py-3 px-4 text-right font-mono text-neutral-500">{{ getCurrencySymbol() }} {{ d.itbis | number: '1.2-2' }}</td>
                    <td class="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">{{ getCurrencySymbol() }} {{ d.total | number: '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Summary & Totals -->
          <div class="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div class="space-y-3 flex-1">
              @if (quote.notas) {
                <div class="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs">
                  <strong class="block text-neutral-700 dark:text-neutral-300 mb-1">{{ 'commercial.quotes.preview.commercialNotes' | transloco }}</strong>
                  <p class="text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{{ quote.notas }}</p>
                </div>
              }
              @if (quote.terminosCondiciones) {
                <div class="p-3.5 bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs">
                  <strong class="block text-neutral-700 dark:text-neutral-300 mb-1">{{ 'commercial.quotes.preview.terms' | transloco }}</strong>
                  <p class="text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{{ quote.terminosCondiciones }}</p>
                </div>
              }
            </div>

            <div class="w-full sm:w-72 space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                <span>{{ 'commercial.quotes.preview.subtotalNet' | transloco }}</span>
                <span class="font-mono font-bold text-neutral-900 dark:text-white">{{ getCurrencySymbol() }} {{ quote.subtotal | number: '1.2-2' }}</span>
              </div>
              @if (quote.descuento > 0) {
                <div class="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-emerald-600 dark:text-emerald-400">
                  <span>{{ 'commercial.quotes.preview.discount' | transloco }}</span>
                  <span class="font-mono font-bold">-{{ getCurrencySymbol() }} {{ quote.descuento | number: '1.2-2' }}</span>
                </div>
              }
              <div class="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                <span>{{ getTaxLabel() }}:</span>
                <span class="font-mono font-bold text-neutral-900 dark:text-white">{{ getCurrencySymbol() }} {{ quote.itbis | number: '1.2-2' }}</span>
              </div>
              <div class="flex justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl text-blue-900 dark:text-blue-300 text-sm font-black">
                <span>{{ 'commercial.quotes.preview.totalQuoted' | transloco }}</span>
                <span class="font-mono text-base">{{ getCurrencySymbol() }} {{ quote.total | number: '1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer (no-print) -->
      <div class="no-print flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <button
          type="button"
          (click)="close()"
          class="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          {{ 'commercial.quotes.preview.close' | transloco }}
        </button>
        <button
          type="button"
          (click)="printQuote()"
          class="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
          <span>{{ 'commercial.quotes.preview.print' | transloco }}</span>
        </button>
      </div>
    </div>
  `,
})
export class QuotePreviewComponent implements OnInit {
  dialogRef = inject(MatDialogRef<QuotePreviewComponent>);
  data = inject<{
    quote: Cotizacion;
    empresaNombre?: string;
    empresaLogo?: string | null;
    empresaRnc?: string | null;
    empresaTelefono?: string | null;
    empresaDireccion?: string | null;
  }>(MAT_DIALOG_DATA);
  private http = inject(HttpClient);
  private authState = inject(AuthState);
  private currencyConfig = inject(CurrencyConfigService);
  private transloco = inject(TranslocoService);

  quote: Cotizacion = this.data.quote;
  liveEmpresa = signal<any>(null);
  logoFailed = signal<boolean>(false);

  ngOnInit(): void {
    this.loadEmpresaInfo();
  }

  private loadEmpresaInfo(): void {
    // 1. Check quote.empresa
    if ((this.quote as any)?.empresa) {
      this.liveEmpresa.set((this.quote as any).empresa);
      return;
    }

    // 2. Fetch active company data from server
    this.http.get<any>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (emp) => {
        if (emp) {
          this.liveEmpresa.set(emp);
        }
      },
      error: () => {
        // Fallback to cache if request fails
        try {
          const cached = localStorage.getItem('cached_my_empresas');
          if (cached) {
            const list = JSON.parse(cached);
            if (Array.isArray(list) && list.length > 0) {
              const activeId = this.authState.empresaId();
              const found = list.find((e: any) => e.id === activeId) || list[0];
              this.liveEmpresa.set(found);
            }
          }
        } catch { }
      }
    });
  }

  getCurrencySymbol(): string {
    const c = this.quote.moneda || this.currencyConfig.currency();
    return c === 'USD' ? 'USD $' : c === 'EUR' ? '€' : 'RD$';
  }

  getCurrencyName(): string {
    const c = this.quote.moneda || this.currencyConfig.currency();
    return c === 'USD' ? 'Dólares Estadounidenses (USD)' : c === 'EUR' ? 'Euros (EUR)' : 'Pesos Dominicanos (DOP)';
  }

  getTaxLabel(): string {
    const foundRate = this.quote.detalles?.find((d) => Number(d.tasaItbis) > 0)?.tasaItbis;
    const rate = foundRate !== undefined ? Number(foundRate) : this.currencyConfig.defaultTaxRate();
    return `${this.currencyConfig.defaultTaxName()} (${rate}%)`;
  }

  currentEmpresa = computed(() => {
    if (this.liveEmpresa()) return this.liveEmpresa();

    const user = this.authState.user();
    const empId = this.quote.empresaId || this.authState.empresaId();
    if (user?.empresas && user.empresas.length > 0) {
      return user.empresas.find((e) => e.id === empId) || user.empresas[0] || null;
    }

    try {
      const cached = localStorage.getItem('cached_my_empresas');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          return list.find((e: any) => e.id === empId) || list[0];
        }
      }
    } catch { }

    return null;
  });

  empresaNombre = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.razonSocial || emp?.nombre || this.data.empresaNombre || 'Delphin ERP';
  });

  empresaLogo = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.logo || this.data.empresaLogo || null;
  });

  empresaRnc = computed(() => {
    const emp = this.currentEmpresa();
    const rnc = emp?.rnc || this.data.empresaRnc;
    return rnc ? `RNC: ${rnc}` : '';
  });

  empresaTelefono = computed(() => {
    const emp = this.currentEmpresa();
    const tel = emp?.telefono || this.data.empresaTelefono;
    return tel ? ` · Tel: ${tel}` : '';
  });

  empresaDireccion = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.direccion || this.data.empresaDireccion || '';
  });

  empresaIniciales = computed(() => {
    const nombre = this.empresaNombre();
    if (!nombre || nombre === 'Delphin ERP') return 'DE';
    const words = nombre.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  });

  close(): void {
    this.dialogRef.close();
  }

  printQuote(): void {
    const quote = this.quote;
    if (!quote) return;
    const empresaNombre = this.empresaNombre();
    const empresaRnc = this.empresaRnc();
    const empresaLogo = this.empresaLogo();
    const empresaDireccion = this.empresaDireccion();
    const empresaTelefono = this.empresaTelefono();
    const formattedDate = new Date(quote.fecha).toLocaleDateString('es-DO');
    const formattedDueDate = quote.fechaVencimiento
      ? new Date(quote.fechaVencimiento).toLocaleDateString('es-DO')
      : '30 días';

    const curSymbol = this.getCurrencySymbol();
    const curName = this.getCurrencyName();
    const taxLabel = this.getTaxLabel();

    const formatCurrency = (val: number | undefined | null) => {
      const num = Number(val || 0);
      return curSymbol + ' ' + num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Cotización ${quote.numeroCotizacion} - ${empresaNombre}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: letter portrait; margin: 1.2cm; }
          .company-logo { max-height: 64px; max-width: 192px; object-fit: contain; margin-bottom: 10px; }
          .company-initials { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #2563eb; color: #fff; font-weight: 800; font-size: 18px; margin-bottom: 10px; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; color: #1e293b; font-size: 12px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
          .company-name { font-size: 20px; font-weight: 800; color: #1e40af; }
          .quote-title { font-size: 18px; font-weight: 800; color: #0f172a; text-align: right; }
          .grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 14px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; }
          th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #cbd5e1; font-size: 10.5px; text-transform: uppercase; }
          td { padding: 9px 10px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .totals { width: 260px; margin-left: auto; font-size: 12px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals-row.grand-total { font-weight: 800; font-size: 14px; border-top: 2px solid #0f172a; padding-top: 8px; margin-top: 6px; color: #1e40af; }
          .footer { margin-top: 36px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            ${empresaLogo ? `<img class="company-logo" src="${this.escapeHtml(empresaLogo)}" alt="${this.escapeHtml(empresaNombre)}" />` : `<div class="company-initials">${this.escapeHtml(this.empresaIniciales())}</div>`}
            <div class="company-name">${this.escapeHtml(empresaNombre)}</div>
            <div>${empresaRnc}</div>
            <div>${this.escapeHtml(empresaDireccion)}</div>
            <div>${empresaTelefono}</div>
          </div>
          <div>
            <div class="quote-title">COTIZACIÓN</div>
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; text-align: right;">${quote.numeroCotizacion}</div>
            <div style="text-align: right; margin-top: 4px;">Emisión: <strong>${formattedDate}</strong></div>
            <div style="text-align: right;">Válida hasta: <strong>${formattedDueDate}</strong></div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">Cliente:</div>
            <div style="font-size: 13px; font-weight: bold;">${quote.cliente?.nombreRazonSocial || 'Consumidor Final'}</div>
            <div style="font-family: monospace; color: #475569;">${quote.cliente?.numeroDocumento ? 'RNC/Céd: ' + quote.cliente.numeroDocumento : ''}</div>
            <div>${quote.cliente?.email || ''}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">Moneda:</div>
            <div style="font-weight: bold;">${curName}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>${this.transloco.translate('common.description') || 'Descripción'}</th>
              <th class="text-center" style="width: 50px;">${this.transloco.translate('common.quantity') || 'Cant.'}</th>
              <th class="text-right" style="width: 100px;">${this.transloco.translate('common.unitPrice') || 'Precio Unit.'}</th>
              <th class="text-right" style="width: 90px;">${taxLabel}</th>
              <th class="text-right" style="width: 110px;">${this.transloco.translate('common.total') || 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.detalles || []).map((d, i) => `
              <tr>
                <td style="color: #94a3b8;">${i + 1}</td>
                <td><strong>${d.descripcion}</strong></td>
                <td class="text-center">${d.cantidad}</td>
                <td class="text-right" style="font-family: monospace;">${formatCurrency(d.precioUnitario)}</td>
                <td class="text-right" style="font-family: monospace;">${formatCurrency(d.itbis)}</td>
                <td class="text-right" style="font-family: monospace; font-weight: bold;">${formatCurrency(d.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>${this.transloco.translate('common.subtotal') || 'Subtotal'}:</span>
            <span style="font-family: monospace;">${formatCurrency(quote.subtotal)}</span>
          </div>
          ${(quote.descuento || 0) > 0 ? `
            <div class="totals-row" style="color: #059669;">
              <span>${this.transloco.translate('common.discount') || 'Descuento'}:</span>
              <span style="font-family: monospace;">-${formatCurrency(quote.descuento)}</span>
            </div>
          ` : ''}
          <div class="totals-row">
            <span>${taxLabel}:</span>
            <span style="font-family: monospace;">${formatCurrency(quote.itbis)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>${this.transloco.translate('common.total') || 'TOTAL'}:</span>
            <span style="font-family: monospace;">${formatCurrency(quote.total)}</span>
          </div>
        </div>

        ${quote.notas || quote.terminosCondiciones ? `
          <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-size: 11px;">
            ${quote.notas ? `<div><strong>Condiciones:</strong> ${quote.notas}</div>` : ''}
            ${quote.terminosCondiciones ? `<div style="margin-top: 4px;"><strong>Términos:</strong> ${quote.terminosCondiciones}</div>` : ''}
          </div>
        ` : ''}

        <div class="footer">
          ${this.escapeHtml(empresaNombre)} · Validez sujeta a confirmación comercial.
        </div>
      </body>
      </html>
    `;

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(html);
      frameDoc.close();

      const imagesReady = Array.from(frameDoc.images).map((img) => img.decode().catch(() => undefined));
      Promise.all(imagesReady).then(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      });
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  }
}
