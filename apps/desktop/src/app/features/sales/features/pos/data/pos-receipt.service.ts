import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthState } from '@core/auth/auth.state';
import { FacturaVenta } from '@features/sales/data/invoices.service';
import { environment } from '@/environments/environment';

export type ActiveCompanyData = {
  id: string;
  razonSocial: string;
  rnc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logo?: string;
}

@Injectable({ providedIn: 'root' })
export class PosReceiptService {
  private readonly authState = inject(AuthState);
  private readonly http = inject(HttpClient);
  readonly currentEmpresa = signal<ActiveCompanyData | null>(null);

  constructor() {
    this.refreshCurrentEmpresa();
  }

  refreshCurrentEmpresa(): void {
    this.http.get<ActiveCompanyData>(`${environment.apiUrl}/empresas/current`).subscribe({
      next: (emp) => {
        if (emp) this.currentEmpresa.set(emp);
      },
      error: () => {},
    });
  }

  printThermalTicket(
    invoice: FacturaVenta,
    receivedAmount = 0,
    changeAmount = 0
  ): void {
    const cachedEmpresa = this.currentEmpresa();
    const user = this.authState.user() as any;
    const activeEmpresaId = this.authState.empresaId();
    const empresa = (invoice as any)?.empresa || cachedEmpresa || user?.empresas?.find((e: any) => e.id === activeEmpresaId) || user?.empresas?.[0];

    const companyName = (invoice as any)?.empresa?.razonSocial || cachedEmpresa?.razonSocial || empresa?.razonSocial || empresa?.nombre || invoice.sucursal?.nombre || 'Comercial';
    const companyRnc = ((invoice as any)?.empresa?.rnc || cachedEmpresa?.rnc || empresa?.rnc) ? `RNC: ${(invoice as any)?.empresa?.rnc || cachedEmpresa?.rnc || empresa?.rnc}` : '';
    const companyAddress = (invoice as any)?.empresa?.direccion || cachedEmpresa?.direccion || empresa?.direccion || '';
    const companyPhone = ((invoice as any)?.empresa?.telefono || cachedEmpresa?.telefono || empresa?.telefono) ? `Tel: ${(invoice as any)?.empresa?.telefono || cachedEmpresa?.telefono || empresa?.telefono}` : '';

    const cashierName = user?.name || user?.email?.split('@')[0] || 'Cajero';
    const clientName = invoice.cliente?.nombreRazonSocial || 'Cliente General';
    const clientDoc = invoice.cliente?.numeroDocumento ? `RNC/CÉDULA: ${invoice.cliente.numeroDocumento}` : '';

    const formattedDate = new Date(invoice.fecha || invoice.creadoEn).toLocaleString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const itemsRows = (invoice.detalles || [])
      .map((item) => {
        const desc = item.producto?.nombre || 'Artículo';
        const qty = item.cantidad;
        const price = Number(item.precioUnitario).toFixed(2);
        const lineTotal = Number(item.total).toFixed(2);
        return `
          <tr>
            <td style="padding: 2px 0; vertical-align: top;">
              <div style="font-weight: bold;">${desc}</div>
              <div style="font-size: 10px; color: #444;">${qty} x RD$ ${price}</div>
            </td>
            <td style="text-align: right; vertical-align: top; font-weight: bold; white-space: nowrap;">
              RD$ ${lineTotal}
            </td>
          </tr>
        `;
      })
      .join('');

    const ncfBlock = invoice.ncf
      ? `
        <div style="font-weight: bold; font-size: 13px; margin-top: 4px;">
          ${invoice.tipoNcf?.startsWith('E') ? 'e-NCF' : 'NCF'}: ${invoice.ncf}
        </div>
        <div style="font-size: 10px; color: #444;">TIPO: ${invoice.tipoNcf}</div>
      `
      : '';

    const qrBlock = invoice.fiscalbridgeQrUrl
      ? `
        <div class="text-center" style="margin-top: 8px;">
          <img src="${invoice.fiscalbridgeQrUrl}" style="width: 90px; height: 90px;" alt="QR DGII" />
          <div style="font-size: 8px; color: #666;">Verificación Fiscal DGII</div>
        </div>
      `
      : '';

    const ticketHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ticket - ${invoice.numeroFactura}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 3mm;
            }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: 12px;
              color: #000;
              background: #fff;
              width: 72mm;
              margin: 0 auto;
              padding: 0;
              line-height: 1.25;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .double-divider {
              border-top: 2px solid #000;
              margin: 6px 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            .total-row {
              font-size: 14px;
              font-weight: 900;
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="bold" style="font-size: 15px; letter-spacing: 0.5px;">${companyName}</div>
            ${companyRnc ? `<div>${companyRnc}</div>` : ''}
            ${companyAddress ? `<div style="font-size: 10px;">${companyAddress}</div>` : ''}
            ${companyPhone ? `<div style="font-size: 10px;">${companyPhone}</div>` : ''}
          </div>

          <div class="divider"></div>

          <div style="font-size: 11px;">
            <div><span class="bold">FACTURA:</span> ${invoice.numeroFactura}</div>
            ${ncfBlock}
            <div><span class="bold">FECHA:</span> ${formattedDate}</div>
            <div><span class="bold">CAJERO:</span> ${cashierName}</div>
            <div><span class="bold">CLIENTE:</span> ${clientName}</div>
            ${clientDoc ? `<div>${clientDoc}</div>` : ''}
          </div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1px dashed #000; font-size: 10px;">
                <th style="text-align: left; padding-bottom: 3px;">DESCRIPCIÓN</th>
                <th style="text-align: right; padding-bottom: 3px;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="divider"></div>

          <table style="font-size: 11px;">
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">RD$ ${Number(invoice.subtotal).toFixed(2)}</td>
            </tr>
            ${
              Number(invoice.descuento) > 0
                ? `
              <tr>
                <td>Descuento:</td>
                <td class="text-right">- RD$ ${Number(invoice.descuento).toFixed(2)}</td>
              </tr>
            `
                : ''
            }
            <tr>
              <td>ITBIS (18%):</td>
              <td class="text-right">RD$ ${Number(invoice.itbis).toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td style="padding-top: 4px;">TOTAL:</td>
              <td class="text-right" style="padding-top: 4px;">RD$ ${Number(invoice.total).toFixed(2)}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div style="font-size: 11px;">
            <div><span class="bold">FORMA PAGO:</span> ${invoice.metodoPago || 'EFECTIVO'}</div>
            ${
              receivedAmount > 0
                ? `
              <div style="display: flex; justify-content: space-between;">
                <span>RECIBIDO:</span>
                <span class="bold">RD$ ${receivedAmount.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
                <span>CAMBIO / DEVUELTA:</span>
                <span>RD$ ${changeAmount.toFixed(2)}</span>
              </div>
            `
                : ''
            }
          </div>

          ${qrBlock}

          <div class="double-divider"></div>

          <div class="text-center" style="font-size: 10px; margin-top: 6px;">
            <div class="bold">¡GRACIAS POR SU COMPRA!</div>
            <div>Conserve este comprobante para cualquier reclamo</div>
          </div>
        </body>
      </html>
    `;

    // Print using isolated invisible iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(ticketHtml);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 250);
    }
  }
}
