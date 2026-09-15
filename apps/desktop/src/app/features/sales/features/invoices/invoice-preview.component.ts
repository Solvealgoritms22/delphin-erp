import {
  ChangeDetectionStrategy,
  ElementRef,
  Component,
  computed,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FacturaVenta, InvoicesService } from '../../data/invoices.service';
import { AuthState } from '../../../../core/auth/auth.state';
import { CurrencyConfigService } from '../../../../core/currency/currency-config.service';
import { environment } from '@/environments/environment';

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
    <div class="flex flex-col h-full w-full min-w-0 bg-white dark:bg-neutral-900 overflow-hidden">

      <!-- Top Dialog Toolbar (no-print) -->
      <div class="no-print flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <mat-icon svgIcon="file-text" class="icon-size-5" />
          </div>
          <div>
            <h2 class="text-base font-bold text-neutral-900 dark:text-white">
              {{ 'commercial.invoices.preview.title' | transloco: { number: invoice.numeroFactura } }}
            </h2>
            <p class="text-xs text-neutral-500">
              {{ 'commercial.invoices.preview.subtitle' | transloco }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
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
      <div class="overflow-y-auto flex-auto bg-neutral-100/50 dark:bg-neutral-950 p-4 sm:p-6 md:p-8 print-container">
        
        @if (invoice.fiscalbridgeStatus === 'FAILED') {
          <div class="no-print max-w-[760px] mx-auto mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-sm flex items-start gap-3.5 animate-in fade-in duration-200">
            <div class="w-9 h-9 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <mat-icon svgIcon="alert-triangle" class="icon-size-4" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <span class="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                  {{ 'commercial.invoices.preview.fiscalErrorTitle' | transloco }}
                </span>
                <button
                  type="button"
                  (click)="retryFiscal()"
                  [disabled]="retrying()"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <mat-icon [class.animate-spin]="retrying()" svgIcon="rotate-cw" class="icon-size-3.5" />
                  <span>{{ retrying() ? ('commercial.invoices.preview.retrying' | transloco) : ('commercial.invoices.preview.retry' | transloco) }}</span>
                </button>
              </div>
              <p class="text-xs text-rose-700 dark:text-rose-300 mt-2 font-mono break-words bg-white/80 dark:bg-black/30 p-2.5 rounded-lg border border-rose-100 dark:border-rose-900/30 select-text leading-relaxed">
                {{ invoice.fiscalbridgeError || 'Error no especificado devuelto por la API de FiscalBridge.' }}
              </p>
            </div>
          </div>
        }

        <!-- Modern Minimalist Invoice Sheet with moderate rounded corners -->
        <div class="invoice-sheet max-w-[760px] mx-auto bg-white text-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 sm:p-10 md:p-12 space-y-8 shadow-sm">

          <!-- 1. Header: Big Bold Title & Company Logo / Initials -->
          <div class="flex items-start justify-between gap-6 border-b border-neutral-200/80 pb-6">
            <div>
              <h1 class="text-3xl sm:text-4xl font-black tracking-tight text-neutral-900 uppercase">
                {{ 'commercial.invoices.preview.invoiceDoc' | transloco }}
              </h1>
              <div class="text-xs sm:text-sm font-mono font-medium text-neutral-400 mt-1">
                #{{ invoice.numeroFactura }}
                @if (invoice.ncf) {
                  <span class="text-neutral-500 font-sans ml-1">· {{ invoice.ncf }}</span>
                }
              </div>
            </div>

            <!-- Company Logo or Initials -->
            <div class="shrink-0">
              @if (empresaLogo() && !logoFailed()) {
                <div class="max-h-16 max-w-56 flex items-center justify-end">
                  <img
                    [src]="empresaLogo()"
                    [alt]="empresaNombre()"
                    (error)="logoFailed.set(true)"
                    class="max-h-16 max-w-56 object-contain object-right"
                  />
                </div>
              } @else {
                <!-- Iniciales elegantes de la empresa -->
                <div class="size-14 rounded-xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs select-none">
                  {{ empresaIniciales() }}
                </div>
              }
            </div>
          </div>

          <!-- 2. Clean 3-Column Metadata Grid (Issued/Due, Billed to, From) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs bg-neutral-50 p-4 border border-neutral-200/60 rounded-xl">
            
            <!-- Col 1: Dates -->
            <div class="space-y-4">
              <div>
                <span class="block font-bold text-neutral-900 text-xs tracking-tight">{{ 'commercial.invoices.preview.issued' | transloco }}</span>
                <span class="block text-neutral-600 mt-0.5 font-medium">
                  {{ invoice.fecha | date:'dd MMM, yyyy' }}
                </span>
              </div>
              <div>
                <span class="block font-bold text-neutral-900 text-xs tracking-tight">{{ 'commercial.invoices.preview.due' | transloco }}</span>
                <span class="block text-neutral-600 mt-0.5 font-medium">
                  {{ (invoice.fechaVencimiento || invoice.fecha) | date:'dd MMM, yyyy' }}
                </span>
              </div>
            </div>

            <!-- Col 2: Billed to -->
            <div class="space-y-1">
              <span class="block font-bold text-neutral-900 text-xs tracking-tight">{{ 'commercial.invoices.preview.billedTo' | transloco }}</span>
              <span class="block font-bold text-neutral-800 text-xs pt-0.5">
                {{ invoice.cliente?.nombreRazonSocial || ('commercial.invoices.finalConsumer' | transloco) }}
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
              <span class="block font-bold text-neutral-900 text-xs tracking-tight">{{ 'commercial.invoices.preview.from' | transloco }}</span>
              <span class="block font-bold text-neutral-800 text-xs pt-0.5">
                {{ empresaNombre() }}
              </span>
              @if (empresaDireccion()) {
                <span class="block text-neutral-500 leading-snug">{{ empresaDireccion() }}</span>
              }
              @if (invoice.sucursal?.nombre) {
                <span class="block text-neutral-500">{{ invoice.sucursal.nombre }}</span>
              }
              @if (empresaRnc()) {
                <span class="block text-neutral-500 font-mono">{{ empresaRnc() }}</span>
              }
            </div>

          </div>

          <!-- 3. Minimalist Line Items Table -->
          <div class="pt-2">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-neutral-200/80 text-neutral-900 bg-neutral-50">
                  <th class="py-3 px-3 text-left font-bold w-1/2">{{ 'commercial.invoices.preview.productService' | transloco }}</th>
                  <th class="py-3 px-2 text-center font-bold w-16">{{ 'commercial.invoices.preview.qty' | transloco }}</th>
                  <th class="py-3 px-2 text-right font-bold w-28">{{ 'commercial.invoices.preview.rate' | transloco }}</th>
                  <th class="py-3 px-3 text-right font-bold w-28">{{ 'commercial.invoices.preview.lineTotal' | transloco }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100">
                @for (det of invoice.detalles; track det.id) {
                  <tr>
                    <td class="py-3.5 px-3 align-top">
                      <div class="font-semibold text-neutral-900 text-xs sm:text-sm">
                        {{ det.producto?.nombre || det.productoId }}
                      </div>
                      <div class="text-[11px] text-neutral-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                        @if (det.producto?.codigo) {
                          <span>Cód: {{ det.producto.codigo }}</span>
                        }
                        @if (det.descuento && det.descuento > 0) {
                          <span class="text-emerald-600 font-medium">
                            • {{ 'commercial.invoices.preview.discount' | transloco }}: -{{ getCurrencySymbol(invoice.moneda) }} {{ det.descuento | number:'1.2-2' }}
                            @if (det.promocionNombre) {
                              ({{ det.promocionNombre }})
                            }
                          </span>
                        }
                      </div>
                    </td>
                    <td class="py-3.5 px-2 text-center font-mono text-neutral-600 align-top">
                      {{ det.cantidad | number:'1.0-2' }}
                    </td>
                    <td class="py-3.5 px-2 text-right font-mono text-neutral-600 align-top">
                      {{ getCurrencySymbol(invoice.moneda) }} {{ det.precioUnitario | number:'1.2-2' }}
                    </td>
                    <td class="py-3.5 px-3 text-right font-mono font-semibold text-neutral-900 align-top text-xs sm:text-sm">
                      {{ getCurrencySymbol(invoice.moneda) }} {{ det.total | number:'1.2-2' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- 4. Financial Totals Section -->
          <div class="flex justify-end pt-2">
            <div class="w-full sm:w-72 space-y-2.5 text-xs">
              <div class="flex justify-between text-neutral-900 py-1">
                <span class="font-bold">{{ 'commercial.invoices.preview.subtotal' | transloco }}</span>
                <span class="font-mono text-neutral-700">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.subtotal | number:'1.2-2' }}</span>
              </div>

              <div class="flex justify-between text-neutral-900 py-1 border-t border-neutral-100">
                <span class="font-bold">{{ getTaxLabel(invoice) }}</span>
                <span class="font-mono text-neutral-700">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.itbis | number:'1.2-2' }}</span>
              </div>

              @if (invoice.descuento > 0) {
                <div class="flex justify-between text-emerald-600 py-1 border-t border-neutral-100 font-medium">
                  <span class="font-bold">{{ 'commercial.invoices.preview.discount' | transloco }}</span>
                  <span class="font-mono">-{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.descuento | number:'1.2-2' }}</span>
                </div>
              }

              <div class="flex justify-between text-neutral-900 py-1 border-t border-neutral-200/80">
                <span class="font-bold">{{ 'commercial.invoices.preview.total' | transloco }}</span>
                <span class="font-mono font-bold">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.total | number:'1.2-2' }}</span>
              </div>

              <!-- Accent Underlined Amount Due -->
              <div class="flex justify-between items-baseline pt-2.5 border-b-2 border-indigo-600 pb-1.5 text-indigo-600">
                <span class="font-bold text-sm tracking-tight">{{ 'commercial.invoices.preview.amountDue' | transloco }}</span>
                <span class="font-mono font-black text-sm sm:text-base">
                  {{ getCurrencySymbol(invoice.moneda) }} {{ (invoice.balancePendiente !== undefined && invoice.balancePendiente !== null ? invoice.balancePendiente : invoice.total) | number:'1.2-2' }}
                </span>
              </div>
            </div>
          </div>

          <!-- 5. Thank You Card and Clean Bottom Info Strip -->
          <div class="pt-6 space-y-6">
            
            <!-- Thank you message -->
            <div class="space-y-1.5">
              <div class="font-bold text-neutral-900 text-xs">
                {{ 'commercial.invoices.preview.thankYou' | transloco }}
              </div>
              <div class="flex items-center gap-2 text-[11px] text-neutral-500">
                <div class="w-3.5 h-3.5 rounded bg-neutral-100 border border-neutral-300 flex items-center justify-center text-[9px] font-bold text-neutral-500 shrink-0">
                  i
                </div>
                <span>
                  {{ invoice.notas || ('commercial.invoices.preview.defaultNote' | transloco) }}
                </span>
              </div>
            </div>

            <!-- 3-Item Bottom Footer Strip -->
            <div class="border-t border-neutral-200/80 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-neutral-400 font-medium">
              <div>
                {{ empresaNombre() }}
              </div>
              <div>
                {{ empresaTelefono() || '+1 (809) 000-0000' }}
              </div>
              <div>
                {{ empresaEmail() || 'info@empresa.com' }}
              </div>
            </div>

          </div>

          <!-- 6. DGII e-CF Compliance Accordion / Footer -->
          @if (invoice.ncf || invoice.fiscalbridgeDocId || invoice.fiscalbridgeQrUrl) {
            <div class="border-t border-neutral-100 pt-6 mt-4">
              <div class="flex items-center justify-between gap-4 p-4 bg-neutral-50/80 border border-neutral-200 rounded-xl text-[11px]">
                <div class="flex items-center gap-3.5">
                  @if (invoice.fiscalbridgeQrUrl) {
                    <img [src]="invoice.fiscalbridgeQrUrl" alt="QR DGII" class="size-14 rounded-xl border border-neutral-200 bg-white p-1 object-contain shrink-0" />
                  } @else {
                    <div class="size-14 rounded-xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-400 shrink-0 shadow-2xs">
                      <mat-icon svgIcon="qr-code" class="icon-size-10 text-neutral-400" />
                    </div>
                  }
                  <div class="space-y-0.5 text-neutral-600 font-mono leading-tight">
                    <div class="font-bold text-neutral-800 font-sans">{{ getTipoNcfTitulo(invoice.tipoNcf) }}</div>
                    <div>NCF: <strong class="text-neutral-900">{{ invoice.ncf }}</strong></div>
                    @if (invoice.fiscalbridgeSecurityCode) {
                      <div>{{ 'commercial.invoices.preview.securityCode' | transloco }}: {{ invoice.fiscalbridgeSecurityCode }}</div>
                    }
                    @if (invoice.fiscalbridgeSignDate) {
                      <div>{{ 'commercial.invoices.preview.signDate' | transloco }}: {{ invoice.fiscalbridgeSignDate | date:'dd/MM/yyyy HH:mm' }}</div>
                    }
                  </div>
                </div>

                <div class="text-right hidden sm:block text-[10px] text-neutral-400">
                  <span class="inline-flex items-center px-2.5 py-1 text-xs font-bold rounded-lg border tracking-wide uppercase shadow-2xs"
                    [ngClass]="getFiscalStatusBadgeClass(invoice)">
                    {{ getFiscalStatusLabel(invoice) }}
                  </span>
                  <div class="mt-1 text-[11px] font-medium text-neutral-400">Dolphin ERP DGII FiscalBridge</div>
                </div>
              </div>
            </div>
          }

        </div>

      </div>

      <!-- Modal Footer (Bottom Toolbar - no-print) -->
      <div class="no-print flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <button
          type="button"
          (click)="dialogRef.close()"
          class="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          {{ 'commercial.invoices.preview.close' | transloco }}
        </button>
        @if (invoice.fiscalbridgeDocId) {
          <button
            type="button"
            (click)="downloadPdf()"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
          >
            <mat-icon svgIcon="download" class="icon-size-4" />
            <span>{{ 'commercial.invoices.preview.downloadEcf' | transloco }}</span>
          </button>
        }
        <button
          type="button"
          (click)="print()"
          [disabled]="printing()"
          class="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <mat-icon svgIcon="printer" class="icon-size-4" />
          <span>{{ 'commercial.invoices.preview.print' | transloco }}</span>
        </button>
      </div>

    </div>
  `,
})
export class InvoicePreviewComponent implements OnInit {
  private readonly initialInvoice: FacturaVenta = inject(MAT_DIALOG_DATA);
  readonly currentInvoice = signal<FacturaVenta>(this.initialInvoice);
  readonly retrying = signal<boolean>(false);
  readonly dialogRef = inject(MatDialogRef<InvoicePreviewComponent>);
  private readonly invoicesService = inject(InvoicesService);
  private readonly authState = inject(AuthState);
  private readonly snackBar = inject(MatSnackBar);
  private readonly http = inject(HttpClient);
  readonly currencyConfig = inject(CurrencyConfigService);
  readonly now = new Date();

  readonly liveEmpresa = signal<any>(null);
  readonly logoFailed = signal<boolean>(false);

  ngOnInit(): void {
    this.loadEmpresaInfo();
  }

  private loadEmpresaInfo(): void {
    if ((this.invoice as any)?.empresa) {
      this.liveEmpresa.set((this.invoice as any).empresa);
      return;
    }

    this.http.get<any>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (emp) => {
        if (emp) this.liveEmpresa.set(emp);
      },
      error: () => {
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
        } catch {}
      }
    });
  }

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
    if (this.liveEmpresa()) return this.liveEmpresa();

    const user = this.authState.user() as any;
    const empId = this.invoice.empresaId || this.authState.empresaId();
    if (user?.empresas && user.empresas.length > 0) {
      return user.empresas.find((e: any) => e.id === empId) || user.empresas[0];
    }

    try {
      const cached = localStorage.getItem('cached_my_empresas');
      if (cached) {
        const list = JSON.parse(cached);
        if (Array.isArray(list) && list.length > 0) {
          return list.find((e: any) => e.id === empId) || list[0];
        }
      }
    } catch {}

    return null;
  });

  readonly empresaNombre = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.razonSocial || emp?.nombre || 'Delphin ERP';
  });

  readonly empresaLogo = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.logo || null;
  });

  readonly empresaRnc = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.rnc ? `TAX ID ${emp.rnc}` : '';
  });

  readonly empresaTelefono = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.telefono || '';
  });

  readonly empresaDireccion = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.direccion || '';
  });

  readonly empresaEmail = computed(() => {
    const emp = this.currentEmpresa();
    return emp?.email || '';
  });

  readonly empresaIniciales = computed(() => {
    const nombre = this.empresaNombre();
    if (!nombre || nombre === 'Delphin ERP') return 'DE';
    const words = nombre.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  });

  readonly printing = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly transloco = inject(TranslocoService);

  print() {
    if (this.printing()) return;
    this.printing.set(true);
    this.invoicesService.getPdf(this.invoice.id).subscribe({
      next: (blob: Blob) => {
        this.printing.set(false);
        this.printBlob(blob);
      },
      error: () => {
        this.printing.set(false);
        this.nativePrint();
      },
    });
  }

  downloadPdf() {
    this.invoicesService.downloadPdf(
      this.invoice.id,
      `Factura_${this.invoice.numeroFactura || this.invoice.ncf || this.invoice.id}.pdf`
    );
  }

  private printBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Error printing PDF:', err);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 60000);
      }
    };
  }

  private nativePrint() {
    window.print();
  }

  private printError(key: string) {
    this.snackBar.open(this.transloco.translate(key), this.transloco.translate('common.close'), { duration: 4000 });
  }

  getCurrencySymbol(code?: string): string {
    const c = code || this.currencyConfig.currency();
    return c === 'USD' ? 'USD $' : c === 'EUR' ? '€' : 'RD$';
  }

  getTaxLabel(inv: FacturaVenta): string {
    const firstRate = inv.detalles?.find(d => Number(d.tasaItbis) > 0)?.tasaItbis;
    const rate = firstRate !== undefined ? Number(firstRate) : this.currencyConfig.defaultTaxRate();
    return `${this.currencyConfig.defaultTaxName()} (${rate}%)`;
  }

  getFiscalStatusLabel(inv: FacturaVenta): string {
    const status = (inv.fiscalbridgeStatus || inv.estado || '').toUpperCase();
    switch (status) {
      case 'NOT_TRANSMITTED':
      case 'NO_TRANSMITIDO':
      case 'BORRADOR':
        return 'No Transmitido';
      case 'PENDING':
      case 'PENDIENTE':
      case 'IN_PROGRESS':
        return 'Pendiente';
      case 'ACCEPTED':
      case 'VALIDATED':
      case 'APROBADO':
      case 'EMITIDA':
      case 'PAGADA':
        return 'Validado DGII';
      case 'FAILED':
      case 'REJECTED':
      case 'ERROR':
        return 'Rechazado';
      default:
        return status.replace(/_/g, ' ');
    }
  }

  getFiscalStatusBadgeClass(inv: FacturaVenta): string {
    const status = (inv.fiscalbridgeStatus || inv.estado || '').toUpperCase();
    switch (status) {
      case 'NOT_TRANSMITTED':
      case 'NO_TRANSMITIDO':
      case 'BORRADOR':
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700';
      case 'PENDING':
      case 'PENDIENTE':
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'ACCEPTED':
      case 'VALIDATED':
      case 'APROBADO':
      case 'EMITIDA':
      case 'PAGADA':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'FAILED':
      case 'REJECTED':
      case 'ERROR':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700';
    }
  }

  getStatusClass(estado: string): string {
    switch (estado) {
      case 'PAGADA':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'PENDIENTE':
      case 'EMITIDA':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
      case 'VENCIDA':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
      case 'ANULADA':
        return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400';
      default:
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
    }
  }

  getTipoNcfTitulo(tipo?: string): string {
    switch (tipo) {
      case 'E31':
      case 'B01':
        return 'Factura de Crédito Fiscal';
      case 'E32':
      case 'B02':
        return 'Factura de Consumo';
      case 'E33':
      case 'B03':
        return 'Nota de Débito';
      case 'E34':
      case 'B04':
        return 'Nota de Crédito';
      case 'E44':
      case 'B14':
        return 'Regímenes Especiales';
      case 'E45':
      case 'B15':
        return 'Comprobante Gubernamental';
      default:
        return 'Comprobante Fiscal';
    }
  }
}
export default InvoicePreviewComponent;
