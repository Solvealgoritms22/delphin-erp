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
import { FiscalBridgeService } from '../invoices/fiscalbridge.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreateCreditNoteDto } from './dto/credit-note.dto';

const DGII_MODIFICATION_CODES = ['1', '2', '3', '4', '5'];

interface CreditedLine {
  detalleOriginalId: string;
  productoId: string;
  cantidad: Prisma.Decimal;
  precioUnitario: Prisma.Decimal;
  descuento: Prisma.Decimal;
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
    private readonly fiscalBridgeService: FiscalBridgeService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(empresaId: string, usuarioId: string, dto: CreateCreditNoteDto) {
    if (!dto.lines || dto.lines.length === 0) {
      throw new BadRequestException(
        'La nota de crédito debe acreditar al menos una línea.',
      );
    }
    if (!DGII_MODIFICATION_CODES.includes(dto.motivoModificacion)) {
      throw new BadRequestException(
        'El código de modificación DGII debe estar entre 1 y 5.',
      );
    }

    // 1. Agregar y validar líneas de entrada para evitar líneas repetidas que evadan límites
    const lineQuantityMap = new Map<string, Prisma.Decimal>();
    for (const line of dto.lines) {
      if (!line.detalleOriginalId?.trim()) {
        throw new BadRequestException(
          'Cada línea debe especificar detalleOriginalId.',
        );
      }
      const qty = new Prisma.Decimal(line.cantidad || 0);
      if (qty.lte(0)) {
        throw new BadRequestException(
          'La cantidad a acreditar debe ser mayor a cero.',
        );
      }
      const current = lineQuantityMap.get(line.detalleOriginalId) || new Prisma.Decimal(0);
      lineQuantityMap.set(line.detalleOriginalId, current.add(qty));
    }

    const billing = await this.billingConfig.get(empresaId);
    const precision = billing.configuracion.precisionMoneda;

    // Ejecutar todo el proceso dentro de una transacción con lock pesimista
    const { creditNote, needsFiscal, totalCredit, original } = await this.prisma.$transaction(
      async (tx) => {
        // Bloqueo pesimista de la factura original para evitar carreras con cobros u otras notas
        await tx.$queryRaw`
          SELECT id, balance_pendiente, estado FROM facturas_venta
          WHERE id = ${dto.facturaOriginalId} AND empresa_id = ${empresaId}
          FOR UPDATE
        `;

        const originalInv = await tx.facturaVenta.findFirst({
          where: { id: dto.facturaOriginalId, empresaId },
          include: {
            detalles: {
              include: {
                producto: true,
                lineasCredito: {
                  select: {
                    cantidad: true,
                    subtotal: true,
                    descuento: true,
                    itbis: true,
                    total: true,
                  },
                },
              },
            },
            cliente: true,
          },
        });

        if (!originalInv) {
          throw new NotFoundException('Factura original no encontrada.');
        }
        if (originalInv.estado === 'ANULADA') {
          throw new BadRequestException(
            'No se puede emitir una nota de crédito sobre una factura anulada.',
          );
        }
        if (originalInv.facturaOriginalId) {
          throw new BadRequestException(
            'No se puede emitir una nota de crédito sobre otra nota de crédito.',
          );
        }

        const isElectronic = originalInv.tipoNcf?.toUpperCase().startsWith('E');
        const tipoNcf = isElectronic ? 'E34' : 'B04';

        const empresa = await tx.empresa.findUnique({
          where: { id: empresaId },
        });
        if (!empresa) throw new NotFoundException('Empresa no encontrada.');

        // Validar líneas y calcular importes proporcionales respetando descuentos originales
        const creditedLines: CreditedLine[] = [];
        let subtotalAcc = new Prisma.Decimal(0);
        let discountAcc = new Prisma.Decimal(0);
        let itbisAcc = new Prisma.Decimal(0);

        for (const [detalleOriginalId, requestedQty] of lineQuantityMap.entries()) {
          const detalle = originalInv.detalles.find((d) => d.id === detalleOriginalId);
          if (!detalle) {
            throw new BadRequestException(
              'Una de las líneas no pertenece a la factura original.',
            );
          }

          const alreadyCreditedQty = detalle.lineasCredito.reduce(
            (sum, c) => sum.add(c.cantidad),
            new Prisma.Decimal(0),
          );
          const availableQty = detalle.cantidad.sub(alreadyCreditedQty);

          if (requestedQty.gt(availableQty)) {
            throw new BadRequestException(
              `La cantidad a acreditar del producto ${detalle.producto?.nombre || detalle.productoId} supera lo disponible (${availableQty.toString()} de ${detalle.cantidad.toString()}).`,
            );
          }

          const isFullRemaining = requestedQty.eq(availableQty);
          const alreadyCreditedSubtotal = detalle.lineasCredito.reduce(
            (sum, c) => sum.add(c.subtotal),
            new Prisma.Decimal(0),
          );
          const alreadyCreditedDiscount = detalle.lineasCredito.reduce(
            (sum, c) => sum.add(c.descuento || 0),
            new Prisma.Decimal(0),
          );
          const alreadyCreditedItbis = detalle.lineasCredito.reduce(
            (sum, c) => sum.add(c.itbis),
            new Prisma.Decimal(0),
          );

          let lineDiscount: Prisma.Decimal;
          let lineSubtotal: Prisma.Decimal;
          let lineItbis: Prisma.Decimal;

          if (isFullRemaining) {
            lineDiscount = detalle.descuento.sub(alreadyCreditedDiscount);
            lineSubtotal = detalle.subtotal.sub(alreadyCreditedSubtotal);
            lineItbis = detalle.itbis.sub(alreadyCreditedItbis);
          } else {
            const ratio = requestedQty.div(detalle.cantidad);
            lineDiscount = detalle.descuento
              .mul(ratio)
              .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
            lineSubtotal = detalle.precioUnitario
              .mul(requestedQty)
              .sub(lineDiscount)
              .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
            lineItbis = lineSubtotal
              .mul(detalle.tasaItbis)
              .div(100)
              .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);
          }

          const lineTotal = lineSubtotal.add(lineItbis);

          subtotalAcc = subtotalAcc.add(lineSubtotal);
          discountAcc = discountAcc.add(lineDiscount);
          itbisAcc = itbisAcc.add(lineItbis);

          creditedLines.push({
            detalleOriginalId: detalle.id,
            productoId: detalle.productoId,
            cantidad: requestedQty,
            precioUnitario: detalle.precioUnitario,
            descuento: lineDiscount,
            tasaItbis: detalle.tasaItbis,
            itbis: lineItbis,
            subtotal: lineSubtotal,
            total: lineTotal,
            impuestoId: detalle.impuestoId || undefined,
            indicadorFacturacion:
              detalle.indicadorFacturacion ||
              (detalle.tasaItbis.eq(0) ? '4' : detalle.tasaItbis.eq(16) ? '2' : '1'),
            afectaInventario: detalle.producto?.tipo !== 'SERVICIO',
          });
        }

        const calculatedTotalCredit = subtotalAcc
          .add(itbisAcc)
          .toDecimalPlaces(precision, Prisma.Decimal.ROUND_HALF_UP);

        // Regla DGII: notas de crédito electrónicas emitidas después de 30 días no trasladan ITBIS
        if (isElectronic && tipoNcf === 'E34') {
          const days =
            (Date.now() - new Date(originalInv.fecha).getTime()) / 86400000;
          if (days > 30 && itbisAcc.gt(0)) {
            throw new BadRequestException(
              'Según la normativa DGII (Norma 05-19), una nota de crédito electrónica (E34) emitida más de 30 días después de la factura original no puede rebajar el ITBIS.',
            );
          }
        }

        // Reservar NCF de nota de crédito DENTRO de la transacción
        const ambiente = empresa.fiscalbridgeEnv || 'TEST';
        const reservedNcf = await this.sequencesService.getNextNCF(
          empresaId,
          tipoNcf,
          ambiente,
          tx,
        );
        const ncf = reservedNcf.ncf;
        const fechaVencimientoNcf = reservedNcf.fechaVencimiento;
        const fiscalActive = isElectronic && empresa.fiscalbridgeEnabled;

        // Generación de número de factura correlativo atómico por tabla de contadores
        const numeroFactura = await this.generateNextNumeroFactura(tx, empresaId, 'NC');

        // Devolución opcional a inventario
        if (dto.returnToInventory && originalInv.almacenId) {
          for (const line of creditedLines) {
            if (!line.afectaInventario) continue;
            await tx.inventarioStock.upsert({
              where: {
                productoId_almacenId: {
                  productoId: line.productoId,
                  almacenId: originalInv.almacenId,
                },
              },
              create: {
                empresaId,
                productoId: line.productoId,
                almacenId: originalInv.almacenId,
                cantidad: line.cantidad,
              },
              update: { cantidad: { increment: line.cantidad } },
            });
            await tx.movimientoInventario.create({
              data: {
                empresaId,
                productoId: line.productoId,
                almacenDestinoId: originalInv.almacenId,
                usuarioId,
                tipo: 'AJUSTE_POSITIVO',
                cantidad: line.cantidad,
                referenciaDoc: `${numeroFactura} (${ncf})`,
                motivo: `Devolución por nota de crédito sobre ${originalInv.numeroFactura}`,
              },
            });
          }
        }

        // Conciliación de balance y saldo a favor explícito
        const creditApplied = Prisma.Decimal.min(
          originalInv.balancePendiente,
          calculatedTotalCredit,
        );
        const excessCredit = calculatedTotalCredit.sub(creditApplied);
        const newBalance = originalInv.balancePendiente.sub(creditApplied);

        const created = await tx.facturaVenta.create({
          data: {
            empresaId,
            sucursalId: originalInv.sucursalId,
            almacenId: originalInv.almacenId,
            clienteId: originalInv.clienteId,
            usuarioId,
            numeroFactura,
            ncf,
            fechaVencimientoNcf,
            tipoNcf,
            estado: 'EMITIDA',
            tipoPago: originalInv.tipoPago,
            metodoPago: originalInv.metodoPago,
            subtotal: subtotalAcc,
            descuento: discountAcc,
            itbis: itbisAcc,
            total: calculatedTotalCredit,
            montoPagado: new Prisma.Decimal(0),
            balancePendiente: new Prisma.Decimal(0),
            moneda: originalInv.moneda,
            tasaCambio: originalInv.tasaCambio,
            monedaBase: originalInv.monedaBase,
            ncfModificado: originalInv.ncf,
            motivoModificacion: dto.motivoModificacion,
            facturaOriginalId: originalInv.id,
            notas: excessCredit.gt(0)
              ? `${dto.notas ? dto.notas + ' | ' : ''}Saldo a favor generado: ${excessCredit.toFixed(2)}`
              : dto.notas,
            fiscalbridgeStatus: fiscalActive ? 'PENDING' : 'NOT_TRANSMITTED',
            detalles: {
              create: creditedLines.map((line) => ({
                productoId: line.productoId,
                cantidad: line.cantidad,
                precioUnitario: line.precioUnitario,
                descuento: line.descuento,
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

        if (taxLines.length) {
          await tx.impuestoFactura.createMany({ data: taxLines });
        }

        // Actualizar factura original
        await tx.facturaVenta.update({
          where: { id: originalInv.id },
          data: {
            balancePendiente: newBalance,
            estado: newBalance.lte(0) ? 'PAGADA' : originalInv.estado,
          },
        });

        // Validación fiscal pre-commit: verificar que el payload sea 100% válido antes de persistir
        if (fiscalActive) {
          this.fiscalBridgeService.buildEcfPayload(
            {
              ...created,
              facturaOriginal: { fecha: originalInv.fecha },
            },
            empresa,
          );
          await tx.outboxEvent.create({
            data: {
              empresaId,
              tipo: 'FISCALBRIDGE_TRANSMIT',
              aggregateId: created.id,
              payload: JSON.stringify({ facturaId: created.id }),
            },
          });
        }

        return {
          creditNote: created,
          needsFiscal: fiscalActive,
          totalCredit: calculatedTotalCredit,
          original: originalInv,
          excessCredit,
        };
      },
      { isolationLevel: 'Serializable', timeout: 30000 },
    );

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
        facturaOriginal: {
          select: { id: true, numeroFactura: true, ncf: true },
        },
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
        facturaOriginal: {
          select: { id: true, numeroFactura: true, ncf: true },
        },
        detalles: { include: { producto: true } },
      },
    });
    if (!creditNote) {
      throw new NotFoundException('Nota de crédito no encontrada.');
    }
    return creditNote;
  }

  private async generateNextNumeroFactura(
    tx: Prisma.TransactionClient,
    empresaId: string,
    prefix: 'FAC' | 'NC' = 'NC',
  ): Promise<string> {
    const key = empresaId + ':' + prefix;
    const rows = await tx.$queryRaw<Array<{ value: bigint }>>`
      INSERT INTO document_counters (key, value)
      VALUES (${key}, COALESCE((SELECT MAX(substring(numero_factura from '[0-9]+$')::bigint)
        FROM facturas_venta WHERE empresa_id = ${empresaId} AND numero_factura ~ ${'^' + prefix + '-[0-9]+$'}), 0) + 1)
      ON CONFLICT (key) DO UPDATE SET value = document_counters.value + 1 RETURNING value
    `;
    return prefix + '-' + String(rows[0].value).padStart(6, '0');
  }
}
