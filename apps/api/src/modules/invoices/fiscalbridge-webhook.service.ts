import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

const STATUS_MAP: Record<string, string> = {
  'document.accepted': 'ACCEPTED',
  'document.rejected': 'REJECTED',
  'document.failed': 'FAILED',
  'document.rfce_sent_to_dgii': 'SENT',
};

@Injectable()
export class FiscalbridgeWebhookService {
  private readonly logger = new Logger(FiscalbridgeWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async handle(
    empresaId: string,
    rawBody: string,
    signature: string,
    payload: any,
  ) {
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { id: true, fiscalbridgeWebhookSecret: true },
    });
    if (!empresa) throw new BadRequestException('Empresa no encontrada');
    if (
      !empresa.fiscalbridgeWebhookSecret &&
      process.env.NODE_ENV === 'production'
    )
      throw new UnauthorizedException('Webhook FiscalBridge no configurado');
    if (empresa.fiscalbridgeWebhookSecret)
      this.verifySignature(
        rawBody,
        signature,
        empresa.fiscalbridgeWebhookSecret,
      );

    const type = String(payload?.type || '');
    const data = payload?.data || {};
    const eventId = String(
      payload?.id || createHash('sha256').update(rawBody).digest('hex'),
    );
    const documentUuid = data.document_uuid || data.documentUuid || null;
    const mappedStatus = STATUS_MAP[type];
    if (!mappedStatus) return { received: true, ignored: true };
    if (!documentUuid)
      throw new BadRequestException(
        'El webhook no contiene data.document_uuid',
      );

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.fiscalbridgeWebhookEvent.create({
          data: {
            empresaId,
            eventoId: eventId,
            tipo: type,
            documentUuid,
            rawBody,
          },
        });
        const invoice = await tx.facturaVenta.findFirst({
          where: { empresaId, fiscalbridgeDocId: documentUuid },
        });
        if (!invoice) return;
        await tx.facturaVenta.update({
          where: { id: invoice.id },
          data: {
            fiscalbridgeStatus: mappedStatus,
            fiscalbridgeTrackId:
              data.track_id || data.trackId || invoice.fiscalbridgeTrackId,
            fiscalbridgeQrUrl:
              data.qr_url || data.qrUrl || invoice.fiscalbridgeQrUrl,
            fiscalbridgeSecurityCode:
              data.security_code ||
              data.securityCode ||
              invoice.fiscalbridgeSecurityCode,
            fiscalbridgeSignDate:
              mappedStatus === 'ACCEPTED'
                ? new Date()
                : invoice.fiscalbridgeSignDate,
            fiscalbridgeError:
              mappedStatus === 'REJECTED' || mappedStatus === 'FAILED'
                ? String(
                    data.dgii_response?.error ||
                      data.status ||
                      'FiscalBridge rechazó el documento',
                  )
                : null,
          },
        });
      });
    } catch (error: any) {
      if (error?.code === 'P2002') return { received: true, duplicate: true };
      throw error;
    }
    await this.activity.log({
      empresaId,
      modulo: 'FISCALBRIDGE',
      accion: 'WEBHOOK_RECEIVED',
      resourceId: documentUuid,
      resourceName: documentUuid,
      resourceType: 'FiscalDocument',
      metadata: { eventId, type, status: mappedStatus },
    });
    this.logger.log(
      `FiscalBridge webhook processed empresa=${empresaId} event=${eventId} status=${mappedStatus}`,
    );
    return { received: true, status: mappedStatus };
  }

  private verifySignature(
    rawBody: string,
    header: string | undefined,
    secret: string,
  ) {
    if (!header)
      throw new UnauthorizedException('Falta X-FiscalBridge-Signature');
    const parts = Object.fromEntries(
      header.split(',').map((part) => {
        const index = part.indexOf('=');
        return [part.slice(0, index), part.slice(index + 1)];
      }),
    );
    const timestamp = parts.t;
    const received = parts.v1;
    if (!timestamp || !received || !/^\d+$/.test(timestamp))
      throw new UnauthorizedException('Firma FiscalBridge malformada');
    if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300)
      throw new UnauthorizedException('Webhook FiscalBridge expirado');
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody}`)
      .digest();
    const actual = Buffer.from(received, 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
      throw new UnauthorizedException('Firma FiscalBridge inválida');
  }
}
