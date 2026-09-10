import {
  ChangeDetectionStrategy,
  ElementRef,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FacturaVenta, InvoicesService } from '../../data/invoices.service';
import { AuthState } from '../../../../core/auth/auth.state';
import { CurrencyConfigService } from '../../../../core/currency/currency-config.service';

@Component({
  selector: 'app-invoice-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    TranslocoPipe,
  ],
  styles: [`
    @media print {
      .no-print { display: none !important; }
      .print-container { 
        box-shadow: none !important; 
        border: none !important; 
        padding: 0 !important; 
        margin: 0 !important; 
        background: white !important; 
      }
      body { 
        background: white !important; 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
      .invoice-sheet { 
        box-shadow: none !important; 
        border: none !important; 
        width: 100% !important; 
        max-width: 100% !important; 
        padding: 0 !important; 
        border-radius: 0 !important;
      }
      @page { size: letter portrait; margin: 1.2cm; }
    }
    .invoice-sheet {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `],
  template: `
    <div class="flex flex-col max-h-[96vh] w-full" style="min-width: min(calc(100vw - 32px), 860px)">

      <!-- Top Dialog Toolbar (no-print) -->
      <div class="no-print flex items-center justify-between px-6 py-3.5 border-b border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
            <mat-icon svgIcon="file-text" class="icon-size-4" />
          </div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-neutral-900 dark:text-white text-sm font-mono">{{ invoice.numeroFactura }}</span>
            @if (invoice.ncf) {
              <span class="text-xs font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-medium">
                {{ invoice.ncf }}
              </span>
            }
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider" [ngClass]="getStatusClass(invoice.estado)">
            {{ invoice.estado }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          @if (invoice.fiscalbridgeDocId) {
            <button
              type="button"
              (click)="downloadPdf()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              [matTooltip]="'fiscalPrint.download' | transloco"
            >
              <mat-icon svgIcon="download" class="icon-size-3.5" />
              <span>{{ 'fiscalPrint.title' | transloco }}</span>
            </button>
          }
          <button
            type="button"
            (click)="print()"
            [disabled]="printing()"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <mat-icon svgIcon="printer" class="icon-size-3.5" />
            <span>{{ 'commercial.invoices.print' | transloco }}</span>
          </button>
          <button
            type="button"
            (click)="dialogRef.close()"
            class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
          >
            <mat-icon svgIcon="x" class="icon-size-4" />
          </button>
        </div>
      </div>

      <!-- Scrollable Canvas Area -->
      <div class="overflow-y-auto flex-auto bg-neutral-100/90 dark:bg-neutral-950 p-4 sm:p-8 md:p-10 print-container">
        
        @if (invoice.fiscalbridgeStatus === 'FAILED') {
          <div class="no-print max-w-[760px] mx-auto mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 shadow-sm flex items-start gap-3.5 animate-in fade-in duration-200">
            <div class="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <mat-icon svgIcon="alert-triangle" class="icon-size-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  Rechazo de Facturación Electrónica (DGII / FiscalBridge)
                </span>
                <button
                  type="button"
                  (click)="retryFiscal()"
                  [disabled]="retrying()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <mat-icon [class.animate-spin]="retrying()" svgIcon="rotate-cw" class="icon-size-3.5" />
                  <span>{{ retrying() ? 'Reintentando...' : 'Reintentar Transmisión' }}</span>
                </button>
              </div>
              <p class="text-xs text-rose-700 dark:text-rose-300 mt-2 font-mono break-words bg-white/80 dark:bg-black/30 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30 select-text leading-relaxed">
                {{ invoice.fiscalbridgeError || 'Error no especificado devuelto por la API de FiscalBridge.' }}
              </p>
            </div>
          </div>
        }

        <!-- Modern Minimalist Invoice Sheet (Inspired by reference mockup) -->
        <div class="invoice-sheet max-w-[760px] mx-auto bg-white text-neutral-900 rounded-3xl shadow-xl border border-neutral-200/60 p-8 sm:p-12 md:p-14 space-y-8">

          <!-- 1. Header: Big Bold Title & Modern Monogram Logo -->
          <div class="flex items-start justify-between gap-4">
            <div>
              <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 uppercase">
                INVOICE
              </h1>
              <div class="text-xs sm:text-sm font-mono font-medium text-neutral-400 mt-1">
                #{{ invoice.numeroFactura }}
                @if (invoice.ncf) {
                  <span class="text-neutral-500 font-sans ml-1">· {{ invoice.ncf }}</span>
                }
              </div>
            </div>

            <!-- Sleek Modern Logo or Abstract Emblem -->
            <div class="shrink-0 pt-1">
              @if (currentEmpresa()?.logo) {
                <img [src]="currentEmpresa()?.logo" [alt]="currentEmpresa()?.razonSocial || 'Logo'" class="h-12 max-w-[140px] object-contain" />
              } @else {
                <!-- Modern geometric emblem inspired by mockup logo -->
                <div class="w-11 h-11 bg-neutral-900 rounded-2xl flex items-center justify-center text-white shadow-md">
                  <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M12 3L2 20h20L12 3zm0 4.5l6.2 10.5H5.8L12 7.5z" opacity="0.9" />
                    <circle cx="12" cy="14.5" r="2.2" />
                  </svg>
                </div>
              }
            </div>
          </div>

          <!-- 2. Clean 3-Column Metadata Grid (Issued/Due, Billed to, From) -->
          <div class="border-t border-neutral-200/80 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            
            <!-- Col 1: Dates -->
            <div class="space-y-4">
              <div>
                <span class="block font-bold text-neutral-900 text-xs tracking-tight">Issued</span>
                <span class="block text-neutral-600 mt-0.5 font-medium">
                  {{ invoice.fecha | date:'dd MMM, yyyy' }}
                </span>
              </div>
              <div>
                <span class="block font-bold text-neutral-900 text-xs tracking-tight">Due</span>
                <span class="block text-neutral-600 mt-0.5 font-medium">
                  {{ (invoice.fechaVencimiento || invoice.fecha) | date:'dd MMM, yyyy' }}
                </span>
              </div>
            </div>

            <!-- Col 2: Billed to -->
            <div class="space-y-1">
              <span class="block font-bold text-neutral-900 text-xs tracking-tight">Billed to</span>
              <span class="block font-bold text-neutral-800 text-xs pt-0.5">
                {{ invoice.cliente?.nombreRazonSocial || 'Consumidor Final' }}
              </span>
              @if (invoice.cliente?.direccion) {
                <span class="block text-neutral-500 leading-snug">{{ invoice.cliente.direccion }}</span>
              }
              @if (invoice.cliente?.numeroDocumento) {
                <span class="block text-neutral-500 font-mono">TAX ID {{ invoice.cliente.numeroDocumento }}</span>
              }
              @if (invoice.cliente?.telefono) {
                <span class="block text-neutral-500">{{ invoice.cliente.telefono }}</span>
              }
              @if (invoice.cliente?.email) {
                <span class="block text-neutral-500">{{ invoice.cliente.email }}</span>
              }
            </div>

            <!-- Col 3: From -->
            <div class="space-y-1">
              <span class="block font-bold text-neutral-900 text-xs tracking-tight">From</span>
              <span class="block font-bold text-neutral-800 text-xs pt-0.5">
                {{ currentEmpresa()?.razonSocial || 'Dolphin ERP' }}
              </span>
              @if (currentEmpresa()?.direccion) {
                <span class="block text-neutral-500 leading-snug">{{ currentEmpresa()?.direccion }}</span>
              }
              @if (invoice.sucursal?.nombre) {
                <span class="block text-neutral-500">{{ invoice.sucursal.nombre }}</span>
              }
              @if (currentEmpresa()?.rnc) {
                <span class="block text-neutral-500 font-mono">TAX ID {{ currentEmpresa()?.rnc }}</span>
              }
            </div>

          </div>

          <!-- 3. Minimalist Line Items Table -->
          <div class="pt-2">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-neutral-200/80 text-neutral-900">
                  <th class="py-3 text-left font-bold w-1/2">Service</th>
                  <th class="py-3 text-center font-bold w-16">Qty</th>
                  <th class="py-3 text-right font-bold w-28">Rate</th>
                  <th class="py-3 text-right font-bold w-28">Line total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100">
                @for (det of invoice.detalles; track det.id) {
                  <tr>
                    <td class="py-4 pr-3 align-top">
                      <div class="font-semibold text-neutral-900 text-xs sm:text-sm">
                        {{ det.producto?.nombre || det.productoId }}
                      </div>
                      <div class="text-[11px] text-neutral-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        @if (det.producto?.codigo) {
                          <span>Cód: {{ det.producto.codigo }}</span>
                        }
                        @if (det.descuento && det.descuento > 0) {
                          <span class="text-emerald-600 font-medium">
                            • Desc: -{{ getCurrencySymbol(invoice.moneda) }} {{ det.descuento | number:'1.2-2' }}
                            @if (det.promocionNombre) {
                              ({{ det.promocionNombre }})
                            }
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-4 px-2 text-center font-mono text-neutral-600 align-top">
                      {{ det.cantidad | number:'1.0-2' }}
                    </td>
                    <td class="py-4 px-2 text-right font-mono text-neutral-600 align-top">
                      {{ getCurrencySymbol(invoice.moneda) }} {{ det.precioUnitario | number:'1.2-2' }}
                    </td>
                    <td class="py-4 pl-2 text-right font-mono font-semibold text-neutral-900 align-top text-xs sm:text-sm">
                      {{ getCurrencySymbol(invoice.moneda) }} {{ det.total | number:'1.2-2' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- 4. Financial Totals Section with Iconic Purple 'Amount due' Underline -->
          <div class="flex justify-end pt-2">
            <div class="w-full sm:w-72 space-y-2.5 text-xs">
              <div class="flex justify-between text-neutral-900 py-1">
                <span class="font-bold">Subtotal</span>
                <span class="font-mono text-neutral-700">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.subtotal | number:'1.2-2' }}</span>
              </div>

              <div class="flex justify-between text-neutral-900 py-1 border-t border-neutral-100">
                <span class="font-bold">{{ getTaxLabel(invoice) }}</span>
                <span class="font-mono text-neutral-700">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.itbis | number:'1.2-2' }}</span>
              </div>

              @if (invoice.descuento > 0) {
                <div class="flex justify-between text-emerald-600 py-1 border-t border-neutral-100 font-medium">
                  <span class="font-bold">Discount</span>
                  <span class="font-mono">-{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.descuento | number:'1.2-2' }}</span>
                </div>
              }

              <div class="flex justify-between text-neutral-900 py-1 border-t border-neutral-200/80">
                <span class="font-bold">Total</span>
                <span class="font-mono font-bold">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.total | number:'1.2-2' }}</span>
              </div>

              <!-- Accent Underlined Amount Due (Exactly as shown in reference design) -->
              <div class="flex justify-between items-baseline pt-2.5 border-b-2 border-indigo-600 pb-1.5 text-indigo-600">
                <span class="font-bold text-sm tracking-tight">Amount due</span>
                <span class="font-mono font-black text-sm sm:text-base">
                  {{ getCurrencySymbol(invoice.moneda) }} {{ (invoice.balancePendiente !== undefined && invoice.balancePendiente !== null ? invoice.balancePendiente : invoice.total) | number:'1.2-2' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 5. Thank You Card and Clean Bottom Info Strip -->
          <div class="pt-6 space-y-8">
            
            <!-- Thank you message -->
            <div class="space-y-1.5">
              <div class="font-bold text-neutral-900 text-xs">
                Thank you for the business!
              </div>
              <div class="flex items-center gap-2 text-[11px] text-neutral-500">
                <div class="w-3.5 h-3.5 rounded bg-neutral-100 border border-neutral-300 flex items-center justify-center text-[9px] font-bold text-neutral-500 shrink-0">
                  i
                </div>
                <span>
                  {{ invoice.notas || 'Please pay within 15 days of receiving this invoice.' }}
                </span>
              </div>
            </div>

            <!-- 3-Item Bottom Footer Strip -->
            <div class="border-t border-neutral-200/80 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-neutral-400 font-medium">
              <div>
                {{ currentEmpresa()?.razonSocial || 'Digital Product Designer, IN' }}
              </div>
              <div>
                {{ currentEmpresa()?.telefono || '+1 (809) 000-0000' }}
              </div>
              <div>
                {{ currentEmpresa()?.email || 'hello@email.com' }}
              </div>
            </div>

          </div>

          <!-- 6. DGII e-CF Compliance Accordion / Footer (Discreet, Modern, Print-Friendly) -->
          @if (invoice.ncf || invoice.fiscalbridgeDocId || invoice.fiscalbridgeQrUrl) {
            <div class="border-t border-neutral-100 pt-6 mt-4">
              <div class="flex items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50/80 border border-neutral-100 text-[11px]">
                <div class="flex items-center gap-3.5">
                  @if (invoice.fiscalbridgeQrUrl) {
                    <img [src]="invoice.fiscalbridgeQrUrl" alt="QR DGII" class="w-14 h-14 rounded-lg border border-neutral-200 bg-white p-0.5 shrink-0" />
                  } @else {
                    <div class="w-14 h-14 rounded-lg border border-neutral-200 bg-white flex flex-col items-center justify-center text-neutral-400 shrink-0">
                      <mat-icon svgIcon="qr-code" class="icon-size-6" />
                      <span class="text-[8px] font-mono mt-0.5">e-CF</span>
                    </div>
                  }
                  <div class="space-y-0.5 text-neutral-600 font-mono leading-tight">
                    <div class="font-bold text-neutral-800 font-sans">{{ getTipoNcfTitulo(invoice.tipoNcf) }}</div>
                    <div>NCF: <strong class="text-neutral-900">{{ invoice.ncf }}</strong></div>
                    @if (invoice.fiscalbridgeSecurityCode) {
                      <div>Cód. Seguridad: {{ invoice.fiscalbridgeSecurityCode }}</div>
                    }
                    @if (invoice.fiscalbridgeSignDate) {
                      <div>Firma: {{ invoice.fiscalbridgeSignDate | date:'dd/MM/yyyy HH:mm' }}</div>
                    }
                  </div>
                </div>

                <div class="text-right hidden sm:block text-[10px] text-neutral-400">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                    {{ invoice.fiscalbridgeStatus || invoice.estado }}
                  </span>
                  <div class="mt-1">Dolphin ERP DGII FiscalBridge</div>
                </div>
              </div>
            </div>
          }

        </div>

      </div>

    </div>
  `,
})
export class InvoicePreviewComponent {
  private readonly initialInvoice: FacturaVenta = inject(MAT_DIALOG_DATA);
  readonly currentInvoice = signal<FacturaVenta>(this.initialInvoice);
  readonly retrying = signal<boolean>(false);
  readonly dialogRef = inject(MatDialogRef<InvoicePreviewComponent>);
  private readonly invoicesService = inject(InvoicesService);
  private readonly authState = inject(AuthState);
  private readonly snackBar = inject(MatSnackBar);
  readonly currencyConfig = inject(CurrencyConfigService);
  readonly now = new Date();

