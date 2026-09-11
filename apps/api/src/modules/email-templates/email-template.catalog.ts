import { BadRequestException } from '@nestjs/common';

export interface EmailDesign { subject: string; heading: string; body: string; footer: string; accent: string; }
export const EMAIL_CATALOG = {
  quote: { editable:true, subject:'Cotización {{documentNumber}} · {{company}}', heading:'Tu cotización está lista',
    body:'Hola {{name}},\n\nGracias por tu interés en {{company}}. A continuación encontrarás nuestra propuesta comercial.\n\nQuedamos a tu disposición para cualquier consulta.',
    footer:'Gracias por confiar en {{company}}.', accent:'#2563eb', variables:['name','company','documentNumber','total','currency'] },
  invitation: { editable:true, subject:'Invitación al equipo de {{company}}', heading:'Te damos la bienvenida',
    body:'Hola {{name}},\n\nTe invitamos a colaborar con {{company}} en Dolphin ERP. Activa tu cuenta para configurar tu acceso de forma segura.',
    footer:'Si no esperabas esta invitación, puedes ignorar este mensaje.', accent:'#2563eb', variables:['name','company'] },
  collaborator_code: { editable:true, subject:'Recuperación de acceso · {{company}}', heading:'Recupera tu acceso',
    body:'Hola {{name}},\n\nRecibimos una solicitud para recuperar tu acceso a {{company}}. Utiliza el código que aparece a continuación.',
    footer:'Si no solicitaste este cambio, ignora este mensaje.', accent:'#2563eb', variables:['name','company'] },
  verification: { editable:false, subject:'Verifica tu cuenta · Dolphin ERP', heading:'Confirma tu correo electrónico',
    body:'Hola {{name}},\n\nTe damos la bienvenida a Dolphin ERP. Usa el siguiente código para verificar tu cuenta.',
    footer:'Si no creaste esta cuenta, puedes ignorar este mensaje.', accent:'#2563eb', variables:['name'] },
  recovery: { editable:false, subject:'Recupera tu acceso · Dolphin ERP', heading:'Recuperación de cuenta',
    body:'Hola {{name}},\n\nRecibimos una solicitud de recuperación. Usa el siguiente código para continuar.',
    footer:'Si no solicitaste este cambio, ignora este mensaje.', accent:'#2563eb', variables:['name'] },
  notification: { editable:false, subject:'{{title}}', heading:'{{title}}', body:'{{message}}',
    footer:'Este es un aviso automático de Dolphin ERP.', accent:'#2563eb', variables:['title','message'] },
} as const;
export type EmailKey = keyof typeof EMAIL_CATALOG;
export function emailDefinition(key: string) {
  if (!Object.hasOwn(EMAIL_CATALOG,key)) throw new BadRequestException('Plantilla desconocida');
  return EMAIL_CATALOG[key as EmailKey];
}
export function validateDesign(key: string, design: EmailDesign) {
  const definition = emailDefinition(key);
  for (const [field,max] of [['subject',200],['heading',160],['body',250000],['footer',1000]] as const) {
    const value = design[field];
    if (typeof value !== 'string' || !value.trim() || value.length > max)
      throw new BadRequestException('Contenido de plantilla inválido: '+field);
    if ((field === 'subject' || field === 'heading') && /[\r\n]/.test(value))
      throw new BadRequestException('El asunto y título deben ocupar una sola línea');
    for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}/g))
      if (!(definition.variables as readonly string[]).includes(match[1]))
        throw new BadRequestException('Variable no permitida: '+match[1]);
    if (/[{}]/.test(value.replace(/{{\s*[^{}]+?\s*}}/g,'')))
      throw new BadRequestException('Sintaxis de variables inválida');
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(design.accent)) throw new BadRequestException('Color inválido');
}
