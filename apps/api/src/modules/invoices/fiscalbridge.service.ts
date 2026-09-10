import { buildEcfPayload } from './fiscal-payload';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';

import { decryptSecret } from '../../common/security/secrets';

@Injectable()
export class FiscalBridgeService {
  private readonly logger = new Logger(FiscalBridgeService.name);

  private request(url: string, init: RequestInit = {}) {
    return fetch(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15_000) });
  }

  /**
   * Normaliza el entorno a PROD | CERT | TEST
   */
  normalizeFbEnv(env: string | null | undefined): string {
    const v = String(env || '')
      .trim()
      .toUpperCase();
    if (v === 'PROD' || v === 'PRODUCTION' || v === 'ECF') return 'PROD';
    if (v === 'CERT' || v === 'CERTECF' || v === 'CERTIFICATION') return 'CERT';
    return 'TEST';
  }

  /**
   * Obtiene los headers HTTP de autenticación según el método configurado en la empresa
   */
  async getAuthHeaders(
    empresa: any,
  ): Promise<{ headers: Record<string, string>; baseUrl: string }> {
    if (!empresa.fiscalbridgeUrl) {
      throw new BadRequestException(
        'FiscalBridge no está configurado en esta empresa.',
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let baseUrl = empresa.fiscalbridgeUrl.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      throw new BadRequestException('La URL de FiscalBridge no es válida.');
    }
    const allowedHosts = (process.env.FISCALBRIDGE_ALLOWED_HOSTS || '')
      .split(',')
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean);
    if (process.env.NODE_ENV === 'production' && !allowedHosts.length)
      throw new BadRequestException(
        'FISCALBRIDGE_ALLOWED_HOSTS debe configurarse en producción.',
      );
    const isLocalTest =
      this.normalizeFbEnv(empresa.fiscalbridgeEnv) === 'TEST' &&
      ['localhost', '127.0.0.1'].includes(parsedUrl.hostname);
    if (parsedUrl.protocol !== 'https:' && !isLocalTest)
      throw new BadRequestException('FiscalBridge debe utilizar HTTPS.');
    if (
      allowedHosts.length &&
      !allowedHosts.includes(parsedUrl.hostname.toLowerCase())
    )
      throw new BadRequestException(
        'El host de FiscalBridge no está permitido.',
      );
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    const cleanedBaseUrl = baseUrl.endsWith('/v1')
      ? baseUrl.slice(0, -3)
      : baseUrl;

    const authMethod = (
      empresa.fiscalbridgeAuthMethod || 'TOKEN'
    ).toUpperCase();

    if (authMethod === 'TOKEN') {
      const token = decryptSecret(empresa.fiscalbridgeToken);
      if (!token) {
        throw new BadRequestException(
          'No hay un API Token de FiscalBridge configurado en la empresa.',
        );
      }
      headers['Authorization'] = `Bearer ${token}`;
    } else if (authMethod === 'EMAIL') {
      const email = empresa.fiscalbridgeEmail;
      const password = decryptSecret(empresa.fiscalbridgePassword);
      const clientId = empresa.fiscalbridgeClientId;

      if (!email || !password) {
        throw new BadRequestException(
          'Credenciales de correo y contraseña incompletas para FiscalBridge.',
        );
      }

      const loginRes = await this.request(`${cleanedBaseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!loginRes.ok) {
        const err = await loginRes.json().catch(() => ({}));
        throw new BadRequestException(
          `Error de autenticación FiscalBridge: ${err.message || loginRes.statusText}`,
        );
      }

      const loginData = await loginRes.json();
      const token = loginData.access_token || loginData.token;
      if (!token) {
        throw new BadRequestException(
          'FiscalBridge no devolvió un token de acceso válido.',
        );
      }

      headers['Authorization'] = `Bearer ${token}`;
      if (clientId) headers['x-api-key'] = clientId;
    } else if (authMethod === 'OAUTH2') {
      const clientId = empresa.fiscalbridgeClientId;
      const clientSecret = decryptSecret(empresa.fiscalbridgeClientSecret);

      if (!clientId || !clientSecret) {
        throw new BadRequestException(
          'Client ID o Client Secret incompletos para OAuth2 de FiscalBridge.',
        );
      }

      const tokenRes = await this.request(`${cleanedBaseUrl}/auth/token`, {
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
        throw new BadRequestException(
          `Error OAuth2 FiscalBridge: ${err.message || tokenRes.statusText}`,
        );
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
  async testConnection(
    empresa: any,
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const { headers, baseUrl } = await this.getAuthHeaders(empresa);
      const res = await this.request(`${baseUrl}/documents?limit=1`, { headers });
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
  buildEcfPayload(invoice: any, empresa: any): any { return buildEcfPayload(invoice, empresa); }

  /**
   * Extrae y formatea detalladamente cualquier estructura de error devuelta por FiscalBridge / DGII
   */
  parseFiscalBridgeError(errData: any, statusText: string, statusHttp?: number): string {
    if (!errData) {
      return statusText ? `${statusText} (HTTP ${statusHttp || 500})` : 'Error desconocido de FiscalBridge';
    }

    // 1. Array de errores de validación (ej: [{ field, message }, { path, message }])
    if (Array.isArray(errData.errors) && errData.errors.length > 0) {
      const details = errData.errors
        .map((e: any) => {
          if (typeof e === 'string') return e;
          const f = e.field || e.campo || e.property || e.path || '';
          const m = e.message || e.mensaje || e.error || JSON.stringify(e);
          return f ? `[${f}]: ${m}` : m;
        })
        .join('; ');
      const baseMsg = errData.message || 'Error de validación fiscal';
      return `${baseMsg} -> ${details}`;
    }

    // 2. Diccionario de errores por campo (ej: { errors: { RNCComprador: ['RNC no válido'] } })
    if (errData.errors && typeof errData.errors === 'object' && !Array.isArray(errData.errors)) {
      const entries = Object.entries(errData.errors)
        .map(([field, val]) => {
          const text = Array.isArray(val) ? val.join(', ') : String(val);
          return `[${field}]: ${text}`;
        })
        .join('; ');
      if (entries) {
        return `${errData.message || 'Errores de validación'}: ${entries}`;
      }
    }

    // 3. Campo 'details' o 'errores'
    if (errData.details || errData.detail || errData.errores) {
      const d = errData.details || errData.detail || errData.errores;
      if (typeof d === 'string') {
        return `${errData.message ? errData.message + ': ' : ''}${d}`;
      }
      if (Array.isArray(d)) {
        return `${errData.message || 'Detalle'}: ${d.map((x) => (typeof x === 'object' ? x.message || x.mensaje || JSON.stringify(x) : x)).join('; ')}`;
      }
    }

    // 4. Error explícito devuelto por DGII (ej: rechazo con código tributario)
    if (errData.dgii_error || errData.dgii_message || errData.codigoDgii || errData.dgiiCode) {
      const code = errData.dgiiCode || errData.codigoDgii || '';
      const msg = errData.dgii_message || errData.dgii_error || errData.message || '';
      return `Rechazo DGII${code ? ' [' + code + ']' : ''}: ${msg}`;
    }

    // 5. Mensaje directo o error general
    const finalMsg = errData.message || errData.error || errData.title || statusText || 'Error no especificado por FiscalBridge';
    return statusHttp ? `${finalMsg} (HTTP ${statusHttp})` : finalMsg;
  }

  /**
   * Transmite una factura electrónica a FiscalBridge
   */
  async transmitInvoice(invoice: any, empresa: any) {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const payload = this.buildEcfPayload(invoice, empresa);

    this.logger.log(
      `Transmitiendo factura ${invoice.numeroFactura} (${invoice.ncf}) a FiscalBridge...`,
    );

    const res = await this.request(`${baseUrl}/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const formattedError = this.parseFiscalBridgeError(errData, res.statusText, res.status);
      this.logger.error(
        `FiscalBridge rechazó factura ${invoice.numeroFactura}: ${formattedError}`,
      );
      throw new BadRequestException(
        `FiscalBridge rechazó la factura: ${formattedError}`,
      );
    }

    const data = await res.json();
    return {
      documentUuid:
        data.documentUuid || data.document_uuid || data.uuid || data.id,
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
    const res = await this.request(`${baseUrl}/documents/${documentUuid}/pdf`, {
      headers,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new BadRequestException(
        `No se pudo obtener el PDF de FiscalBridge: ${msg}`,
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Descarga el XML fiscal firmado por el emisor y procesado por FiscalBridge
   */
  async getXmlBuffer(documentUuid: string, empresa: any): Promise<Buffer> {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const res = await this.request(`${baseUrl}/documents/${documentUuid}/xml`, {
      headers,
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new BadRequestException(
        `No se pudo obtener el XML de FiscalBridge: ${msg}`,
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Consulta el estado de un documento en FiscalBridge
   */
  async getDocumentStatus(documentUuid: string, empresa: any): Promise<any> {
    const { headers, baseUrl } = await this.getAuthHeaders(empresa);
    const res = await this.request(`${baseUrl}/documents/${documentUuid}/status`, {
      headers,
    });
    if (!res.ok) {
      return { status: 'UNKNOWN' };
    }
    return res.json();
  }
}
