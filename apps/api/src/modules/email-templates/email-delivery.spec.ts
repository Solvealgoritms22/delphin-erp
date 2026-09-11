import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { EmailTemplatesService } from './email-templates.service';
import { NotificationEmailService } from '../notifications/notification-email.service';
import { EMAIL_CATALOG, notificationEmailKey } from './email-template.catalog';
import { NOTIFICATION_CATALOG } from '../notifications/notification.catalog';
import { renderEmail, sanitizeEmailHtml } from './email-renderer';

describe('Email delivery contract', () => {
  const values = {
    company: 'Empresa & Asociados',
    name: 'Ana',
    title: 'Aviso importante',
    message: 'Saldo pendiente: DOP 100.00',
    documentNumber: 'COT-1',
    total: '100.00',
    currency: 'DOP',
  };
  it.each(NOTIFICATION_CATALOG.map((event) => [event.id]))(
    '%s has an editable template with protected event content',
    (type) => {
      const key = notificationEmailKey(type);
      expect(EMAIL_CATALOG[key].editable).toBe(true);
      const mail = renderEmail(
        key,
        values,
        { ...EMAIL_CATALOG[key], body: 'Mensaje personalizado' },
        { message: values.message },
      );
      expect(mail.html).toContain('Mensaje personalizado');
      expect(mail.text).toContain(values.message);
      expect(mail.html).not.toContain('cid:dolphin-brand');
      expect(mail.html).toContain('Empresa &amp; Asociados');
    },
  );
  it('system templates include the dolphin logo while tenant templates do not', () => {
    const systemMail = renderEmail('verification', { name: 'Ana' }, undefined, { code: '123456' });
    expect(systemMail.html).toContain('cid:dolphin-brand');
    expect(systemMail.attachments.some((a) => a.cid === 'dolphin-brand')).toBe(true);

    const tenantMail = renderEmail('quote', values);
    expect(tenantMail.html).not.toContain('cid:dolphin-brand');
    expect(tenantMail.attachments.some((a) => a.cid === 'dolphin-brand')).toBe(false);
  });
  it.each([
    '<a href=javascript:alert(1)>x</a>',
    '<a href="java&#x73;cript:alert(1)">x</a>',
    '<svg onload=alert(1)>x</svg>',
    '<img src="DATA:image/svg+xml;base64,PHN2Zz4=" onerror=alert(1)>',
    '<p style="background:url(https://evil.test);position:fixed">x</p>',
  ])('sanitizes hostile HTML: %s', (input) => {
    const safe = sanitizeEmailHtml(input);
    expect(safe).not.toMatch(
      /javascript:|onload|onerror|<svg|image\/svg|position:|url\(/i,
    );
  });
  it('system designs cannot be overwritten by a caller', () => {
    const mail = renderEmail(
      'verification',
      values,
      {
        subject: 'Malicious',
        heading: 'x',
        body: 'x',
        footer: 'x',
        accent: '#000000',
      },
      { code: '123456' },
    );
    expect(mail.subject).not.toBe('Malicious');
    expect(mail.text).toContain('123456');
  });
  it('rejects unknown templates and prototype keys', () => {
    expect(() => renderEmail('__proto__', values)).toThrow(BadRequestException);
  });
  it('preserves literal subject characters without HTML entity double encoding', () => {
    const mail = renderEmail('quote', values);
    expect(mail.subject).toContain('Empresa & Asociados');
    expect(mail.subject).not.toContain('&amp;');
  });
  it('embeds uploaded raster images as CID attachments', () => {
    const mail = renderEmail('quote', values, {
      ...EMAIL_CATALOG.quote,
      body: '<p><img src="data:image/png;base64,iVBORw0KGgo="></p>',
    });
    expect(mail.attachments).toHaveLength(1);
    expect(mail.html).toContain('cid:email-image-1');
    expect(mail.html).not.toContain('src="data:');
  });
  it('sends customized HTML, plain text and the logo in a real MIME envelope without network access', async () => {
    const transport = createTransport({
      streamTransport: true,
      buffer: true,
      newline: 'unix',
    });
    let mime = '';
    const mailer = {
      sendMail: async (options: any) => {
        const result = await transport.sendMail({
          from: 'system@example.invalid',
          ...options,
        });
        mime = result.message.toString();
        return result;
      },
    };
    const prisma: any = {
      empresa: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ razonSocial: values.company }),
      },
      emailTemplate: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            ...EMAIL_CATALOG.notification_INVOICE_OVERDUE,
            body: 'Contenido de mi empresa',
          }),
      },
    };
    const templates = new EmailTemplatesService(prisma, {} as any);
    const sender = new NotificationEmailService(
      mailer as any,
      templates,
      prisma,
    );
    const previous = process.env.EMAIL_PROVIDER;
    process.env.EMAIL_PROVIDER = 'smtp';
    try {
      await sender.send('ana@example.invalid', values.title, values.message, {
        empresaId: 'empresa-a',
        tipo: 'INVOICE_OVERDUE',
        name: 'Ana',
        deliveryId: 'delivery-1',
      });
    } finally {
      if (previous === undefined) delete process.env.EMAIL_PROVIDER;
      else process.env.EMAIL_PROVIDER = previous;
    }
    expect(prisma.emailTemplate.findUnique).toHaveBeenCalledWith({
      where: {
        empresaId_key: {
          empresaId: 'empresa-a',
          key: 'notification_INVOICE_OVERDUE',
        },
      },
    });
    expect(mime).toContain('Content-Type: multipart/alternative');
    expect(mime).not.toContain('Content-ID: <dolphin-brand>');
    expect(mime).toContain('Contenido de mi empresa');
  });
  it('denies template management to a user who does not own the selected company', async () => {
    const prisma: any = {
      empresa: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const templates = new EmailTemplatesService(prisma, {} as any);
    await expect(templates.list('another-tenant', 'member')).rejects.toThrow(
      ForbiddenException,
    );
    expect(prisma.empresa.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'another-tenant',
          propietarioId: 'member',
          estado: 'ACTIVA',
        },
      }),
    );
  });
  it('does not mark a stored default as customized after reset', async () => {
    const prisma: any = {
      empresa: {
        findFirst: jest.fn().mockResolvedValue({ razonSocial: 'Empresa' }),
      },
      emailTemplate: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { key: 'quote', ...EMAIL_CATALOG.quote, revision: 3 },
          ]),
      },
    };
    const templates = new EmailTemplatesService(prisma, {} as any);
    const result = await templates.list('empresa', 'owner');
    expect(result.templates.find((t) => t.key === 'quote')).toMatchObject({
      customized: false,
      revision: 3,
    });
  });
});
