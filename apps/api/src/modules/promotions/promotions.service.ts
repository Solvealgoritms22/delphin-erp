import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { FilterPromotionsDto } from './dto/filter-promotions.dto';
import {
  EvaluatePromotionsDto,
  EvaluateItemDto,
} from './dto/evaluate-promotions.dto';
import { Prisma } from '@prisma/client';

export interface EvaluatedLineResult {
  productoId: string;
  productoNombre: string;
  productoCodigo: string;
  cantidad: number;
  precioLista: number;
  descuentoUnitario: number;
  descuentoTotal: number;
  porcentajeDescuento: number;
  precioFinalUnitario: number;
  subtotalBruto: number;
  subtotalNeto: number;
  promocionId: string | null;
  promocionNombre: string | null;
  tipoDescuentoAplicado: string | null;
  descuentoExcedeMaximo: boolean;
}

export interface EvaluatedCartResult {
  items: EvaluatedLineResult[];
  subtotalBrutoTotal: number;
  descuentoTotal: number;
  subtotalNetoTotal: number;
  promocionesAplicadas: {
    id: string;
    nombre: string;
    ahorro: number;
  }[];
}

@Injectable()
export class PromotionsService {
  private readonly logger = new Logger(PromotionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  async create(empresaId: string, userId: string, dto: CreatePromotionDto) {
    const inicio = new Date(dto.fechaInicio);
    const fin = new Date(dto.fechaFin);

    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      throw new BadRequestException('Fechas de inicio o fin inválidas');
    }

    if (fin < inicio) {
      throw new BadRequestException(
        'La fecha de finalización no puede ser anterior a la de inicio',
      );
    }

    if (dto.alcance === 'CATEGORIA' && dto.categoriaId) {
      const cat = await this.prisma.categoria.findFirst({
        where: { id: dto.categoriaId, empresaId },
      });
      if (!cat) throw new NotFoundException('La categoría especificada no existe');
    }

    if (dto.alcance === 'MARCA' && dto.marcaId) {
      const marca = await this.prisma.marca.findFirst({
        where: { id: dto.marcaId, empresaId },
      });
      if (!marca) throw new NotFoundException('La marca especificada no existe');
    }

    const promocion = await this.prisma.$transaction(async (tx) => {
      const created = await tx.promocion.create({
        data: {
          empresaId,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          codigoCupon: dto.codigoCupon?.trim().toUpperCase() || null,
          tipoDescuento: dto.tipoDescuento,
          valorDescuento: new Prisma.Decimal(dto.valorDescuento),
          alcance: dto.alcance,
          categoriaId: dto.alcance === 'CATEGORIA' ? dto.categoriaId : null,
          marcaId: dto.alcance === 'MARCA' ? dto.marcaId : null,
          fechaInicio: inicio,
          fechaFin: fin,
          cantidadMinima: new Prisma.Decimal(dto.cantidadMinima || 1),
          montoMinimo: new Prisma.Decimal(dto.montoMinimo || 0),
          limiteUsos: dto.limiteUsos || null,
          esAcumulable: Boolean(dto.esAcumulable),
          prioridad: dto.prioridad || 0,
          estado: dto.estado || 'ACTIVO',
        },
      });

      if (
        dto.alcance === 'PRODUCTOS' &&
        Array.isArray(dto.productoIds) &&
        dto.productoIds.length > 0
      ) {
        const uniqueProductIds = Array.from(new Set(dto.productoIds));
        await tx.promocionProducto.createMany({
          data: uniqueProductIds.map((pId) => ({
            empresaId,
            promocionId: created.id,
            productoId: pId,
          })),
        });
      }

      return created;
    });

    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'PROMOTIONS',
      accion: 'CREATE',
      resourceId: promocion.id,
      resourceName: promocion.nombre,
      resourceType: 'Promocion',
      metadata: { ...dto },
    });

    return this.findOne(empresaId, promocion.id);
  }

  async findAll(empresaId: string, filter?: FilterPromotionsDto) {
    const where: Prisma.PromocionWhereInput = { empresaId };

    if (filter?.search?.trim()) {
      const term = filter.search.trim();
      where.OR = [
        { nombre: { contains: term, mode: 'insensitive' } },
        { descripcion: { contains: term, mode: 'insensitive' } },
        { codigoCupon: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (filter?.alcance && filter.alcance !== 'TODOS') {
      where.alcance = filter.alcance;
    }

    if (filter?.categoriaId) {
      where.categoriaId = filter.categoriaId;
    }

    if (filter?.marcaId) {
      where.marcaId = filter.marcaId;
    }

    if (filter?.estado && filter.estado !== 'TODOS') {
      const now = new Date();
      if (filter.estado === 'ACTIVO') {
        where.estado = 'ACTIVO';
        where.fechaInicio = { lte: now };
        where.fechaFin = { gte: now };
      } else if (filter.estado === 'PROGRAMADO') {
        where.estado = 'ACTIVO';
        where.fechaInicio = { gt: now };
      } else if (filter.estado === 'EXPIRADO') {
        where.OR = [
          { estado: 'EXPIRADO' },
          { fechaFin: { lt: now } },
        ];
      } else {
        where.estado = filter.estado;
      }
    }

    const promociones = await this.prisma.promocion.findMany({
      where,
      include: {
        categoria: { select: { id: true, nombre: true } },
        marca: { select: { id: true, nombre: true } },
        productos: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                precioVenta: true,
              },
            },
          },
        },
        _count: {
          select: {
            detallesFactura: true,
            productos: true,
          },
        },
      },
      orderBy: [{ prioridad: 'desc' }, { fechaInicio: 'desc' }],
    });

    const now = new Date();
    return promociones.map((p) => {
      let estadoEfectivo = p.estado;
      if (p.estado === 'ACTIVO') {
        if (p.fechaInicio > now) {
          estadoEfectivo = 'PROGRAMADO';
        } else if (p.fechaFin < now || (p.limiteUsos !== null && p.usosActuales >= p.limiteUsos)) {
          estadoEfectivo = 'EXPIRADO';
        }
      }
      return {
        ...p,
        estadoEfectivo,
      };
    });
  }

  async findOne(empresaId: string, id: string) {
    const promocion = await this.prisma.promocion.findFirst({
      where: { id, empresaId },
      include: {
        categoria: { select: { id: true, nombre: true } },
        marca: { select: { id: true, nombre: true } },
        productos: {
          include: {
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                precioVenta: true,
                tipo: true,
              },
            },
          },
        },
        _count: {
          select: {
            detallesFactura: true,
            productos: true,
          },
        },
      },
    });

    if (!promocion) {
      throw new NotFoundException('Promoción no encontrada');
    }

    const now = new Date();
    let estadoEfectivo = promocion.estado;
    if (promocion.estado === 'ACTIVO') {
      if (promocion.fechaInicio > now) {
        estadoEfectivo = 'PROGRAMADO';
      } else if (promocion.fechaFin < now || (promocion.limiteUsos !== null && promocion.usosActuales >= promocion.limiteUsos)) {
        estadoEfectivo = 'EXPIRADO';
      }
    }

    return {
      ...promocion,
      estadoEfectivo,
    };
  }

  async update(
    empresaId: string,
    userId: string,
    id: string,
    dto: UpdatePromotionDto,
  ) {
    await this.findOne(empresaId, id);

    const updateData: Prisma.PromocionUpdateInput = {};

    if (dto.nombre !== undefined) updateData.nombre = dto.nombre.trim();
    if (dto.descripcion !== undefined)
      updateData.descripcion = dto.descripcion?.trim() || null;
    if (dto.codigoCupon !== undefined)
      updateData.codigoCupon = dto.codigoCupon?.trim().toUpperCase() || null;
    if (dto.tipoDescuento !== undefined)
      updateData.tipoDescuento = dto.tipoDescuento;
    if (dto.valorDescuento !== undefined)
      updateData.valorDescuento = new Prisma.Decimal(dto.valorDescuento);
    if (dto.alcance !== undefined) updateData.alcance = dto.alcance;
    if (dto.categoriaId !== undefined) {
      updateData.categoria = dto.categoriaId
        ? { connect: { id: dto.categoriaId } }
        : { disconnect: true };
    }
    if (dto.marcaId !== undefined) {
      updateData.marca = dto.marcaId
        ? { connect: { id: dto.marcaId } }
        : { disconnect: true };
    }
    if (dto.fechaInicio !== undefined)
      updateData.fechaInicio = new Date(dto.fechaInicio);
    if (dto.fechaFin !== undefined) updateData.fechaFin = new Date(dto.fechaFin);
    if (dto.cantidadMinima !== undefined)
      updateData.cantidadMinima = new Prisma.Decimal(dto.cantidadMinima);
    if (dto.montoMinimo !== undefined)
      updateData.montoMinimo = new Prisma.Decimal(dto.montoMinimo);
    if (dto.limiteUsos !== undefined) updateData.limiteUsos = dto.limiteUsos;
    if (dto.esAcumulable !== undefined)
      updateData.esAcumulable = Boolean(dto.esAcumulable);
    if (dto.prioridad !== undefined) updateData.prioridad = dto.prioridad;
    if (dto.estado !== undefined) updateData.estado = dto.estado;

    const updated = await this.prisma.$transaction(async (tx) => {
      const res = await tx.promocion.update({
        where: { id },
        data: updateData,
      });

      if (dto.productoIds !== undefined) {
        await tx.promocionProducto.deleteMany({ where: { promocionId: id } });
        if (
          (dto.alcance === 'PRODUCTOS' || (!dto.alcance && res.alcance === 'PRODUCTOS')) &&
          Array.isArray(dto.productoIds) &&
          dto.productoIds.length > 0
        ) {
          const uniqueProductIds = Array.from(new Set(dto.productoIds));
          await tx.promocionProducto.createMany({
            data: uniqueProductIds.map((pId) => ({
              empresaId,
              promocionId: id,
              productoId: pId,
            })),
          });
        }
      }

      return res;
    });

    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'PROMOTIONS',
      accion: 'UPDATE',
      resourceId: updated.id,
      resourceName: updated.nombre,
      resourceType: 'Promocion',
      metadata: { ...dto },
    });

    return this.findOne(empresaId, id);
  }

  async toggleStatus(empresaId: string, userId: string, id: string) {
    const promo = await this.findOne(empresaId, id);
    const newStatus = promo.estado === 'ACTIVO' ? 'PAUSADO' : 'ACTIVO';

    const updated = await this.prisma.promocion.update({
      where: { id },
      data: { estado: newStatus },
    });

    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'PROMOTIONS',
      accion: 'TOGGLE_STATUS',
      resourceId: id,
      resourceName: promo.nombre,
      resourceType: 'Promocion',
      metadata: { anterior: promo.estado, nuevo: newStatus },
    });

    return updated;
  }

  async remove(empresaId: string, userId: string, id: string) {
    const promo = await this.findOne(empresaId, id);

    await this.prisma.promocion.delete({
      where: { id },
    });

    await this.activity.log({
      empresaId,
      usuarioId: userId,
      modulo: 'PROMOTIONS',
      accion: 'DELETE',
      resourceId: id,
      resourceName: promo.nombre,
      resourceType: 'Promocion',
    });

    return { message: 'Promoción eliminada con éxito', id };
  }

  /**
   * Motor Central de Evaluación y Cotización de Promociones y Descuentos
   */
  async evaluatePromotions(
    empresaId: string,
    dto: EvaluatePromotionsDto,
  ): Promise<EvaluatedCartResult> {
    if (!dto.items || dto.items.length === 0) {
      return {
        items: [],
        subtotalBrutoTotal: 0,
        descuentoTotal: 0,
        subtotalNetoTotal: 0,
        promocionesAplicadas: [],
      };
    }

    const productIds = dto.items.map((i) => i.productoId);
    const products = await this.prisma.producto.findMany({
      where: { id: { in: productIds }, empresaId },
      include: {
        categoria: true,
        marca: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const now = new Date();
    // Promociones vigentes y activas
    const activePromotions = await this.prisma.promocion.findMany({
      where: {
        empresaId,
        estado: 'ACTIVO',
        fechaInicio: { lte: now },
        fechaFin: { gte: now },
        OR: [
          { limiteUsos: null },
          { limiteUsos: { gt: this.prisma.promocion.fields.usosActuales } },
        ],
      },
      include: {
        productos: true,
      },
      orderBy: [{ prioridad: 'desc' }, { valorDescuento: 'desc' }],
    });

    const evaluatedItems: EvaluatedLineResult[] = [];
    const appliedPromosMap = new Map<string, { id: string; nombre: string; ahorro: number }>();

    for (const item of dto.items) {
      const prod = productMap.get(item.productoId);
      if (!prod) continue;

      const cantidad = Number(item.cantidad) || 1;
      const precioLista = item.precioUnitario !== undefined ? Number(item.precioUnitario) : Number(prod.precioVenta);
      const subtotalBruto = precioLista * cantidad;

      const maxAllowedPercent = prod.descuentoMaximo !== null ? Number(prod.descuentoMaximo) : 100;
      const maxAllowedDiscount = (subtotalBruto * maxAllowedPercent) / 100;

      // 1. Evaluar Oferta Directa del Producto
      let bestDiscount = 0;
      let appliedPromoId: string | null = null;
      let appliedPromoNombre: string | null = null;
      let appliedPromoType: string | null = null;

      if (prod.enOferta) {
        let isOfferActive = true;
        if (prod.ofertaDesde && prod.ofertaDesde > now) isOfferActive = false;
        if (prod.ofertaHasta && prod.ofertaHasta < now) isOfferActive = false;

        if (isOfferActive) {
          if (prod.precioOferta !== null && Number(prod.precioOferta) < precioLista) {
            const unitDisc = precioLista - Number(prod.precioOferta);
            bestDiscount = unitDisc * cantidad;
            appliedPromoNombre = 'Oferta de Producto (Precio Especial)';
            appliedPromoType = 'PRECIO_FIJO';
          } else if (prod.descuentoPorcentaje !== null && Number(prod.descuentoPorcentaje) > 0) {
            const pct = Number(prod.descuentoPorcentaje);
            bestDiscount = (subtotalBruto * pct) / 100;
            appliedPromoNombre = `Oferta de Producto (${pct}% OFF)`;
            appliedPromoType = 'PORCENTAJE';
          }
        }
      }

      // 2. Evaluar Campañas de Promoción
      for (const promo of activePromotions) {
        // Verificar cupón si se requiere
        if (promo.codigoCupon && promo.codigoCupon !== dto.codigoCupon?.trim().toUpperCase()) {
          continue;
        }

        // Verificar cantidad y monto mínimo
        if (promo.cantidadMinima && cantidad < Number(promo.cantidadMinima)) {
          continue;
        }
        if (promo.montoMinimo && subtotalBruto < Number(promo.montoMinimo)) {
          continue;
        }

        // Verificar alcance
        let applies = false;
        if (promo.alcance === 'TODOS') {
          applies = true;
        } else if (promo.alcance === 'CATEGORIA' && promo.categoriaId && prod.categoriaId === promo.categoriaId) {
          applies = true;
        } else if (promo.alcance === 'MARCA' && promo.marcaId && prod.marcaId === promo.marcaId) {
          applies = true;
        } else if (promo.alcance === 'PRODUCTOS') {
          applies = promo.productos.some((pp) => pp.productoId === prod.id);
        }

        if (applies) {
          let calculatedPromoDiscount = 0;
          const promoVal = Number(promo.valorDescuento);

          if (promo.tipoDescuento === 'PORCENTAJE') {
            calculatedPromoDiscount = (subtotalBruto * promoVal) / 100;
          } else if (promo.tipoDescuento === 'MONTO_FIJO') {
            calculatedPromoDiscount = promoVal * cantidad;
          } else if (promo.tipoDescuento === 'PRECIO_FIJO') {
            if (precioLista > promoVal) {
              calculatedPromoDiscount = (precioLista - promoVal) * cantidad;
            }
          }

          if (promo.esAcumulable) {
            bestDiscount += calculatedPromoDiscount;
            appliedPromoId = promo.id;
            appliedPromoNombre = appliedPromoNombre
              ? `${appliedPromoNombre} + ${promo.nombre}`
              : promo.nombre;
            appliedPromoType = 'ACUMULADO';
          } else if (calculatedPromoDiscount > bestDiscount) {
            bestDiscount = calculatedPromoDiscount;
            appliedPromoId = promo.id;
            appliedPromoNombre = promo.nombre;
            appliedPromoType = promo.tipoDescuento;
          }
        }
      }

      // 3. Evaluar descuento manual ingresado en la línea
      if (item.descuentoManual !== undefined && Number(item.descuentoManual) > 0) {
        const manual = Number(item.descuentoManual);
        if (manual > bestDiscount) {
          bestDiscount = manual;
          appliedPromoId = null;
          appliedPromoNombre = 'Descuento Manual';
          appliedPromoType = 'MANUAL';
        }
      }

      // 4. Validar límite máximo de descuento permitido
      let excedeMaximo = false;
      if (bestDiscount > maxAllowedDiscount) {
        bestDiscount = maxAllowedDiscount;
        excedeMaximo = true;
      }
      if (bestDiscount > subtotalBruto) {
        bestDiscount = subtotalBruto;
      }

      const descuentoUnitario = cantidad > 0 ? bestDiscount / cantidad : 0;
      const subtotalNeto = Math.max(0, subtotalBruto - bestDiscount);
      const porcentajeDescuento = subtotalBruto > 0 ? (bestDiscount / subtotalBruto) * 100 : 0;
      const precioFinalUnitario = Math.max(0, precioLista - descuentoUnitario);

      if (appliedPromoId && appliedPromoNombre && bestDiscount > 0) {
        const existing = appliedPromosMap.get(appliedPromoId);
        if (existing) {
          existing.ahorro += bestDiscount;
        } else {
          appliedPromosMap.set(appliedPromoId, {
            id: appliedPromoId,
            nombre: appliedPromoNombre,
            ahorro: bestDiscount,
          });
        }
      }

      evaluatedItems.push({
        productoId: prod.id,
        productoNombre: prod.nombre,
        productoCodigo: prod.codigo,
        cantidad,
        precioLista,
        descuentoUnitario: Number(descuentoUnitario.toFixed(2)),
        descuentoTotal: Number(bestDiscount.toFixed(2)),
        porcentajeDescuento: Number(porcentajeDescuento.toFixed(2)),
        precioFinalUnitario: Number(precioFinalUnitario.toFixed(2)),
        subtotalBruto: Number(subtotalBruto.toFixed(2)),
        subtotalNeto: Number(subtotalNeto.toFixed(2)),
        promocionId: appliedPromoId,
        promocionNombre: appliedPromoNombre,
        tipoDescuentoAplicado: appliedPromoType,
        descuentoExcedeMaximo: excedeMaximo,
      });
    }

    const subtotalBrutoTotal = evaluatedItems.reduce((acc, i) => acc + i.subtotalBruto, 0);
    const descuentoTotal = evaluatedItems.reduce((acc, i) => acc + i.descuentoTotal, 0);
    const subtotalNetoTotal = evaluatedItems.reduce((acc, i) => acc + i.subtotalNeto, 0);

    return {
      items: evaluatedItems,
      subtotalBrutoTotal: Number(subtotalBrutoTotal.toFixed(2)),
      descuentoTotal: Number(descuentoTotal.toFixed(2)),
      subtotalNetoTotal: Number(subtotalNetoTotal.toFixed(2)),
      promocionesAplicadas: Array.from(appliedPromosMap.values()),
    };
  }
}
