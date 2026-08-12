import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Resend } from 'resend';

@Injectable()
export class NotificationEmailService {
  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : undefined;

  constructor(private readonly mailer: MailerService) {}

  async send(to: string, title: string, message: string): Promise<string | undefined> {
    if (process.env.EMAIL_PROVIDER === 'resend' && this.resend) {
      const result = await this.resend.emails.send({
        from: process.env.RESEND_FROM || process.env.SMTP_FROM || 'no-reply@dolphin-erp.com',
        to,
        subject: title,
        text: message,
      });
      return result.data?.id;
    }

    const result = await this.mailer.sendMail({
      to,
      subject: title,
      text: message,
    });
    return result?.messageId;
  }
}
