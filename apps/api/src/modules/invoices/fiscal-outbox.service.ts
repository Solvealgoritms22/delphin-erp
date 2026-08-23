import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { FiscalBridgeService } from './fiscalbridge.service';

const OUTBOX_TYPE = 'FISCALBRIDGE_TRANSMIT';
const MAX_ATTEMPTS = 6;
const CLAIM_TIMEOUT_MS = 120_000;
const MAX_BACKOFF_MS = 30 * 60_000;

interface TransmissionResult {
  transmitted?: boolean;
  skipped?: boolean;
  failed?: boolean;
  status?: string;
}

@Injectable()
export class FiscalOutboxService {
  private readonly logger = new Logger(FiscalOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fiscalBridge: FiscalBridgeService,
  ) {}

  /**
   * Worker periódico: procesa eventos pendientes y reintentos vencidos.
   * Los eventos PROCESSING con visibility timeout vencido se recuperan.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async processPending() {
    const candidates = await this.prisma.outboxEvent
      .findMany({
        where: {
          tipo: OUTBOX_TYPE,
          estado: { in: ['PENDING', 'RETRYING', 'PROCESSING'] },
          OR: [
            { proximoIntentoEn: null },
            { proximoIntentoEn: { lte: new Date() } },
          ],
        },
        take: 10,
        orderBy: { creadoEn: 'asc' },
      })
      .catch(() => []);
    for (const event of candidates) {
      await this.processEvent(event.id).catch((error) =>
        this.logger.error(
          `Outbox fiscal ${event.id}: ${error?.message || 'error desconocido'}`,
        ),
      );
    }
  }

  /**
   * Transmite una factura ahora: garantiza que exista el evento outbox
   * (idempotente por factura) y lo procesa. Usado tras crear la factura
   * y desde el endpoint manual de retransmisión.
   */
  async transmitNow(
    facturaId: string,
    empresaId?: string,
  ): Promise<TransmissionResult> {
    const event = await this.prisma.outboxEvent.upsert({
      where: {
        tipo_aggregateId: { tipo: OUTBOX_TYPE, aggregateId: facturaId },
      },
      create: {
        empresaId: empresaId || null,
        tipo: OUTBOX_TYPE,
        aggregateId: facturaId,
        payload: JSON.stringify({ facturaId }),
      },
      update: {},
    });
    return this.processEvent(event.id);
  }

  private async processEvent(eventId: string): Promise<TransmissionResult> {
    const claimed = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        estado: { in: ['PENDING', 'RETRYING', 'PROCESSING', 'FAILED'] },
        OR: [
          { proximoIntentoEn: null },
          { proximoIntentoEn: { lte: new Date() } },
        ],
      },
      data: {
        estado: 'PROCESSING',
        proximoIntentoEn: new Date(Date.now() + CLAIM_TIMEOUT_MS),
      },
    });
    if (claimed.count !== 1) return { skipped: true };

    const event = await this.prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });
    if (!event) return { skipped: true };

    const facturaId = (JSON.parse(event.payload) as { facturaId: string })
      .facturaId;
    const invoice = await this.prisma.facturaVenta.findUnique({
      where: { id: facturaId },
      include: {
        cliente: true,
        almacen: true,
        sucursal: true,
        detalles: { include: { producto: true } },
      },
    });

    if (!invoice) {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { estado: 'FAILED', procesadoEn: new Date() },
      });
      return { skipped: true };
    }

    if (
      invoice.fiscalbridgeDocId ||
      ['SENT', 'ACCEPTED'].includes(invoice.fiscalbridgeStatus || '')
    ) {
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { estado: 'PROCESADO', procesadoEn: new Date() },
      });
      return { skipped: true };
    }

    const empresa = await this.prisma.empresa.findUnique({
      where: { id: invoice.empresaId },
    });
    if (!empresa || !empresa.fiscalbridgeEnabled) {
      await this.prisma.$transaction([
        this.prisma.facturaVenta.update({
          where: { id: invoice.id },
          data: {
            fiscalbridgeStatus: 'FAILED',
            fiscalbridgeError: 'FiscalBridge no está habilitado en la empresa.',
          },
        }),
        this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { estado: 'FAILED', procesadoEn: new Date() },
        }),
      ]);
      return { failed: true };
    }

    try {
      const result = await this.fiscalBridge.transmitInvoice(invoice, empresa);
      await this.prisma.$transaction([
        this.prisma.facturaVenta.update({
          where: { id: invoice.id },
          data: {
            fiscalbridgeStatus: result.status || 'SENT',
            fiscalbridgeDocId: result.documentUuid,
            fiscalbridgeTrackId: result.trackId,
            fiscalbridgeSecurityCode: result.securityCode,
            fiscalbridgeQrUrl: result.qrUrl,
            fiscalbridgeSignDate: new Date(),
            fiscalbridgeError: null,
          },
        }),
        this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { estado: 'PROCESADO', procesadoEn: new Date() },
        }),
      ]);
      this.logger.log(
        `Outbox fiscal: factura ${invoice.numeroFactura} transmitida (${event.id}).`,
      );
      return { transmitted: true, status: result.status || 'SENT' };
    } catch (error: any) {
      const intentos = event.intentos + 1;
      const message =
        error?.message?.slice(0, 500) || 'Error transmitiendo a FiscalBridge';
      if (intentos >= MAX_ATTEMPTS) {
        await this.prisma.$transaction([
          this.prisma.facturaVenta.update({
            where: { id: invoice.id },
            data: { fiscalbridgeStatus: 'FAILED', fiscalbridgeError: message },
          }),
          this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { estado: 'FAILED', intentos, proximoIntentoEn: null },
          }),
        ]);
        this.logger.error(
          `Outbox fiscal: factura ${invoice.numeroFactura} agotó ${MAX_ATTEMPTS} intentos (${event.id}).`,
        );
        return { failed: true };
      }
      const backoffMs = Math.min(30_000 * 2 ** (intentos - 1), MAX_BACKOFF_MS);
      await this.prisma.$transaction([
        this.prisma.facturaVenta.update({
          where: { id: invoice.id },
          data: { fiscalbridgeStatus: 'FAILED', fiscalbridgeError: message },
        }),
        this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            estado: 'RETRYING',
            intentos,
            proximoIntentoEn: new Date(Date.now() + backoffMs),
          },
        }),
      ]);
      this.logger.warn(
        `Outbox fiscal: reintento ${intentos}/${MAX_ATTEMPTS} para ${invoice.numeroFactura} en ${Math.round(backoffMs / 1000)}s.`,
      );
      return { failed: true };
    }
  }
}