  get invoice(): FacturaVenta {
    return this.currentInvoice();
  }

  retryFiscal() {
    this.retrying.set(true);
    const id = this.invoice.id;
    this.invoicesService.retryFiscal(id).subscribe({
      next: (updated) => {
        this.retrying.set(false);
        this.currentInvoice.set(updated);
        this.snackBar.open('Factura transmitida a FiscalBridge con éxito', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.retrying.set(false);
        const errorMsg = err.error?.message || 'Error al reintentar transmisión';
        this.invoicesService.findOne(id).subscribe({
          next: (fresh) => {
            if (fresh) this.currentInvoice.set(fresh);
          },
        });
        this.snackBar.open(errorMsg, 'Cerrar', { duration: 6000 });
      },
    });
  }

  readonly currentEmpresa = computed(() => {
    const user = this.authState.user() as any;
    const empId = this.authState.empresaId();
    if (!user?.empresas || user.empresas.length === 0) return null;
    return user.empresas.find((e: any) => e.id === empId) || user.empresas[0];
  });

  readonly printing = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly transloco = inject(TranslocoService);

  print() {
    if (this.printing()) return;
    const electronic = (this.invoice.tipoNcf || this.invoice.ncf || '').toUpperCase().startsWith('E');
    if (electronic && !this.invoice.fiscalbridgeDocId) {
      this.printError('fiscalPrint.pending');
      return;
    }
    this.printing.set(true);
    if (electronic) {
      this.invoicesService.getPdf(this.invoice.id).subscribe({
        next: blob => {
          const url = URL.createObjectURL(blob);
          this.printFrame(url, undefined, () => URL.revokeObjectURL(url));
        },
        error: () => { this.printing.set(false); this.printError('fiscalPrint.error'); },
      });
      return;
    }
    const sheet = this.host.nativeElement.querySelector('.invoice-sheet');
    if (!sheet) { this.printing.set(false); return; }
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML).join('');
    this.printFrame(undefined, '<!doctype html><html><head>' + styles +
      '<style>@page{size:letter;margin:1.2cm}body{background:white;color:#111827}.no-print{display:none!important}.invoice-sheet{box-shadow:none!important;max-width:100%!important}</style></head><body>' +
      sheet.outerHTML + '</body></html>');
  }

