import sanitizeHtml from 'sanitize-html';
import { DOLPHIN_LOGO_BASE64 } from './email-logo';
import { BadRequestException } from '@nestjs/common';
import {
  EmailDesign,
  EmailKey,
  emailDefinition,
  validateDesign,
} from './email-template.catalog';

export const escapeEmail = (value: unknown) =>
  (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : '').replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!,
  );

export interface EmailBlocks {
  code?: string;
  actionUrl?: string;
  rows?: Array<{ label: string; value: string }>;
  message?: string;
  companyLogo?: string;
}

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'blockquote',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'hr',
      'a',
      'img',
      'span',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'style'],
      '*': ['style'],
    },
    allowedSchemes: ['https', 'mailto'],
    allowedSchemesByTag: { img: ['https', 'data'] },
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center)$/],
        color: [/^#[0-9a-f]{3,6}$/i],
        'font-weight': [/^(normal|bold|[1-9]00)$/],
        'max-width': [/^100%$/],
        height: [/^auto$/],
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
      img: (_tag, attrs) => {
        if (
          /^data:/i.test(attrs.src || '') &&
          !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            attrs.src,
          )
        )
          delete attrs.src;
        return {
          tagName: 'img',
          attribs: { ...attrs, style: 'max-width:100%;height:auto' },
        };
      },
    },
  });
}

