import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SequencesService } from '../sequences/sequences.service';
import { BillingConfigService } from '../billing-config/billing-config.service';
import { FiscalOutboxService } from '../invoices/fiscal-outbox.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateCreditNoteDto } from './dto/credit-note.dto';

const DGII_MODIFICATION_CODES = ['1', '2', '3', '4', '5'];

interface CreditedLine {
  detalleOriginalId: string;
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  tasaItbis: Prisma.Decimal;
  itbis: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  total: Prisma.Decimal;
  impuestoId?: string;
  indicadorFacturacion: string;
  afectaInventario: boolean;
}

@Injectable()
export class CreditNotesService {
  private readonly logger = new Logger(CreditNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sequencesService: SequencesService,
    private readonly billingConfig: BillingConfigService,
    private readonly fiscalOutbox: FiscalOutboxService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(empresaId: string, usuarioId: string, dto: CreateCreditNoteDto) {
    if (!dto.lines || dto.lines.length === 0)
      throw new BadRequestException(
        'La nota de crédito debe acreditar al menos una línea.',
      );
    if (!DGII_MODIFICATION_CODES.includes(dto.motivoModificacion))
      throw new BadRequestException(
        'El código de modificación DGII debe estar entre 1 y 5.',
      );

    const original = await this.prisma.facturaVenta.findFirst({
      where: { id: dto.facturaOriginalId, empresaId },
      include: {
        detalles: {
          include: { producto: true, lineasCredito: { select: { cantidad: true } } },
        },
        cliente: true,
      },
    });
    if (!original) throw new NotFoundException('Factura original no encontrada.');
    if (original.estado === 'ANULADA')
      throw new BadRequestException(
        'No se puede emitir una nota de crédito sobre una factura anulada.',
      );
    if (original.facturaOriginalId)
      throw new BadRequestException(
        'No se puede emitir una nota de crédito sobre otra nota de crédito.',
      );

    const isElectronic = original.tipoNcf?.toUpperCase().startsWith('E');
    const tipoNcf = isElectronic ? 'E34' : 'B04';
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
    });
    if (!empresa) throw new NotFoundException('Empresa no encontrada.');

    const billing = await this.billingConfig.get(empresaId);
    const precision = billing.configuracion.precisionMoneda;

    // Validar líneas contra la factura original y lo ya acreditado.
    const creditedLines: CreditedLine[] = [];
    let subtotalAcc = new Prisma.Decimal(0);
    let itbisAcc = new Prisma.Decimal(0);

    for (const line of dto.lines) {
      const detalle = original.detalles.find(
        (d) => d.id === line.detalleOriginalId,
      );
      if (!detalle)
        throw new BadRequestException(
          'Una de las líneas no pertenece a la factura original.',
        );

      const alreadyCredited = detalle.lineasCredito.reduce(
        (sum, credited) => sum.add(credited.cantidad),
        new Prisma.Decimal(0),
      );
      const cantidad = new Prisma.Decimal(line.cantidad);
      const available = detalle.cantidad.sub(alreadyCredited);
      if (cantidad.lte(0) || cantidad.gt(available))
        throw new BadRequestException(
          `La cantidad a acreditar del producto ${detalle.producto?.nombre || detalle.productoId} supera lo disponible (${available.toString()} de ${detalle.cantidad.toString()}).`,
        );

      const subtotal = cantidad
        .mul(detalle.precioUnitario)
        .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
      const itbis = subtotal
        .mul(detalle.tasaItbis)
        .div(100)
        .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
      const total = subtotal.add(itbis);

      subtotalAcc = subtotalAcc.add(subtotal);
      itbisAcc = itbisAcc.add(itbis);
      creditedLines.push({
        detalleOriginalId: detalle.id,
        productoId: detalle.productoId,
        cantidad,
        precioUnitario: detalle.precioUnitario,
        tasaItbis: detalle.tasaItbis,
        itbis,
        subtotal,
        total,
        impuestoId: detalle.impuestoId || undefined,
        indicadorFacturacion:
          detalle.indicadorFacturacion ||
          (detalle.tasaItbis.eq(0) ? '2' : '1'),
        afectaInventario: detalle.producto?.tipo !== 'SERVICIO',
      });
    }