  private printError(key: string) {
    this.snackBar.open(this.transloco.translate(key), this.transloco.translate('common.close'), {
      duration: 6000, horizontalPosition: 'center', verticalPosition: 'bottom',
    });
  }

  private printFrame(src?: string, html?: string, release: () => void = () => {}) {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:816px;height:1056px;border:0';
    frame.title = this.transloco.translate('fiscalPrint.title');
    let cleaned = false;
    const cleanup = () => { if (cleaned) return; cleaned = true; frame.remove(); release(); this.printing.set(false); };
    const timer = setTimeout(cleanup, 120_000);
    frame.onload = async () => {
      try {
        if (html) {
          await frame.contentDocument?.fonts.ready;
          await Promise.all(Array.from(frame.contentDocument?.images || []).map(img =>
            img.complete ? Promise.resolve() : new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); })));
        }
        frame.contentWindow?.addEventListener('afterprint', () => { clearTimeout(timer); cleanup(); }, { once: true });
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        this.printing.set(false);
      } catch { cleanup(); this.printError('fiscalPrint.error'); }
    };
    if (src) frame.src = src;
    else frame.srcdoc = html || '';
    document.body.appendChild(frame);
  }

  getCurrencySymbol(code?: string | null): string {
    const c = code || this.currencyConfig.currency();
    return c === 'USD' ? '$' : c === 'EUR' ? '€' : 'RD$';
  }

  getTaxLabel(invoice: FacturaVenta): string {
    const rates = Array.from(new Set((invoice.detalles || []).map((d: any) => Number(d.tasaItbis || 0)).filter((r: number) => r > 0)));
    if (rates.length === 1) return `Tax (${rates[0]}%)`;
    if (rates.length > 1) return `Tax (${rates.join(', ')}%)`;
    return `Tax (${this.currencyConfig.defaultTaxRate()}%)`;
  }

  getTipoNcfTitulo(tipo?: string | null): string {
    if (!tipo) return 'Factura de Venta';
    const map: Record<string, string> = {
      E31: 'Factura de Crédito Fiscal Electrónica (e-CF 31)',
      E32: 'Factura de Consumo Electrónica (e-CF 32)',
      E33: 'Nota de Débito Electrónica (e-CF 33)',
      E34: 'Nota de Crédito Electrónica (e-CF 34)',
      E41: 'Comprobante de Compras Electrónico (e-CF 41)',
      E43: 'Gastos Menores Electrónico (e-CF 43)',
      E44: 'Regímenes Especiales Electrónico (e-CF 44)',
      E45: 'Comprobante Gubernamental Electrónico (e-CF 45)',
      B01: 'Factura de Crédito Fiscal (B01)',
      B02: 'Factura de Consumo (B02)',
      B04: 'Nota de Crédito (B04)',
      B14: 'Regímenes Especiales (B14)',
      B15: 'Comprobante Gubernamental (B15)',
    };
    return map[tipo] || `Factura (${tipo})`;
  }

  downloadPdf() {
    this.invoicesService.downloadPdf(this.invoice.id, `${this.invoice.numeroFactura}.pdf`);
  }

  getStatusClass(estado: string): string {
    const map: Record<string, string> = {
      EMITIDA: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      PAGADA: 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
      ANULADA: 'bg-rose-50 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
      BORRADOR: 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    };
    return map[estado] ?? 'bg-neutral-100 text-neutral-700';
  }
}
export default InvoicePreviewComponent;