export function renderEmail(
  key: EmailKey,
  values: Record<string, string>,
  custom?: EmailDesign | null,
  blocks: EmailBlocks = {},
) {
  const definition = emailDefinition(key);
  const isSystem = definition.scope === 'system';
  const design =
    isSystem || !definition.editable ? definition : (custom ?? definition);
  validateDesign(key, design);
  const effectiveValues: Record<string, string> = {
    company: isSystem ? 'Dolphin ERP' : values.company || 'Dolphin ERP',
    ...values,
  };
  const fill = (value: string, escapeVal = true) =>
    value.replace(/{{\s*([^{}]+?)\s*}}/g, (_, name: string) => {
      if (!Object.hasOwn(effectiveValues, name))
        throw new BadRequestException('Falta la variable ' + name);
      return escapeVal
        ? escapeEmail(effectiveValues[name])
        : effectiveValues[name];
    });
  const subject = fill(design.subject, false)
    .split('').map(char => char.charCodeAt(0) < 32 ? ' ' : char).join('')
    .slice(0, 200);
  const heading = fill(design.heading, false);
  const brand = isSystem
    ? 'Dolphin ERP'
    : effectiveValues.company || 'Dolphin ERP';

  // Procesar el cuerpo (detectar HTML o texto plano)
  const isHtml = /<[a-z][\s\S]*>/i.test(design.body);
  let renderedBody = isHtml
    ? sanitizeEmailHtml(fill(design.body, true))
    : escapeEmail(fill(design.body, false)).replace(/\n/g, '<br>');

  const attachments: Array<{
    filename: string;
    content: Buffer;
    cid: string;
    contentType: string;
  }> = [];

  let headerHtml = '';

  if (isSystem) {
    // El logo de Dolphin ERP solo va en plantillas del sistema
    attachments.push({
      filename: 'dolphin.png',
      content: Buffer.from(DOLPHIN_LOGO_BASE64, 'base64'),
      cid: 'dolphin-brand',
      contentType: 'image/png',
    });
    headerHtml =
      '<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:28px"><tr>' +
      '<td style="width:52px;padding-right:12px"><img src="cid:dolphin-brand" alt="Dolphin ERP" width="48" height="43" style="display:block;border:0"></td>' +
      '<td style="font-size:18px;font-weight:700;color:#0f172a">Dolphin ERP<br><span style="font-size:11px;font-weight:400;letter-spacing:1px;color:#64748b">GESTIÓN EMPRESARIAL</span></td>' +
      '</tr></table>';
  } else {
    // Plantillas de empresa / cuenta propietaria:
    // Nunca incluir el logo de Dolphin ERP.
    // Usar el logo de la empresa si existe; si no, usar el nombre de la empresa como cabecera.
    const companyLogo = values.companyLogo || blocks.companyLogo;
    let logoImageSrc = '';

    if (companyLogo && typeof companyLogo === 'string') {
      const dataUriMatch = companyLogo.match(
        /^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=]+)$/i,
      );
      if (dataUriMatch) {
        const rawExt = dataUriMatch[1].toLowerCase();
        const ext = rawExt === 'jpg' ? 'jpeg' : rawExt;
        const b64Data = dataUriMatch[2];
        const cid = 'company-logo';
        attachments.push({
          filename: `company-logo.${ext}`,
          content: Buffer.from(b64Data, 'base64'),
          cid,
          contentType: `image/${ext}`,
        });
        logoImageSrc = `cid:${cid}`;
      } else if (/^https?:\/\//i.test(companyLogo)) {
        logoImageSrc = escapeEmail(companyLogo);
      }
    }

    if (logoImageSrc) {
      headerHtml =
        '<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px"><tr>' +
        '<td><img src="' +
        logoImageSrc +
        '" alt="' +
        escapeEmail(brand) +
        '" style="max-height:50px;max-width:220px;display:block;border:0"></td>' +
        '</tr></table>';
    } else {
      headerHtml =
        '<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:24px"><tr>' +
        '<td><span style="font-size:22px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;display:inline-block">' +
        escapeEmail(brand) +
        '</span></td>' +
        '</tr></table>';
    }
  }

  renderedBody = renderedBody.replace(
    /src="data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)"/g,
    (_, type: string, data: string) => {
      const cid = 'email-image-' + (attachments.length + 1);
      attachments.push({
        filename: cid + '.' + type,
        content: Buffer.from(data, 'base64'),
        cid,
        contentType: 'image/' + type,
      });
      return 'src="cid:' + cid + '"';
    },
  );
  let security = '',
    action = '',
    plainAction = '';
  if (['verification', 'recovery', 'collaborator_code'].includes(key)) {
    if (!/^\d{6}$/.test(blocks.code || ''))
      throw new BadRequestException('Código requerido');
    security =
      '<p style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;text-align:center;color:#1d4ed8;font-size:32px;letter-spacing:8px;font-weight:700">' +
      blocks.code +
      '</p><p>Este código expira en 15 minutos. No lo compartas con nadie.</p>';
    plainAction =
      '\n' +
      blocks.code +
      '\nEste código expira en 15 minutos. No lo compartas con nadie.';
  }
  if (key === 'invitation') {
    let url: URL;
    try {
      url = new URL(blocks.actionUrl || '');
    } catch {
      throw new BadRequestException('Enlace de activación inválido');
    }
    if (
      url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname) &&
        process.env.NODE_ENV !== 'production'
      )
    )
      throw new BadRequestException('La activación requiere HTTPS');
    action =
      '<p style="margin:28px 0"><a style="display:inline-block;background:' +
      design.accent +
      ';color:#ffffff;padding:14px 24px;text-decoration:none;border-radius:6px" href="' +
      escapeEmail(url.href) +
      '">Activar mi cuenta</a></p><p>Este enlace expira en 48 horas. Si el botón no funciona, copia esta dirección:</p><p style="overflow-wrap:anywhere">' +
      escapeEmail(url.href) +
      '</p>';
    plainAction =
      '\nActivar mi cuenta: ' + url.href + '\nEste enlace expira en 48 horas.';
  }
  const rows = blocks.rows ?? [];
  const detail = rows.length
    ? '<table role="presentation" width="100%" style="border-collapse:collapse;margin:24px 0">' +
      rows
        .map(
          (row) =>
            '<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">' +
            escapeEmail(row.label) +
            '</td><td style="padding:10px;text-align:right;border-bottom:1px solid #e2e8f0">' +
            escapeEmail(row.value) +
            '</td></tr>',
        )
        .join('') +
      '</table>'
    : '';
  const paragraphs = (text: string) => escapeEmail(text).replace(/\n/g, '<br>');
  const footerText = fill(design.footer, false);

  const scrollbarStyles =
    '<style>' +
    'html,body,*{scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent}' +
    '::-webkit-scrollbar{width:6px;height:6px}' +
    '::-webkit-scrollbar-button{display:none!important;width:0!important;height:0!important}' +
    '::-webkit-scrollbar-track{background:transparent}' +
    '::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:9999px}' +
    '::-webkit-scrollbar-thumb:hover{background:#94a3b8}' +
    '::-webkit-scrollbar-corner{background:transparent}' +
    '@media(prefers-color-scheme:dark){html,body,*{scrollbar-color:#525252 transparent}::-webkit-scrollbar-thumb{background:#525252}::-webkit-scrollbar-thumb:hover{background:#737373}}' +
    '</style>';

  let signatureHtml = '';
  if (!isSystem) {
    attachments.push({
      filename: 'dolphin.png',
      content: Buffer.from(DOLPHIN_LOGO_BASE64, 'base64'),
      cid: 'dolphin-signature',
      contentType: 'image/png',
    });
    signatureHtml =
      '<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:20px;border-top:1px solid #f1f5f9;padding-top:14px">' +
      '<tr>' +
      '<td style="vertical-align:middle;padding-right:8px;line-height:0">' +
      '<img src="cid:dolphin-signature" alt="Dolphin ERP" width="20" height="18" style="display:block;border:0;opacity:0.85">' +
      '</td>' +
      '<td style="vertical-align:middle;font-size:11px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;line-height:1">' +
      'Enviado con <strong style="color:#64748b;font-weight:600">Dolphin ERP</strong>' +
      '</td>' +
      '</tr>' +
      '</table>';
  }

  const html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    scrollbarStyles +
    '</head><body style="margin:0;background:#f1f5f9;color:#0f172a;font:15px/1.65 Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-top:4px solid ' +
    design.accent +
    ';border-radius:8px"><tr><td style="padding:32px">' +
    headerHtml +
    '<h1 style="font-size:24px;line-height:1.3">' +
    escapeEmail(heading) +
    '</h1><div style="font-size:15px;line-height:1.65;color:#334155">' +
    renderedBody +
    '</div>' +
    security +
    action +
    detail +
    (blocks.message ? '<p>' + paragraphs(blocks.message) + '</p>' : '') +
    '<hr style="border:0;border-top:1px solid #e2e8f0"><p style="color:#64748b;font-size:13px">' +
    paragraphs(footerText) +
    '</p><p style="color:#64748b;font-size:12px">' +
    (isSystem ? 'Dolphin ERP' : escapeEmail(brand)) +
    '</p>' +
    signatureHtml +
    '</td></tr></table></td></tr></table></body></html>';

  const plainBody = isHtml
    ? renderedBody
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .trim()
    : fill(design.body, false);
  return {
    subject,
    html,
    attachments,
    text: [
      isSystem ? 'Dolphin ERP' : brand,
      heading,
      plainBody,
      plainAction,
      ...rows.map((row) => row.label + ': ' + row.value),
      blocks.message,
      footerText,
      isSystem ? 'Dolphin ERP' : brand,
      !isSystem ? 'Enviado con Dolphin ERP' : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
