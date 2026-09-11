import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Resend } from 'resend';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import {
  EMAIL_CATALOG,
  notificationEmailKey,
} from '../email-templates/email-template.catalog';
import { renderEmail } from '../email-templates/email-renderer';

@Injectable()
export class NotificationEmailService {
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : undefined;
  constructor(
    private readonly mailer: MailerService,
    private readonly templates: EmailTemplatesService,
    private readonly prisma: PrismaService,
  ) {}

  async send(
    to: string,
    title: string,
    message: string,
    context: {
      empresaId?: string;
      tipo: string;
      name: string;
      deliveryId: string;
    },
  ): Promise<string | undefined> {
    const company = context.empresaId
      ? await this.prisma.empresa.findUnique({
          where: { id: context.empresaId },
          select: { razonSocial: true },
        })
      : null;
    if (context.empresaId && !company)
      throw new Error('Notification company unavailable');
    const key = notificationEmailKey(context.tipo);
    const values = {
      company: company?.razonSocial || 'Dolphin ERP',
      name: context.name,
      title,
      message,
    };
    // The actual event message is a protected block: template edits cannot suppress critical facts.
    const email =
      context.empresaId && Object.hasOwn(EMAIL_CATALOG, key)
        ? await this.templates.render(context.empresaId, key, values, {
            message,
          })
        : renderEmail('notification', values, undefined, { message });
    if (process.env.EMAIL_PROVIDER === 'resend') {
      if (!this.resend) throw new Error('Resend is not configured');
      const result = await this.resend.emails.send(
        {
          from:
            process.env.RESEND_FROM ||
            process.env.SMTP_FROM ||
            'no-reply@dolphin-erp.com',
          to,
          subject: email.subject,
          html: email.html,
          text: email.text,
          attachments: email.attachments.map((a) => ({
            filename: a.filename,
            content: a.content.toString('base64'),
            contentId: a.cid,
          })),
        },
        { idempotencyKey: context.deliveryId },
      );
      if (result.error || !result.data?.id)
        throw new Error('Email provider rejected delivery');
      return result.data.id;
    }
    const result = await this.mailer.sendMail({ to, ...email });
    if (result?.rejected?.length) throw new Error('SMTP rejected recipient');
    return result?.messageId;
  }
}
