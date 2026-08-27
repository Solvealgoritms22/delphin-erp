import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe } from '@jsverse/transloco';
import { FacturaVenta, InvoicesService } from '../../data/invoices.service';
import { AuthState } from '../../../../core/auth/auth.state';

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
      .print-container { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; background: white !important; }
      body { background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .invoice-sheet { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; padding: 0 !important; }
      @page { size: letter portrait; margin: 1cm; }
    }
    .invoice-sheet {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  `],
  template: `
    <div class="flex flex-col max-h-[95vh] w-full" style="min-width: min(calc(100vw - 32px), 820px)">

      <!-- Toolbar (no-print) -->
      <div class="no-print flex items-center justify-between px-6 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shrink-0">
        <div class="flex items-center gap-3">
          <mat-icon svgIcon="file-text" class="icon-size-5 text-blue-600" />
          <div>
            <span class="font-bold text-neutral-900 dark:text-white text-sm">{{ invoice.numeroFactura }}</span>
            <span class="ml-2 text-xs font-mono text-blue-600 dark:text-blue-400 font-semibold">{{ invoice.ncf || 'Sin NCF' }}</span>
          </div>
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider" [ngClass]="getStatusClass(invoice.estado)">
            {{ invoice.estado }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          @if (invoice.fiscalbridgeDocId) {
            <button mat-stroked-button (click)="downloadPdf()" class="!rounded-xl !text-xs" matTooltip="Descargar PDF certificado DGII">
              <mat-icon svgIcon="download" class="icon-size-4" /> PDF DGII
            </button>
          }
          <button mat-flat-button (click)="print()" class="bg-blue-600 hover:bg-blue-700 text-white !rounded-xl !text-xs">
            <mat-icon svgIcon="printer" class="icon-size-4" />
            {{ 'commercial.invoices.print' | transloco }}
          </button>
          <button mat-icon-button (click)="dialogRef.close()" class="!rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-white">
            <mat-icon svgIcon="x" class="icon-size-4" />
          </button>
        </div>
      </div>

      <!-- Scrollable invoice body container -->
      <div class="overflow-y-auto flex-auto bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-8 print-container">
        
        <!-- Hoja de Factura estructurada estilo oficial -->
        <div class="invoice-sheet max-w-[740px] mx-auto bg-white text-neutral-900 rounded-xl shadow-lg border border-neutral-200/80 p-8 space-y-6">

          <!-- 1. ENCABEZADO (Empresa a la izquierda | Metadatos Fiscales a la derecha) -->
          <div class="flex items-start justify-between gap-6 pb-4">
            
            <!-- Empresa Emisora -->
            <div class="space-y-1 max-w-[340px]">
              <div class="flex items-center gap-2.5">
                <div class="size-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <mat-icon svgIcon="briefcase" class="icon-size-5" />
                </div>
                <div class="text-xl font-black tracking-tight text-neutral-950 uppercase leading-none">
                  {{ currentEmpresa()?.razonSocial || invoice.sucursal?.nombre || 'Dolphin ERP' }}
                </div>
              </div>
              
              <div class="text-xs text-neutral-600 space-y-0.5 pt-1">
                @if (currentEmpresa()?.rnc) {
                  <div class="font-mono font-bold text-neutral-800">RNC: {{ currentEmpresa()?.rnc }}</div>
                }
                @if (currentEmpresa()?.direccion) {
                  <div>{{ currentEmpresa()?.direccion }}</div>
                }
                <div class="text-neutral-500">Punto Emisión e-NCF : {{ invoice.sucursal?.nombre || 'Facturación Central' }}</div>
                <div><span class="text-neutral-500">Fecha Emisión Factura:</span> <strong class="font-semibold">{{ invoice.fecha | date:'dd-MMM-yyyy' }}</strong></div>
              </div>
            </div>

            <!-- Metadatos de la Factura y Comprobante Fiscal -->
            <div class="text-right space-y-1 text-xs">
              <div class="text-sm font-black uppercase text-neutral-900 tracking-tight">
                {{ getTipoNcfTitulo(invoice.tipoNcf) }}
              </div>
              <div class="text-base font-black font-mono text-blue-700">
                <span class="text-neutral-500 font-sans font-semibold text-xs">{{ invoice.tipoNcf && invoice.tipoNcf.startsWith('E') ? 'e-NCF: ' : 'NCF: ' }}</span>
                {{ invoice.ncf || 'NO ASIGNADO' }}
              </div>
              
              <div class="pt-1 text-neutral-600 space-y-0.5">
                @if (invoice.cliente && invoice.cliente.numeroDocumento) {
                  <div><span class="text-neutral-500">RNC / Cédula Cliente:</span> <strong class="font-mono">{{ invoice.cliente.numeroDocumento }}</strong></div>
                }
                @if (invoice.cliente && invoice.cliente.telefono) {
                  <div><span class="text-neutral-500">Contacto:</span> {{ invoice.cliente.telefono }}</div>
                }
                @if (invoice.fechaVencimiento) {
                  <div><span class="text-neutral-500">Fecha Vencimiento:</span> <strong class="text-neutral-900">{{ invoice.fechaVencimiento | date:'dd-MMM-yyyy' }}</strong></div>
                }
                <div><span class="text-neutral-500">Factura No.:</span> <strong class="font-mono font-bold text-neutral-900">{{ invoice.numeroFactura }}</strong></div>
              </div>
            </div>
          </div>

          <!-- 2. BLOQUE CLIENTE (Caja estilizada azulada suave con bordes redondeados) -->
          <div class="rounded-xl bg-sky-50/80 border border-sky-100 p-4 text-xs text-neutral-800">
            <div class="text-sm font-black uppercase tracking-wide text-neutral-950 mb-1">
              {{ invoice.cliente?.nombreRazonSocial || 'CONSUMIDOR FINAL' }}
            </div>
            @if (invoice.cliente) {
              <div class="text-neutral-600 space-y-0.5">
                @if (invoice.cliente.direccion) {
                  <div>{{ invoice.cliente.direccion }}</div>
                }
                @if (invoice.cliente.numeroDocumento) {
                  <div class="font-mono font-bold text-neutral-700">{{ invoice.cliente.numeroDocumento }}</div>
                }
                @if (invoice.cliente.email) {
                  <div class="text-neutral-500">{{ invoice.cliente.email }}</div>
                }
              </div>
            }
          </div>

          <!-- 3. BALANCE PENDIENTE AL CORTE (Franja celeste/azul) -->
          <div class="rounded-lg border border-sky-200/80 overflow-hidden text-xs">
            <div class="bg-sky-100/80 px-4 py-1.5 font-bold uppercase tracking-wider text-sky-950 text-[11px] text-center">
              Balance pendiente al corte
            </div>
            <div class="p-3 bg-sky-50/30 space-y-1">
              <div class="flex justify-between text-neutral-600">
                <span>Balance previo</span>
                <span class="font-mono font-medium">{{ getCurrencySymbol(invoice.moneda) }} {{ (invoice.balancePendiente ? invoice.total : 0) | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between text-neutral-600">
                <span>Pagos realizados</span>
                <span class="font-mono font-medium">-{{ getCurrencySymbol(invoice.moneda) }} {{ (invoice.montoPagado || 0) | number:'1.2-2' }}</span>
              </div>
              <div class="flex justify-between font-bold text-neutral-900 pt-1 border-t border-sky-200/60">
                <span>Total balance pendiente al corte</span>
                <span class="font-mono font-black text-sm">{{ getCurrencySymbol(invoice.moneda) }} {{ (invoice.balancePendiente || 0) | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>

          <!-- 4. TABLA DE CARGOS Y PRODUCTOS FACTURADOS -->
          <div class="border border-neutral-200 rounded-lg overflow-hidden">
            <table class="w-full text-xs">
              <thead>
                <tr class="bg-neutral-100 text-neutral-800 font-bold border-b border-neutral-200">
                  <th class="py-2.5 px-3 text-left w-8">#</th>
                  <th class="py-2.5 px-3 text-left">Cargos / Descripción del Producto o Servicio</th>
                  <th class="py-2.5 px-3 text-center w-20">Cantidad</th>
                  <th class="py-2.5 px-3 text-right w-28">Precio Unit.</th>
                  <th class="py-2.5 px-3 text-right w-24">ITBIS</th>
                  <th class="py-2.5 px-3 text-right w-28">Importe</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-100">
                @for (det of invoice.detalles; track det.id; let idx = $index) {
                  <tr [class]="idx % 2 === 1 ? 'bg-neutral-50/60' : 'bg-white'">
                    <td class="py-2.5 px-3 text-neutral-400 font-mono">{{ idx + 1 }}</td>
                    <td class="py-2.5 px-3">
                      <div class="font-bold text-neutral-950">{{ det.producto?.nombre || det.productoId }}</div>
                      @if (det.producto?.codigo) {
                        <div class="text-[10px] text-neutral-500 font-mono">Cód: {{ det.producto.codigo }}</div>
                      }
                    </td>
                    <td class="py-2.5 px-3 text-center font-mono font-medium">{{ det.cantidad | number:'1.0-4' }}</td>
                    <td class="py-2.5 px-3 text-right font-mono text-neutral-700">{{ getCurrencySymbol(invoice.moneda) }} {{ det.precioUnitario | number:'1.2-2' }}</td>
                    <td class="py-2.5 px-3 text-right font-mono text-neutral-600">
                      @if (det.itbis > 0) {
                        {{ getCurrencySymbol(invoice.moneda) }} {{ det.itbis | number:'1.2-2' }}
                      } @else {
                        <span class="text-neutral-400">Exento</span>
                      }
                    </td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-neutral-950">{{ getCurrencySymbol(invoice.moneda) }} {{ det.total | number:'1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- 5. TOTALES, IMPUESTOS Y FRANJA TOTAL A PAGAR -->
          <div class="space-y-3">
            
            <div class="flex justify-end">
              <div class="w-full max-w-sm space-y-1.5 text-xs">
                <div class="flex justify-between text-neutral-700">
                  <span class="font-bold">Subtotal cargos del mes</span>
                  <span class="font-mono font-bold">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.subtotal | number:'1.2-2' }}</span>
                </div>
                
                <div class="flex justify-between text-neutral-500 pl-3">
                  <span>Base imponible</span>
                  <span class="font-mono">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.subtotal | number:'1.2-2' }}</span>
                </div>
                
                <div class="flex justify-between text-neutral-700 pl-3">
                  <span>ITBIS (18%)</span>
                  <span class="font-mono">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.itbis | number:'1.2-2' }}</span>
                </div>

                @if (invoice.descuento > 0) {
                  <div class="flex justify-between text-emerald-700 pl-3">
                    <span>Descuentos otorgados</span>
                    <span class="font-mono">-{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.descuento | number:'1.2-2' }}</span>
                  </div>
                }

                <div class="flex justify-between text-neutral-800 font-bold pt-1 border-t border-neutral-200">
                  <span>Total cargos del período</span>
                  <span class="font-mono font-bold">{{ getCurrencySymbol(invoice.moneda) }} {{ invoice.total | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>

            <!-- Franja Azul Oficial "Total a pagar" -->
            <div class="rounded-lg bg-sky-200/70 border border-sky-300/70 px-5 py-3 flex items-center justify-between">
              <div>
                <span class="text-sm font-black uppercase tracking-wider text-sky-950">Total a pagar</span>
                @if (invoice.fechaVencimiento) {
                  <div class="text-[11px] text-sky-900 font-medium">Pagar antes de: {{ invoice.fechaVencimiento | date:'dd de MMMM yyyy' }}</div>
                }
              </div>
              <div class="text-xl font-black font-mono text-sky-950">
                {{ getCurrencySymbol(invoice.moneda) }} {{ invoice.total | number:'1.2-2' }}
              </div>
            </div>

            <div class="text-[11px] text-neutral-500 italic">
              Recuerde pagar a tiempo. Evite cargos por atraso o suspensión de servicios.
            </div>
          </div>

          <!-- 6. PIE DE PÁGINA DGII, FORMAS DE PAGO Y VALIDACIÓN (3 Columnas) -->
          <div class="border-t border-neutral-200 pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
            
            <!-- Columna 1: QR Verificación Fiscal DGII -->
            <div class="flex flex-col items-center sm:items-start space-y-2">
              <div class="inline-block bg-blue-700 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded">
                QR verificación e-Ncf
              </div>
              
              <div class="flex items-center gap-3">
                @if (invoice.fiscalbridgeQrUrl) {
                  <img [src]="invoice.fiscalbridgeQrUrl" alt="QR DGII" class="size-20 rounded border border-neutral-300 bg-white p-1 shrink-0" />
                } @else {
                  <div class="size-20 rounded border border-neutral-300 bg-neutral-100 flex flex-col items-center justify-center text-neutral-400 shrink-0">
                    <mat-icon svgIcon="qr-code" class="icon-size-8" />
                    <span class="text-[9px] font-mono">e-CF DGII</span>
                  </div>
                }
                
                <div class="text-[10px] text-neutral-600 space-y-0.5 font-mono leading-tight">
                  @if (invoice.fiscalbridgeSecurityCode) {
                    <div>Código Seg: <strong class="text-neutral-900">{{ invoice.fiscalbridgeSecurityCode }}</strong></div>
                  }
                  @if (invoice.fiscalbridgeSignDate) {
                    <div>Firma Digital: {{ invoice.fiscalbridgeSignDate | date:'dd-MM-yyyy' }}</div>
                  } @else {
                    <div>Emisión: {{ invoice.fecha | date:'dd-MM-yyyy' }}</div>
                  }
                  <div class="text-neutral-400 font-sans">Válido para crédito fiscal</div>
                </div>
              </div>
            </div>

            <!-- Columna 2: Canales y Medios de Pago -->
            <div class="space-y-2 text-[11px] text-neutral-600">
              <div class="flex items-start gap-2">
                <mat-icon svgIcon="credit-card" class="icon-size-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong class="text-neutral-800">Forma de Pago:</strong>
                  <div>{{ invoice.tipoPago }} · {{ invoice.metodoPago }}</div>
                </div>
              </div>

              <div class="flex items-start gap-2">
                <mat-icon svgIcon="building" class="icon-size-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong class="text-neutral-800">Transferencias y Bancos:</strong>
                  <div>Abonos a través de cuenta bancaria o portal de pagos.</div>
                </div>
              </div>
            </div>

            <!-- Columna 3: Sello y Aplicación de Pago -->
            <div class="flex flex-col items-center sm:items-end space-y-2 text-right">
              <div class="inline-block bg-blue-700 text-white font-black text-[10px] uppercase px-3 py-0.5 rounded">
                Aplica pago
              </div>
              <div class="text-[10px] text-neutral-500 max-w-[160px]">
                Escanee o presente esta factura para validación y registro en sucursal.
              </div>
              <div class="text-[9px] text-neutral-400 font-mono">
                Dolphin ERP · v1.0.12
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  `,
})
export class InvoicePreviewComponent {
  readonly invoice: FacturaVenta = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<InvoicePreviewComponent>);
  private readonly invoicesService = inject(InvoicesService);
  private readonly authState = inject(AuthState);
  readonly now = new Date();

  readonly currentEmpresa = computed(() => {
    const user = this.authState.user() as any;
    const empId = this.authState.empresaId();
    if (!user?.empresas || user.empresas.length === 0) return null;
    return user.empresas.find((e: any) => e.id === empId) || user.empresas[0];
  });

  print() {
    window.print();
  }

  getCurrencySymbol(code?: string | null): string {
    return code === 'USD' ? '$' : code === 'EUR' ? '€' : 'RD$';
  }

  getTipoNcfTitulo(tipo?: string | null): string {
    if (!tipo) return 'FACTURA DE VENTA';
    const map: Record<string, string> = {
      E31: 'Factura De Crédito Fiscal Electrónica',
      E32: 'Factura De Consumo Electrónica',
      E33: 'Nota De Débito Electrónica',
      E34: 'Nota De Crédito Electrónica',
      E41: 'Comprobante De Compras Electrónico',
      E43: 'Gastos Menores Electrónico',
      E44: 'Regímenes Especiales Electrónico',
      E45: 'Comprobante Gubernamental Electrónico',
      B01: 'Factura De Crédito Fiscal',
      B02: 'Factura De Consumo',
      B04: 'Nota De Crédito',
      B14: 'Regímenes Especiales',
      B15: 'Comprobante Gubernamental',
    };
    return map[tipo] || `Factura (${tipo})`;
  }

  downloadPdf() {
    this.invoicesService.downloadPdf(this.invoice.id, `${this.invoice.numeroFactura}.pdf`);
  }

  getStatusClass(estado: string): string {
    const map: Record<string, string> = {
      EMITIDA: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400',
      PAGADA: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
      ANULADA: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400',
      BORRADOR: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400',
    };
    return map[estado] ?? 'bg-neutral-100 text-neutral-700';
  }
}
export default InvoicePreviewComponent;
