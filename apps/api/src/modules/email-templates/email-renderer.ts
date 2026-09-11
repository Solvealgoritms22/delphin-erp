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
  String(value ?? '').replace(
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
  const design = definition.editable ? (custom ?? definition) : definition;
  validateDesign(key, design);
  const fill = (value: string, escapeVal = true) =>
    value.replace(/{{\s*([^{}]+?)\s*}}/g, (_, name: string) => {
      if (!Object.hasOwn(values, name))
        throw new BadRequestException('Falta la variable ' + name);
      return escapeVal ? escapeEmail(values[name]) : values[name];
    });
  const subject = fill(design.subject, false)
    .replace(/[\r\n\x00-\x1f]/g, ' ')
    .slice(0, 200);
  const heading = fill(design.heading, false);
  const brand = definition.editable
    ? values.company || 'Dolphin ERP'
    : 'Dolphin ERP';

  // Procesar el cuerpo (detectar HTML o texto plano)
  const isHtml = /<[a-z][\s\S]*>/i.test(design.body);
  let renderedBody = isHtml
    ? sanitizeEmailHtml(fill(design.body, true))
    : escapeEmail(fill(design.body, false)).replace(/\n/g, '<br>');

  const attachments = [
    {
      filename: 'dolphin.png',
      content: Buffer.from(DOLPHIN_LOGO_BASE64, 'base64'),
      cid: 'dolphin-brand',
      contentType: 'image/png',
    },
  ];
  renderedBody = renderedBody.replace(
    /src="data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/=]+)"/g,
    (_, type: string, data: string) => {
      const cid = 'email-image-' + attachments.length;
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

  const html =
    '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f5f9;color:#0f172a;font:15px/1.65 Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-top:4px solid ' +
    design.accent +
    ';border-radius:8px"><tr><td style="padding:32px"><table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:28px"><tr><td style="width:52px;padding-right:12px"><img src="cid:dolphin-brand" alt="Dolphin ERP" width="48" height="43" style="display:block;border:0"></td><td style="font-size:18px;font-weight:700;color:#0f172a">Dolphin ERP<br><span style="font-size:11px;font-weight:400;letter-spacing:1px;color:#64748b">GESTIÓN EMPRESARIAL</span></td></tr></table><p style="font-size:12px;font-weight:700;letter-spacing:1px;color:#475569">' +
    escapeEmail(brand) +
    '</p><h1 style="font-size:24px;line-height:1.3">' +
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
    '</p><p style="color:#64748b;font-size:12px">Dolphin ERP</p></td></tr></table></td></tr></table></body></html>';

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
      brand,
      heading,
      plainBody,
      plainAction,
      ...rows.map((row) => row.label + ': ' + row.value),
      blocks.message,
      footerText,
    ]
      .filter(Boolean)
      .join('\n\n'),
  };
}
