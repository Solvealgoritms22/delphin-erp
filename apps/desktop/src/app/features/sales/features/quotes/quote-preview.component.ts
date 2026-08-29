import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';
import { Cotizacion } from '../../data/quotes.service';
import { AuthState } from '@core/auth/auth.state';

@Component({
  selector: 'app-quote-preview',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="flex flex-col max-h-[90vh] w-full max-w-4xl bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <mat-icon svgIcon="file-text" class="icon-size-5"></mat-icon>
          </div>
          <div>
            <h2 class="text-base font-bold text-neutral-900 dark:text-white">
              Cotización {{ quote.numeroCotizacion }}
            </h2>
            <p class="text-xs text-neutral-500">
              Vista previa e impresión formal
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="printQuote()"
            class="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
            <span>Imprimir</span>
          </button>
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
      <div class="flex-auto overflow-y-auto p-6 md:p-8 space-y-6">
        <div class="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 space-y-6 shadow-xs">
          <!-- Document Header -->
          <div class="flex flex-col sm:flex-row justify-between items-start border-b border-neutral-200 dark:border-neutral-800 pb-6 gap-4">
            <div>
              <h1 class="text-xl font-extrabold text-neutral-900 dark:text-white">
                {{ currentEmpresa()?.razonSocial || 'Dolphin ERP' }}
              </h1>
              <p class="text-xs text-neutral-500 mt-0.5">
                {{ currentEmpresa()?.rnc ? 'RNC: ' + currentEmpresa()?.rnc : '' }}
                {{ currentEmpresa()?.telefono ? ' · Tel: ' + currentEmpresa()?.telefono : '' }}
              </p>
              <p class="text-xs text-neutral-500">
                {{ currentEmpresa()?.direccion || 'República Dominicana' }}
              </p>
            </div>

            <div class="sm:text-right">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold tracking-wider uppercase bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                COTIZACIÓN COMERCIAL
              </span>
              <div class="text-lg font-mono font-black text-neutral-900 dark:text-white mt-1">
                {{ quote.numeroCotizacion }}
              </div>
              <div class="text-xs text-neutral-500 mt-1">
                Fecha: <strong>{{ quote.fecha | date: 'dd/MM/yyyy' }}</strong>
              </div>
              <div class="text-xs text-neutral-500">
                Válida hasta: <strong>{{ quote.fechaVencimiento ? (quote.fechaVencimiento | date: 'dd/MM/yyyy') : '30 días' }}</strong>
              </div>
            </div>
          </div>

          <!-- Client & Metadata Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Cotizado Para</span>
              @if (quote.cliente; as cli) {
                <div class="text-sm font-bold text-neutral-900 dark:text-white mt-0.5">
                  {{ cli.nombreRazonSocial }}
                </div>
                @if (cli.numeroDocumento) {
                  <div class="text-xs font-mono text-neutral-500">
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
                  Consumidor Final
                </div>
              }
            </div>

            <div class="sm:text-right">
              <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Estado de la Oferta</span>
              <div class="mt-1">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold"
                  [ngClass]="{
                    'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300': quote.estado === 'BORRADOR',
                    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': quote.estado === 'ENVIADA',
                    'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': quote.estado === 'ACEPTADA' || quote.estado === 'FACTURADA',
                    'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400': quote.estado === 'RECHAZADA' || quote.estado === 'VENCIDA'
                  }">
                  {{ quote.estado }}
                </span>
              </div>
              @if (quote.enviadaPorEmail) {
                <div class="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex sm:justify-end items-center gap-1">
                  <mat-icon svgIcon="check" class="icon-size-3.5"></mat-icon>
                  <span>Enviada a {{ quote.emailDestino }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Items Table -->
          <div class="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table class="w-full text-left text-xs">
              <thead class="bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 font-bold border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th class="py-3 px-4">#</th>
                  <th class="py-3 px-4">Descripción del Producto / Servicio</th>
                  <th class="py-3 px-4 text-center">Cant.</th>
                  <th class="py-3 px-4 text-right">Precio Unitario</th>
                  <th class="py-3 px-4 text-right">ITBIS (18%)</th>
                  <th class="py-3 px-4 text-right">Total</th>
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
                          Descuento aplicado: -RD$ {{ d.descuento | number: '1.2-2' }}
                        </div>
                      }
                    </td>
                    <td class="py-3 px-4 text-center font-mono font-bold">{{ d.cantidad }}</td>
                    <td class="py-3 px-4 text-right font-mono">RD$ {{ d.precioUnitario | number: '1.2-2' }}</td>
                    <td class="py-3 px-4 text-right font-mono text-neutral-500">RD$ {{ d.itbis | number: '1.2-2' }}</td>
                    <td class="py-3 px-4 text-right font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ d.total | number: '1.2-2' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Summary & Totals -->
          <div class="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div class="space-y-3 flex-1">
              @if (quote.notas) {
                <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                  <strong class="block text-neutral-700 dark:text-neutral-300 mb-1">Notas Comerciales:</strong>
                  <p class="text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{{ quote.notas }}</p>
                </div>
              }
              @if (quote.terminosCondiciones) {
                <div class="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/60 dark:border-neutral-800 text-xs">
                  <strong class="block text-neutral-700 dark:text-neutral-300 mb-1">Términos de Entrega y Pago:</strong>
                  <p class="text-neutral-600 dark:text-neutral-400 whitespace-pre-line">{{ quote.terminosCondiciones }}</p>
                </div>
              }
            </div>

            <div class="w-full sm:w-72 space-y-2 text-xs">
              <div class="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                <span>Subtotal Neto:</span>
                <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ quote.subtotal | number: '1.2-2' }}</span>
              </div>
              @if (quote.descuento > 0) {
                <div class="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-emerald-600 dark:text-emerald-400">
                  <span>Descuento:</span>
                  <span class="font-mono font-bold">-RD$ {{ quote.descuento | number: '1.2-2' }}</span>
                </div>
              }
              <div class="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400">
                <span>ITBIS (18%):</span>
                <span class="font-mono font-bold text-neutral-900 dark:text-white">RD$ {{ quote.itbis | number: '1.2-2' }}</span>
              </div>
              <div class="flex justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 text-sm font-black">
                <span>TOTAL COTIZADO:</span>
                <span class="font-mono text-base">RD$ {{ quote.total | number: '1.2-2' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 shrink-0">
        <button
          type="button"
          (click)="close()"
          class="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
        >
          Cerrar
        </button>
        <button
          type="button"
          (click)="printQuote()"
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <mat-icon svgIcon="printer" class="icon-size-4"></mat-icon>
          <span>Imprimir Cotización</span>
        </button>
      </div>
    </div>
  `,
})
export class QuotePreviewComponent {
  dialogRef = inject(MatDialogRef<QuotePreviewComponent>);
  data = inject<{ quote: Cotizacion }>(MAT_DIALOG_DATA);
  authState = inject(AuthState);

  quote: Cotizacion = this.data.quote;

  currentEmpresa = () => {
    const user = this.authState.user();
    const empId = this.authState.empresaId();
    if (!user?.empresas || user.empresas.length === 0) return null;
    return user.empresas.find((e) => e.id === empId) || user.empresas[0];
  };

  close(): void {
    this.dialogRef.close();
  }

  printQuote(): void {
    const empresa = this.currentEmpresa();
    const empresaNombre = empresa?.razonSocial || 'Dolphin ERP';
    const empresaRnc = empresa?.rnc ? `RNC: ${empresa.rnc}` : '';
    const formattedDate = new Date(this.quote.fecha).toLocaleDateString('es-DO');
    const formattedDueDate = this.quote.fechaVencimiento
      ? new Date(this.quote.fechaVencimiento).toLocaleDateString('es-DO')
      : '30 días';

    const formatCurrency = (val: number | undefined | null) => {
      const num = Number(val || 0);
      return 'RD$ ' + num.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Cotización ${this.quote.numeroCotizacion} - ${empresaNombre}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 28px; color: #1e293b; font-size: 12px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
          .company-name { font-size: 20px; font-weight: 800; color: #1e40af; }
          .quote-title { font-size: 18px; font-weight: 800; color: #0f172a; text-align: right; }
          .grid { display: flex; justify-content: space-between; background: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
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
            <div class="company-name">${empresaNombre}</div>
            <div>${empresaRnc}</div>
            <div>${empresa?.direccion || 'República Dominicana'}</div>
            <div>${empresa?.telefono ? 'Tel: ' + empresa.telefono : ''}</div>
          </div>
          <div>
            <div class="quote-title">COTIZACIÓN</div>
            <div style="font-family: monospace; font-size: 14px; font-weight: bold; text-align: right;">${this.quote.numeroCotizacion}</div>
            <div style="text-align: right; margin-top: 4px;">Emisión: <strong>${formattedDate}</strong></div>
            <div style="text-align: right;">Válida hasta: <strong>${formattedDueDate}</strong></div>
          </div>
        </div>

        <div class="grid">
          <div>
            <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">Cliente:</div>
            <div style="font-size: 13px; font-weight: bold;">${this.quote.cliente?.nombreRazonSocial || 'Consumidor Final'}</div>
            <div style="font-family: monospace; color: #475569;">${this.quote.cliente?.numeroDocumento ? 'RNC/Céd: ' + this.quote.cliente.numeroDocumento : ''}</div>
            <div>${this.quote.cliente?.email || ''}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: bold;">Moneda:</div>
            <div style="font-weight: bold;">Pesos Dominicanos (DOP)</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Descripción</th>
              <th class="text-center" style="width: 50px;">Cant.</th>
              <th class="text-right" style="width: 100px;">Precio Unit.</th>
              <th class="text-right" style="width: 90px;">ITBIS</th>
              <th class="text-right" style="width: 110px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${this.quote.detalles.map((d, i) => `
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
            <span>Subtotal:</span>
            <span style="font-family: monospace;">${formatCurrency(this.quote.subtotal)}</span>
          </div>
          ${this.quote.descuento > 0 ? `
            <div class="totals-row" style="color: #059669;">
              <span>Descuento:</span>
              <span style="font-family: monospace;">-${formatCurrency(this.quote.descuento)}</span>
            </div>
          ` : ''}
          <div class="totals-row">
            <span>ITBIS (18%):</span>
            <span style="font-family: monospace;">${formatCurrency(this.quote.itbis)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL:</span>
            <span style="font-family: monospace;">${formatCurrency(this.quote.total)}</span>
          </div>
        </div>

        ${this.quote.notas || this.quote.terminosCondiciones ? `
          <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
            ${this.quote.notas ? `<div><strong>Condiciones:</strong> ${this.quote.notas}</div>` : ''}
            ${this.quote.terminosCondiciones ? `<div style="margin-top: 4px;"><strong>Términos:</strong> ${this.quote.terminosCondiciones}</div>` : ''}
          </div>
        ` : ''}

        <div class="footer">
          Documento generado por Dolphin ERP · Validez sujeta a confirmación comercial.
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

      setTimeout(() => {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      }, 350);
    }
  }
}
