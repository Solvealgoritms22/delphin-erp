import {
  Injectable,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import {
  EMAIL_CATALOG,
  EmailDesign,
  EmailKey,
  emailDefinition,
  validateDesign,
} from './email-template.catalog';
import { DOLPHIN_LOGO_BASE64 } from './email-logo';
import { EmailBlocks, renderEmail } from './email-renderer';

@Injectable()
export class EmailTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}
  async assertOwner(
    empresaId: string,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    if (!empresaId || !userId)
      throw new ForbiddenException('Empresa y propietario requeridos');
    const company = await db.empresa.findFirst({
      where: { id: empresaId, propietarioId: userId, estado: 'ACTIVA' },
      select: { razonSocial: true },
    });
    if (!company)
      throw new ForbiddenException(
        'Solo el propietario puede gestionar las plantillas',
      );
    return company;
  }
  async list(empresaId: string, userId: string) {
    const company = await this.assertOwner(empresaId, userId);
    const saved = await this.prisma.emailTemplate.findMany({
      where: { empresaId },
    });
    return {
      company: company.razonSocial,
      templates: Object.entries(EMAIL_CATALOG).map(([key, definition]) => {
        const custom = saved.find((row) => row.key === key);
        return {
          key,
          ...definition,
          ...(definition.editable && custom ? custom : {}),
          revision: custom?.revision ?? 0,
          customized:
            !!custom &&
            ['subject', 'heading', 'body', 'footer', 'accent'].some(
              (field) => custom[field] !== definition[field],
            ),
        };
      }),
    };
  }
  async save(
    empresaId: string,
    userId: string,
    key: string,
    design: EmailDesign,
    revision: number,
    ip?: string,
  ) {
    const definition = emailDefinition(key);
    if (!definition.editable)
      throw new ForbiddenException('Esta plantilla pertenece al sistema');
    validateDesign(key, design);
    // Explicit projection: never accept tenant, ID or revision increments from the body.
    const fields = {
      subject: design.subject,
      heading: design.heading,
      body: design.body,
      footer: design.footer,
      accent: design.accent,
    };
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.assertOwner(empresaId, userId, tx);
        let row;
        if (revision === 0) {
          row = await tx.emailTemplate.create({
            data: { empresaId, key, ...fields },
          });
        } else {
          const changed = await tx.emailTemplate.updateMany({
            where: { empresaId, key, revision },
            data: { ...fields, revision: { increment: 1 } },
          });
          if (changed.count !== 1)
            throw new ConflictException(
              'La plantilla cambió; recarga antes de guardar',
            );
          row = await tx.emailTemplate.findUniqueOrThrow({
            where: { empresaId_key: { empresaId, key } },
          });
        }
        await this.audit(
          tx,
          empresaId,
          userId,
          key,
          'UPDATE',
          row.revision,
          ip,
        );
        return {
          ...row,
          ...{ editable: definition.editable, variables: definition.variables },
          customized: Object.keys(fields).some(
            (field) => fields[field] !== definition[field],
          ),
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException(
          'La plantilla cambió; recarga antes de guardar',
        );
      throw error;
    }
  }
  async reset(
    empresaId: string,
    userId: string,
    key: string,
    revision: number,
    ip?: string,
  ) {
    // Keep a monotonically increasing revision, including resets (prevents ABA overwrites).
    const restored = await this.save(
      empresaId,
      userId,
      key,
      emailDefinition(key),
      revision,
      ip,
    );
    return { ...restored, ...emailDefinition(key), customized: false };
  }
  async preview(
    empresaId: string,
    userId: string,
    key: EmailKey,
    design?: EmailDesign,
  ) {
    const company = await this.assertOwner(empresaId, userId);
    const definition = emailDefinition(key);
    const preview = renderEmail(
      key,
      {
        company: company.razonSocial,
        name: 'Cliente de demostración',
        documentNumber: 'COT-DEMO',
        total: '1,180.00',
        currency: 'DOP',
        title: 'Notificación de demostración',
        message:
          'Este contenido es una vista previa; no se envía ningún correo.',
      },
      definition.editable ? design : undefined,
      {
        message: key.startsWith('notification')
          ? 'Este contenido es una vista previa; no se envía ningún correo.'
          : undefined,
        code: '123456',
        actionUrl: 'https://example.invalid/auth/accept-invitation?token=DEMO',
        ...(key === 'quote'
          ? {
              rows: [
                { label: 'Servicio de demostración', value: 'DOP 1,180.00' },
              ],
            }
          : {}),
      },
    );
    return {
      subject: preview.subject,
      html: preview.attachments.reduce(
        (html, a) =>
          html.replaceAll(
            'cid:' + a.cid,
            'data:' + a.contentType + ';base64,' + a.content.toString('base64'),
          ),
        preview.html,
      ),
      text: preview.text,
    };
  }
  async render(
    empresaId: string,
    key: EmailKey,
    values: Record<string, string>,
    blocks: EmailBlocks = {},
  ) {
    const definition = emailDefinition(key);
    const custom = definition.editable
      ? await this.prisma.emailTemplate.findUnique({
          where: { empresaId_key: { empresaId, key } },
        })
      : null;
    return renderEmail(key, values, custom, blocks);
  }
  private async audit(
    tx: Prisma.TransactionClient,
    empresaId: string,
    usuarioId: string,
    key: string,
    accion: string,
    revision: number,
    ipAddress?: string,
  ) {
    const data = {
      empresaId,
      usuarioId,
      accion,
      resourceId: key,
      resourceName: key,
      resourceType: 'EmailTemplate',
      ipAddress,
      metadata: { revision },
    };
    await this.activity.log({ ...data, modulo: 'EMAIL_TEMPLATES' }, tx);
    if (
      key === 'invitation' ||
      key === 'collaborator_code' ||
      key.startsWith('notification_SECURITY') ||
      key === 'notification_API_KEY_EVENT'
    )
      await this.activity.log(
        {
          ...data,
          modulo: 'SECURITY',
          metadata: {
            revision,
            event: 'EMAIL_TEMPLATE_UPDATED',
            severity: 'INFO',
            action: 'UPDATED',
          },
        },
        tx,
      );
  }
}
