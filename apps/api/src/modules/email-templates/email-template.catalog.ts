import { BadRequestException } from '@nestjs/common';
import { NOTIFICATION_CATALOG } from '../notifications/notification.catalog';

export type EmailScope = 'system' | 'tenant';

export interface EmailDefinition extends EmailDesign {
  editable: boolean;
  variables: readonly string[];
  scope: EmailScope;
  name?: string;
  category?: string;
}
export const notificationEmailKey = (type: string) => `notification_${type}`;
const notificationTemplates: Record<string, EmailDefinition> =
  Object.fromEntries(
    NOTIFICATION_CATALOG.map((event) => [
      notificationEmailKey(event.id),
      {
        editable: true,
        scope: 'tenant',
        name: event.name,
        category: event.categoryLabel,
        subject: '{{title}} · {{company}}',
        heading: '{{title}}',
        body: 'Hola {{name}},\n\nHay una actualización de {{company}} que requiere tu atención.',
        footer:
          'Recibes este aviso según tus preferencias de notificaciones en {{company}}.',
        accent:
          event.severity === 'CRITICAL'
            ? '#e11d48'
            : event.severity === 'WARNING'
              ? '#d97706'
              : event.severity === 'SUCCESS'
                ? '#059669'
                : '#2563eb',
        variables: ['name', 'company', 'title', 'message'],
      },
    ]),
  );

export interface EmailDesign {
  subject: string;
  heading: string;
  body: string;
  footer: string;
  accent: string;
}
export const EMAIL_CATALOG: Record<string, EmailDefinition> = {
  ...notificationTemplates,
  quote: {
    editable: true,
    scope: 'tenant',
    subject: 'Cotización {{documentNumber}} · {{company}}',
    heading: 'Tu cotización está lista',
    body: 'Hola {{name}},\n\nGracias por tu interés en {{company}}. A continuación encontrarás nuestra propuesta comercial.\n\nQuedamos a tu disposición para cualquier consulta.',
    footer: 'Gracias por confiar en {{company}}.',
    accent: '#2563eb',
    variables: ['name', 'company', 'documentNumber', 'total', 'currency'],
  },
  invitation: {
    editable: true,
    scope: 'tenant',
    subject: 'Invitación al equipo de {{company}}',
    heading: 'Te damos la bienvenida',
    body: 'Hola {{name}},\n\nTe invitamos a colaborar con {{company}}. Activa tu cuenta para configurar tu acceso de forma segura.',
    footer: 'Si no esperabas esta invitación, puedes ignorar este mensaje.',
    accent: '#2563eb',
    variables: ['name', 'company'],
  },
  collaborator_code: {
    editable: true,
    scope: 'tenant',
    subject: 'Recuperación de acceso · {{company}}',
    heading: 'Recupera tu acceso',
    body: 'Hola {{name}},\n\nRecibimos una solicitud para recuperar tu acceso a {{company}}. Utiliza el código que aparece a continuación.',
    footer: 'Si no solicitaste este cambio, ignora este mensaje.',
    accent: '#2563eb',
    variables: ['name', 'company', 'code'],
  },
  verification: {
    editable: false,
    scope: 'system',
    subject: 'Verifica tu cuenta · Dolphin ERP',
    heading: 'Confirma tu correo electrónico',
    body: 'Hola {{name}},\n\nTe damos la bienvenida a Dolphin ERP. Usa el siguiente código para verificar tu cuenta.',
    footer: 'Si no creaste esta cuenta, puedes ignorar este mensaje.',
    accent: '#2563eb',
    variables: ['name', 'company', 'code'],
  },
  recovery: {
    editable: false,
    scope: 'system',
    subject: 'Recupera tu acceso · Dolphin ERP',
    heading: 'Recuperación de cuenta',
    body: 'Hola {{name}},\n\nRecibimos una solicitud de recuperación. Usa el siguiente código para continuar.',
    footer: 'Si no solicitaste este cambio, ignora este mensaje.',
    accent: '#2563eb',
    variables: ['name', 'company', 'code'],
  },
  notification: {
    editable: true,
    scope: 'tenant',
    subject: '{{title}} · {{company}}',
    heading: '{{title}}',
    body: 'Tienes una nueva actualización en {{company}}.',
    footer: 'Este es un aviso automático de {{company}}.',
    accent: '#2563eb',
    variables: ['name', 'company', 'title', 'message'],
  },
};
export type EmailKey = keyof typeof EMAIL_CATALOG;
export function isSystemEmail(key: string): boolean {
  return EMAIL_CATALOG[key]?.scope === 'system';
}
export function emailDefinition(key: string) {
  if (!Object.hasOwn(EMAIL_CATALOG, key))
    throw new BadRequestException('Plantilla desconocida');
  return EMAIL_CATALOG[key];
}
export function validateDesign(key: string, design: EmailDesign) {
  const definition = emailDefinition(key);
  for (const [field, max] of [
    ['subject', 200],
    ['heading', 160],
    ['body', 250000],
    ['footer', 1000],
  ] as const) {
    const value = design[field];
    if (typeof value !== 'string' || !value.trim() || value.length > max)
      throw new BadRequestException(
        'Contenido de plantilla inválido: ' + field,
      );
    if ((field === 'subject' || field === 'heading') && /[\r\n]/.test(value))
      throw new BadRequestException(
        'El asunto y título deben ocupar una sola línea',
      );
    for (const match of value.matchAll(/{{\s*([^{}]+?)\s*}}/g))
      if (!definition.variables.includes(match[1]))
        throw new BadRequestException('Variable no permitida: ' + match[1]);
    if (/[{}]/.test(value.replace(/{{\s*[^{}]+?\s*}}/g, '')))
      throw new BadRequestException('Sintaxis de variables inválida');
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(design.accent))
    throw new BadRequestException('Color inválido');
}
