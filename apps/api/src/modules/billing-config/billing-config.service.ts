import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

const DEFAULT_TAXES = [
  {
    codigo: 'ITBIS18',
    nombre: 'ITBIS 18%',
    tasa: 18,
    indicadorFacturacion: '1',
  },
  {
    codigo: 'ITBIS16',
    nombre: 'ITBIS 16%',
    tasa: 16,
    indicadorFacturacion: '1',
  },
  { codigo: 'ITBIS0', nombre: 'ITBIS 0%', tasa: 0, indicadorFacturacion: '2' },
  { codigo: 'EXENTO', nombre: 'Exento', tasa: 0, indicadorFacturacion: '4' },
];

const DEFAULT_TERMS = [
  { codigo: 'CONTADO', nombre: 'Contado', tipo: 'CONTADO', diasCredito: 0 },
  {
    codigo: 'CREDITO30',
    nombre: 'Crédito 30 días',
    tipo: 'CREDITO',
    diasCredito: 30,
  },
];

@Injectable()
export class BillingConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async get(empresaId: string) {
    this.requireTenant(empresaId);
    const [configuracion, impuestos, terminosPago] = await Promise.all([
      this.prisma.configuracionEmpresa.upsert({
        where: { empresaId },
        create: { empresaId },
        update: {},
      }),
      this.ensureTaxes(empresaId),
      this.ensureTerms(empresaId),
    ]);
    return { configuracion, impuestos, terminosPago };
  }

  async update(empresaId: string, userId: string, data: any) {
    this.requireTenant(empresaId);
    const allowed = [
      'monedaBase',
      'zonaHoraria',
      'locale',
      'precisionMoneda',
      'precisionCantidad',
      'metodoRedondeo',
      'redondeoPor',
      'preciosIncluyenImpuesto',
      'diasGracia',
    ];
    const updateData: Record<string, unknown> = {};
    for (const field of allowed)
      if (data[field] !== undefined) updateData[field] = data[field];
    if (
      updateData.monedaBase &&
      !/^[A-Z]{3}$/.test(String(updateData.monedaBase))
    )
      throw new BadRequestException(
        'La moneda debe ser un código ISO de 3 letras',
      );
    if (
      updateData.precisionMoneda !== undefined &&
      ![0, 2].includes(Number(updateData.precisionMoneda))
    )
      throw new BadRequestException('La moneda debe usar 0 o 2 decimales');
    const result = await this.prisma.configuracionEmpresa.upsert({
      where: { empresaId },
      create: { empresaId, ...(updateData as any) },
      update: updateData,
    });
    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'BILLING_CONFIG',
      accion: 'UPDATE',
      resourceId: result.id,
      resourceName: 'Configuración de facturación',
      resourceType: 'ConfiguracionEmpresa',
      metadata: updateData,
    });
    return result;
  }

  async listTaxes(empresaId: string) {
    return this.ensureTaxes(empresaId);
  }

  async createTax(empresaId: string, userId: string, data: any) {
    this.requireTenant(empresaId);
    if (!data.codigo || !data.nombre || data.tasa === undefined)
      throw new BadRequestException('Código, nombre y tasa son requeridos');
    const tasa = Number(data.tasa);
    if (!Number.isFinite(tasa) || tasa < 0 || tasa > 100)
      throw new BadRequestException('La tasa debe estar entre 0 y 100');
    const tax = await this.prisma.impuesto.create({
      data: {
        empresaId,
        codigo: String(data.codigo).toUpperCase(),
        nombre: data.nombre,
        tasa,
        indicadorFacturacion: data.indicadorFacturacion || '1',
        incluidoEnPrecio: Boolean(data.incluidoEnPrecio),
      },
    });
    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'BILLING_CONFIG',
      accion: 'CREATE_TAX',
      resourceId: tax.id,
      resourceName: tax.nombre,
      resourceType: 'Impuesto',
    });
    return tax;
  }

  async updateTax(empresaId: string, userId: string, id: string, data: any) {
    const current = await this.prisma.impuesto.findFirst({
      where: { id, empresaId },
    });
    if (!current) throw new NotFoundException('Impuesto no encontrado');
    if (
      data.tasa !== undefined &&
      (!Number.isFinite(Number(data.tasa)) ||
        Number(data.tasa) < 0 ||
        Number(data.tasa) > 100)
    )
      throw new BadRequestException('La tasa debe estar entre 0 y 100');
    const tax = await this.prisma.impuesto.update({
      where: { id },
      data: {
        nombre: data.nombre ?? current.nombre,
        tasa: data.tasa === undefined ? current.tasa : Number(data.tasa),
        activo:
          data.activo === undefined ? current.activo : Boolean(data.activo),
        indicadorFacturacion:
          data.indicadorFacturacion ?? current.indicadorFacturacion,
        incluidoEnPrecio:
          data.incluidoEnPrecio === undefined
            ? current.incluidoEnPrecio
            : Boolean(data.incluidoEnPrecio),
        vigenteHasta: data.vigenteHasta
          ? new Date(data.vigenteHasta)
          : current.vigenteHasta,
      },
    });
    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'BILLING_CONFIG',
      accion: 'UPDATE_TAX',
      resourceId: id,
      resourceName: tax.nombre,
      resourceType: 'Impuesto',
    });
    return tax;
  }

  async listTerms(empresaId: string) {
    return this.ensureTerms(empresaId);
  }

  async createTerm(empresaId: string, userId: string, data: any) {
    this.requireTenant(empresaId);
    const term = await this.prisma.terminoPago.create({
      data: {
        empresaId,
        codigo: String(data.codigo).toUpperCase(),
        nombre: data.nombre,
        tipo: data.tipo || 'CREDITO',
        diasCredito: Number(data.diasCredito || 0),
        porcentajeAnticipo: Number(data.porcentajeAnticipo || 0),
      },
    });
    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'BILLING_CONFIG',
      accion: 'CREATE_PAYMENT_TERM',
      resourceId: term.id,
      resourceName: term.nombre,
      resourceType: 'TerminoPago',
    });
    return term;
  }

  async updateTerm(empresaId: string, userId: string, id: string, data: any) {
    const current = await this.prisma.terminoPago.findFirst({
      where: { id, empresaId },
    });
    if (!current) throw new NotFoundException('Término de pago no encontrado');
    const diasCredito =
      data.diasCredito === undefined
        ? current.diasCredito
        : Number(data.diasCredito);
    const porcentajeAnticipo =
      data.porcentajeAnticipo === undefined
        ? Number(current.porcentajeAnticipo)
        : Number(data.porcentajeAnticipo);
    if (!Number.isInteger(diasCredito) || diasCredito < 0 || diasCredito > 3650)
      throw new BadRequestException('Los días de crédito no son válidos');
    if (
      !Number.isFinite(porcentajeAnticipo) ||
      porcentajeAnticipo < 0 ||
      porcentajeAnticipo > 100
    )
      throw new BadRequestException('El anticipo debe estar entre 0 y 100');
    const term = await this.prisma.terminoPago.update({
      where: { id },
      data: {
        nombre: data.nombre ?? current.nombre,
        tipo: data.tipo ?? current.tipo,
        diasCredito,
        porcentajeAnticipo,
        activo:
          data.activo === undefined ? current.activo : Boolean(data.activo),
      },
    });
    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'BILLING_CONFIG',
      accion: 'UPDATE_PAYMENT_TERM',
      resourceId: id,
      resourceName: term.nombre,
      resourceType: 'TerminoPago',
    });
    return term;
  }

  private async ensureTaxes(empresaId: string) {
    await Promise.all(
      DEFAULT_TAXES.map((tax) =>
        this.prisma.impuesto.upsert({
          where: { empresaId_codigo: { empresaId, codigo: tax.codigo } },
          create: { empresaId, ...tax },
          update: {},
        }),
      ),
    );
    return this.prisma.impuesto.findMany({
      where: { empresaId },
      orderBy: { codigo: 'asc' },
    });
  }

  private async ensureTerms(empresaId: string) {
    await Promise.all(
      DEFAULT_TERMS.map((term) =>
        this.prisma.terminoPago.upsert({
          where: { empresaId_codigo: { empresaId, codigo: term.codigo } },
          create: { empresaId, ...term },
          update: {},
        }),
      ),
    );
    return this.prisma.terminoPago.findMany({
      where: { empresaId, activo: true },
      orderBy: { diasCredito: 'asc' },
    });
  }

  private requireTenant(empresaId: string) {
    if (!empresaId) throw new BadRequestException('Empresa activa requerida');
  }
}
