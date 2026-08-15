import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class FiscalBridgeService {
  private readonly logger = new Logger(FiscalBridgeService.name);

  /**
   * Normaliza el entorno a PROD | CERT | TEST
   */
  normalizeFbEnv(env: string | null | undefined): string {
    const v = String(env || '').trim().toUpperCase();
    if (v === 'PROD' || v === 'PRODUCTION' || v === 'ECF') return 'PROD';
    if (v === 'CERT' || v === 'CERTECF' || v === 'CERTIFICATION') return 'CERT';
    return 'TEST';
  }

  /**
   * Obtiene los headers HTTP de autenticación según el método configurado en la empresa
   */
  async getAuthHeaders(empresa: any): Promise<{ headers: Record<string, string>; baseUrl: string }> {
    if (!empresa.fiscalbridgeUrl) {
      throw new BadRequestException('FiscalBridge no está configurado en esta empresa.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let baseUrl = empresa.fiscalbridgeUrl.trim();
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const cleanedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl.slice(0, -3) : baseUrl;

    const authMethod = (empresa.fiscalbridgeAuthMethod || 'TOKEN').toUpperCase();

    if (authMethod === 'TOKEN') {
      const token = empresa.fiscalbridgeToken;
      if (!token) {
        throw new BadRequestException('No hay un API Token de FiscalBridge configurado en la empresa.');
      }
      headers['Authorization'] = `Bearer ${token}`;
    } else if (authMethod === 'EMAIL') {
      const email = empresa.fiscalbridgeEmail;
      const password = empresa.fiscalbridgePassword;
      const clientId = empresa.fiscalbridgeClientId;

      if (!email || !password) {
        throw new BadRequestException('Credenciales de correo y contraseña incompletas para FiscalBridge.');
      }

      const loginRes = await fetch(`${cleanedBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}));
        throw new BadRequestException(`Error de autenticación FiscalBridge: ${err.message || loginRes.statusText}`);
      }

      const loginData = await loginRes.json();
      const token = loginData.access_token || loginData.token;
      if (!token) {
        throw new BadRequestException('FiscalBridge no devolvió un token de acceso válido.');
      }

      headers['Authorization'] = `Bearer ${token}`;
      if (clientId) headers['x-api-key'] = clientId;
    } else if (authMethod === 'OAUTH2') {
      const clientId = empresa.fiscalbridgeClientId;
      const clientSecret = empresa.fiscalbridgeClientSecret;

      if (!clientId || !clientSecret) {
        throw new BadRequestException('Client ID o Client Secret incompletos para OAuth2 de FiscalBridge.');
      }

      const tokenRes = await fetch(`${cleanedBaseUrl}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          tenant_id: empresa.rnc,
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({}));
        throw new BadRequestException(`Error OAuth2 FiscalBridge: ${err.message || tokenRes.statusText}`);
      }

      const tokenData = await tokenRes.json();
      const token = tokenData.access_token || tokenData.token;
      headers['Authorization'] = `Bearer ${token}`;
    }

    return { headers, baseUrl: cleanedBaseUrl };
  }

  /**
   * Prueba la conectividad y credenciales con la API de FiscalBridge
   */
  async testConnection(empresa: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { headers, baseUrl } = await this.getAuthHeaders(empresa);
      const res = await fetch(`${baseUrl}/documents?limit=1`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return {
          success: false,
          message: `Fallo de conexión: ${err.message || res.statusText} (${res.status})`,
        };
      }
      return {
        success: true,
        message: 'Conexión con FiscalBridge establecida exitosamente.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Error al conectar con FiscalBridge',
      };
    }
  }

  /**
   * Construye el JSON estándar ECF según la norma de la DGII de República Dominicana
   */
  buildEcfPayload(invoice: any, empresa: any): any {
    const fechaEmision = invoice.fecha ? new Date(invoice.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const ncf = invoice.ncf || '';
    const tipoEcf = invoice.tipoNcf || (ncf.startsWith('E') ? ncf.substring(0, 3) : 'E32');
    const docTypeCode = tipoEcf.startsWith('E') ? tipoEcf.replace('E', '') : '32';

    // Comprador
    let comprador: any = {
      RazonSocialComprador: 'CLIENTE CONTADO / CONSUMIDOR FINAL',
    };

    if (invoice.cliente) {
      comprador = {
        RNCComprador: invoice.cliente.numeroDocumento?.replace(/[^0-9]/g, '') || undefined,
        RazonSocialComprador: invoice.cliente.nombreRazonSocial || 'CLIENTE',
        ...(invoice.cliente.direccion ? { DireccionComprador: invoice.cliente.direccion } : {}),
        ...(invoice.cliente.telefono ? { TelefonoComprador: invoice.cliente.telefono } : {}),
        ...(invoice.cliente.email ? { CorreoComprador: invoice.cliente.email } : {}),
      };
    }

    const payload: any = {
      fiscal_json: {
        ECF: {
          Encabezado: {
            Version: '1.0',
            IdDoc: {
              TipoeCF: docTypeCode,
              eNCF: ncf,
              FechaEmision: fechaEmision,
              ...(docTypeCode !== '33' && docTypeCode !== '34'
                ? {
                    IndicadorMontoGravado: '1',
                    TipoIngresos: '01',
                    TipoPago: invoice.tipoPago === 'CREDITO' ? '2' : '1',
                  }
                : {}),
            },
            Emisor: {
              RNCEmisor: empresa.rnc?.replace(/[^0-9]/g, '') || '101000000',
              RazonSocialEmisor: empresa.razonSocial,
              NombreComercial: empresa.razonSocial,
              DireccionEmisor: empresa.descripcion || 'Santo Domingo, RD',
              ...(empresa.telefono ? { TelefonoEmisor: empresa.telefono } : {}),
              ...(empresa.email ? { CorreoEmisor: empresa.email } : {}),
              FechaEmision: fechaEmision,
            },
            Comprador: comprador,
            Totales: {
              MontoGravadoTotal: Number(invoice.subtotal).toFixed(2),
              MontoExento: '0.00',
              TotalITBIS: Number(invoice.itbis).toFixed(2),
              MontoTotal: Number(invoice.total).toFixed(2),
            },
          },
          DetallesItems: {
            Item: (invoice.detalles || []).map((det: any, idx: number) => ({
              NumeroLinea: (idx + 1).toString(),
              IndicadorFacturacion: '1', // 1: Gravado con ITBIS
              NombreItem: det.producto?.nombre || 'Producto',
              CantidadItem: Number(det.cantidad).toFixed(2),
              PrecioUnitarioItem: Number(det.precioUnitario).toFixed(2),
              MontoItem: Number(det.subtotal).toFixed(2),
            })),
          },
        },
      },
    };

    // Referencia si es Nota de Crédito / Débito (E34 / E33)
    if ((docTypeCode === '33' || docTypeCode === '34') && invoice.ncfModificado) {
      payload.fiscal_json.ECF.InformacionReferencia = {
        NCFModificado: invoice.ncfModificado,
        FechaNCFModificado: fechaEmision,
        CodigoModificacion: invoice.motivoModificacion || '1',
      };
    }

    return payload;
  }

  /**
   * Transmite una factura electrónica a FiscalBridge
   */
  async transmitInvoice(invoice: any, empresa: any) {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const payload = this.buildEcfPayload(invoice, empresa);

    this.logger.log(`Transmitiendo factura ${invoice.numeroFactura} (${invoice.ncf}) a FiscalBridge...`);

    const res = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: 'Error desconocido de FiscalBridge' }));
      throw new BadRequestException(`FiscalBridge rechazó la factura: ${errData.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      documentUuid: data.documentUuid || data.document_uuid || data.uuid || data.id,
      status: data.status || 'SENT',
      trackId: data.trackId || data.track_id || null,
      securityCode: data.securityCode || data.security_code || null,
      qrUrl: data.qrUrl || data.qr_url || null,
    };
  }

  /**
   * Descarga el PDF (Representación Impresa oficial de la DGII)
   */
  async getPdfBuffer(documentUuid: string, empresa: any): Promise<Buffer> {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const res = await fetch(`${baseUrl}/documents/${documentUuid}/pdf`, { headers });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new BadRequestException(`No se pudo obtener el PDF de FiscalBridge: ${msg}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Descarga el XML oficial firmado digitalmente por la DGII
   */
  async getXmlBuffer(documentUuid: string, empresa: any): Promise<Buffer> {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const res = await fetch(`${baseUrl}/documents/${documentUuid}/xml`, { headers });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new BadRequestException(`No se pudo obtener el XML de FiscalBridge: ${msg}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Consulta el estado de un documento en FiscalBridge
   */
  async getDocumentStatus(documentUuid: string, empresa: any): Promise<any> {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const res = await fetch(`${baseUrl}/documents/${documentUuid}/status`, { headers });
    if (!res.ok) {
      return { status: 'UNKNOWN' };
    }
    return res.json();
  }
}
