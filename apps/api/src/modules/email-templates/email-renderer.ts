import { BadRequestException } from '@nestjs/common';
import { EmailDesign, EmailKey, emailDefinition, validateDesign } from './email-template.catalog';

export const escapeEmail = (value: unknown) => String(value ?? '').replace(/[&<>"']/g,
  char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));

export interface EmailBlocks {
  code?: string;
  actionUrl?: string;
  rows?: Array<{label:string; value:string}>;
  message?: string;
}

export function sanitizeEmailHtml(html: string): string {
  // Remover tags peligrosos completos
  let clean = html.replace(/<\s*(script|style|iframe|object|embed|form|input|button|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  clean = clean.replace(/<\s*(script|style|iframe|object|embed|form|input|button|meta|link)[^>]*>/gi, '');
  // Remover event handlers on* (onclick, onerror, etc.)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');
  // Bloquear esquemas javascript: y data: que no sean imágenes
  clean = clean.replace(/(href|src)\s*=\s*['"]\s*javascript:[^'"]*['"]/gi, '$1="#"');
  clean = clean.replace(/(href)\s*=\s*['"]\s*data:[^'"]*['"]/gi, '$1="#"');
  // Formatear imágenes para clientes de correo
  clean = clean.replace(/<img\b([^>]*)>/gi, (_, attrs) => {
    let styleAttr = 'max-width:100%;height:auto;border-radius:6px;margin:8px 0;display:inline-block;';
    if (/style\s*=\s*['"]([^'"]*)['"]/i.test(attrs)) {
      return `<img ${attrs.replace(/style\s*=\s*['"]([^'"]*)['"]/i, `style="${styleAttr} $1"`)}>`;
    }
    return `<img ${attrs.trim()} style="${styleAttr}">`;
  });
  return clean;
}

export function renderEmail(key: EmailKey, values: Record<string,string>, custom?: EmailDesign | null, blocks: EmailBlocks = {}) {
  const definition = emailDefinition(key);
  const design = custom ?? definition;
  validateDesign(key,design);
  const fill = (value:string, escapeVal = true) => value.replace(/{{\s*([^{}]+?)\s*}}/g, (_,name:string) => {
    if (!Object.hasOwn(values,name)) throw new BadRequestException('Falta la variable '+name);
    return escapeVal ? escapeEmail(values[name]) : values[name];
  });
  const subject = fill(design.subject).replace(/[\r\n\x00-\x1f]/g,' ').slice(0,200);
  const heading = fill(design.heading);
  const brand = definition.editable ? values.company || 'Dolphin ERP' : 'Dolphin ERP';
  
  // Procesar el cuerpo (detectar HTML o texto plano)
  const isHtml = /<[a-z][\s\S]*>/i.test(design.body);
  const renderedBody = isHtml
    ? sanitizeEmailHtml(fill(design.body, true))
    : escapeEmail(fill(design.body, false)).replace(/\n/g,'<br>');

  let security = '', action = '', plainAction = '';
  if (['verification','recovery','collaborator_code'].includes(key)) {
    if (!/^\d{6}$/.test(blocks.code || '')) throw new BadRequestException('Código requerido');
    security = '<p style="font-size:32px;letter-spacing:8px;font-weight:700">'+blocks.code+'</p><p>Este código expira en 15 minutos. No lo compartas con nadie.</p>';
    plainAction = '\n'+blocks.code+'\nEste código expira en 15 minutos. No lo compartas con nadie.';
  }
  if (key === 'invitation') {
    let url:URL;
    try { url = new URL(blocks.actionUrl || ''); } catch { throw new BadRequestException('Enlace de activación inválido'); }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname) && process.env.NODE_ENV !== 'production'))
      throw new BadRequestException('La activación requiere HTTPS');
    action = '<p style="margin:28px 0"><a style="display:inline-block;background:'+design.accent+';color:#ffffff;padding:14px 24px;text-decoration:none;border-radius:6px" href="'+escapeEmail(url.href)+'">Activar mi cuenta</a></p><p>Este enlace expira en 48 horas. Si el botón no funciona, copia esta dirección:</p><p style="overflow-wrap:anywhere">'+escapeEmail(url.href)+'</p>';
    plainAction = '\nActivar mi cuenta: '+url.href+'\nEste enlace expira en 48 horas.';
  }
  const rows = blocks.rows ?? [];
  const detail = rows.length ? '<table role="presentation" width="100%" style="border-collapse:collapse;margin:24px 0">'+rows.map(row=>'<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">'+escapeEmail(row.label)+'</td><td style="padding:10px;text-align:right;border-bottom:1px solid #e2e8f0">'+escapeEmail(row.value)+'</td></tr>').join('')+'</table>' : '';
  const paragraphs = (text:string) => escapeEmail(text).replace(/\n/g,'<br>');
  const footerText = fill(design.footer, true);

  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f5f9;color:#0f172a;font:15px/1.65 Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 12px"><table role="presentation" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-top:4px solid '+design.accent+';border-radius:8px"><tr><td style="padding:32px"><p style="font-size:13px;font-weight:700;letter-spacing:1px;color:#475569">'+escapeEmail(brand)+'</p><h1 style="font-size:24px;line-height:1.3">'+escapeEmail(heading)+'</h1><div style="font-size:15px;line-height:1.65;color:#334155">'+renderedBody+'</div>'+security+action+detail+(blocks.message ? '<p>'+paragraphs(blocks.message)+'</p>':'')+'<hr style="border:0;border-top:1px solid #e2e8f0"><p style="color:#64748b;font-size:13px">'+paragraphs(footerText)+'</p><p style="color:#64748b;font-size:12px">Dolphin ERP</p></td></tr></table></td></tr></table></body></html>';
  
  const plainBody = isHtml ? renderedBody.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '').trim() : fill(design.body, false);
  return {subject,html,text:[brand,heading,plainBody,plainAction,...rows.map(row=>row.label+': '+row.value),blocks.message,footerText].filter(Boolean).join('\n\n')};
}