    const totalCredit = subtotalAcc
      .add(itbisAcc)
      .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);

    // Reservar NCF de nota de crédito (E34 electrónico / B04 tradicional).
    const ambiente = empresa.fiscalbridgeEnv || 'TEST';
    const { ncf } = await this.sequencesService.getNextNCF(
      empresaId,
      tipoNcf,
      ambiente,
    );
    const needsFiscal = isElectronic && empresa.fiscalbridgeEnabled;

    const creditNote = await this.prisma.$transaction(async (tx) => {
      const numeroFactura = await this.generateNextNumeroFactura(
        tx,
        empresaId,
        'NC',
      );

      // Devolución opcional a inventario.
      if (dto.returnToInventory && original.almacenId) {
        for (const line of creditedLines) {
          if (!line.afectaInventario) continue;
          await tx.inventarioStock.upsert({
            where: {
              productoId_almacenId: {
                productoId: line.productoId,
                almacenId: original.almacenId!,
              },
            },
            create: {
              empresaId,
              productoId: line.productoId,
              almacenId: original.almacenId!,
              cantidad: line.cantidad,
            },
            update: { cantidad: { increment: line.cantidad } },
          });
          await tx.movimientoInventario.create({
            data: {
              empresaId,
              productoId: line.productoId,
              almacenDestinoId: original.almacenId!,
              usuarioId,
              tipo: 'AJUSTE_POSITIVO',
              cantidad: line.cantidad,
              referenciaDoc: `${numeroFactura} (${ncf})`,
              motivo: `Devolución por nota de crédito sobre ${original.numeroFactura}`,
            },
          });
        }
      }

      const created = await tx.facturaVenta.create({
        data: {
          empresaId,
          sucursalId: original.sucursalId,
          almacenId: original.almacenId,
          clienteId: original.clienteId,
          usuarioId,
          numeroFactura,
          ncf,
          tipoNcf,
          estado: 'EMITIDA',
          tipoPago: original.tipoPago,
          metodoPago: original.metodoPago,
          subtotal: subtotalAcc,
          itbis: itbisAcc,
          total: totalCredit,
          montoPagado: new Prisma.Decimal(0),
          balancePendiente: new Prisma.Decimal(0),
          moneda: original.moneda,
          tasaCambio: original.tasaCambio,
          monedaBase: original.monedaBase,
          ncfModificado: original.ncf,
          motivoModificacion: dto.motivoModificacion,
          facturaOriginalId: original.id,
          notas: dto.notas,
          fiscalbridgeStatus: needsFiscal ? 'PENDING' : 'NOT_TRANSMITTED',
          detalles: {
            create: creditedLines.map((line) => ({
              productoId: line.productoId,
              cantidad: line.cantidad,
              precioUnitario: line.precioUnitario,
              tasaItbis: line.tasaItbis,
              itbis: line.itbis,
              subtotal: line.subtotal,
              total: line.total,
              impuestoId: line.impuestoId,
              indicadorFacturacion: line.indicadorFacturacion,
              detalleOriginalId: line.detalleOriginalId,
            })),
          },
        },
        include: {
          cliente: true,
          almacen: true,
          sucursal: true,
          detalles: { include: { producto: true } },
        },
      });

      const taxLines = creditedLines
        .map((line, index) =>
          line.impuestoId && created.detalles[index]
            ? {
                facturaId: created.id,
                detalleId: created.detalles[index]?.id,
                impuestoId: line.impuestoId,
                baseImponible: line.subtotal,
                tasa: line.tasaItbis,
                monto: line.itbis,
                indicadorFacturacion: line.indicadorFacturacion,
              }
            : null,
        )
        .filter((line): line is NonNullable<typeof line> => Boolean(line));
      if (taxLines.length)
        await tx.impuestoFactura.createMany({ data: taxLines });

      // El crédito reduce la deuda del cliente sobre la factura original.
      const creditApplied = Prisma.Decimal.min(
        original.balancePendiente,
        totalCredit,
      );
      const newBalance = original.balancePendiente.sub(creditApplied);
      await tx.facturaVenta.update({
        where: { id: original.id },
        data: {
          balancePendiente: newBalance,
          estado: newBalance.lte(0) ? 'PAGADA' : original.estado,
        },
      });

      if (needsFiscal) {
        await tx.outboxEvent.create({
          data: {
            empresaId,
            tipo: 'FISCALBRIDGE_TRANSMIT',
            aggregateId: created.id,
            payload: JSON.stringify({ facturaId: created.id }),
          },
        });
      }
      return created;
    });

    await this.activity.log({
      empresaId,
      usuarioId,
      modulo: 'CREDIT_NOTES',
      accion: 'CREATE',
      resourceId: creditNote.id,
      resourceName: creditNote.ncf || creditNote.numeroFactura,
      resourceType: 'NotaCredito',
      metadata: {
        facturaOriginalId: original.id,
        total: totalCredit.toString(),
        returnToInventory: Boolean(dto.returnToInventory),
      },
    });

    if (needsFiscal) {
      void this.fiscalOutbox
        .transmitNow(creditNote.id, empresaId)
        .catch((error) =>
          this.logger.error(
            `Outbox fiscal nota de crédito ${creditNote.numeroFactura}: ${error?.message}`,
          ),
        );
    }

    return creditNote;
  }

  findAll(empresaId: string, facturaOriginalId?: string) {
    return this.prisma.facturaVenta.findMany({
      where: {
        empresaId,
        ...(facturaOriginalId
          ? { facturaOriginalId }
          : { facturaOriginalId: { not: null } }),
      },
      include: {
        cliente: true,
        facturaOriginal: { select: { id: true, numeroFactura: true, ncf: true } },
        detalles: { include: { producto: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const creditNote = await this.prisma.facturaVenta.findFirst({
      where: { id, empresaId, facturaOriginalId: { not: null } },
      include: {
        cliente: true,
        facturaOriginal: { select: { id: true, numeroFactura: true, ncf: true } },
        detalles: { include: { producto: true } },
      },
    });
    if (!creditNote)
      throw new NotFoundException('Nota de crédito no encontrada.');
    return creditNote;
  }

  private async generateNextNumeroFactura(
    tx: Prisma.TransactionClient,
    empresaId: string,
    prefix: 'FAC' | 'NC' = 'NC',
  ): Promise<string> {
    const last = await tx.facturaVenta.findFirst({
      where: {
        empresaId,
        numeroFactura: { startsWith: `${prefix}-` },
      },
      orderBy: { creadoEn: 'desc' },
      select: { numeroFactura: true },
    });

    let nextNum = 1;
    if (last?.numeroFactura) {
      const match = last.numeroFactura.match(new RegExp(`^${prefix}-(\\d+)`));
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      } else {
        const count = await tx.facturaVenta.count({
          where: {
            empresaId,
            numeroFactura: { startsWith: `${prefix}-` },
          },
        });
        nextNum = count + 1;
      }
    }

    let numero = `${prefix}-${String(nextNum).padStart(6, '0')}`;
    while (
      await tx.facturaVenta.findUnique({
        where: {
          empresaId_numeroFactura: { empresaId, numeroFactura: numero },
        },
      })
    ) {
      nextNum++;
      numero = `${prefix}-${String(nextNum).padStart(6, '0')}`;
    }

    return numero;
  }
}
