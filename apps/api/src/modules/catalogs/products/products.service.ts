import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(empresaId: string, data: any, usuarioId?: string) {
    const { stockInicial, stockMinimo, almacenId } = data || {};
    const payload = await this.sanitizeProductData(empresaId, data);

    const producto = await this.prisma.producto.create({
      data: {
        ...payload,
        empresaId,
      },
    });

    const parsedStock = Number(stockInicial);
    const parsedMinimo = Number(stockMinimo);
    const isService = (payload.tipo || 'PRODUCTO').toUpperCase() === 'SERVICIO';

    if (!isService && (!isNaN(parsedStock) || !isNaN(parsedMinimo))) {
      let targetAlmacenId = almacenId;
      if (!targetAlmacenId) {
        let defaultWarehouse = await this.prisma.almacen.findFirst({
          where: { empresaId, esPrincipal: true },
        });
        if (!defaultWarehouse) {
          defaultWarehouse = await this.prisma.almacen.findFirst({
            where: { empresaId },
          });
        }
        if (!defaultWarehouse) {
          defaultWarehouse = await this.prisma.almacen.create({
            data: {
              empresaId,
              nombre: 'Almacén Principal (CEDI)',
              tipo: 'CENTRAL',
              esPrincipal: true,
            },
          });
        }
        targetAlmacenId = defaultWarehouse.id;
      }

      const initialQty =
        !isNaN(parsedStock) && parsedStock > 0 ? parsedStock : 0;
      const minQty =
        !isNaN(parsedMinimo) && parsedMinimo > 0 ? parsedMinimo : 0;

      await this.prisma.inventarioStock.create({
        data: {
          empresaId,
          productoId: producto.id,
          almacenId: targetAlmacenId,
          cantidad: initialQty,
          stockMinimo: minQty,
          costoPromedio: payload.costo ? Number(payload.costo) : 0,
        },
      });

      if (initialQty > 0) {
        let effectiveUserId = usuarioId;
        if (!effectiveUserId) {
          const empresa = await this.prisma.empresa.findUnique({
            where: { id: empresaId },
            select: { propietarioId: true },
          });
          effectiveUserId = empresa?.propietarioId || 'SYSTEM';
        }

        await this.prisma.movimientoInventario.create({
          data: {
            empresaId,
            productoId: producto.id,
            almacenDestinoId: targetAlmacenId,
            usuarioId: effectiveUserId,
            tipo: 'AJUSTE_POSITIVO',
            cantidad: initialQty,
            costoUnitario: payload.costo ? Number(payload.costo) : 0,
            motivo: 'Inventario inicial al registrar producto',
            referenciaDoc: `ALTA-${producto.codigo}`,
          },
        });
      }
    }

    if (data.insumos && Array.isArray(data.insumos)) {
      await this.syncInsumos(empresaId, producto.id, data.insumos);
    }

    return this.findOne(empresaId, producto.id);
  }

  async findAll(empresaId: string) {
    return this.prisma.producto.findMany({
      where: { empresaId },
      include: {
        categoria: true,
        marca: true,
        unidadMedida: true,
        impuesto: true,
        stocks: {
          include: {
            almacen: true,
          },
        },
        insumos: {
          include: {
            insumoProducto: {
              include: {
                unidadMedida: true,
                categoria: true,
              },
            },
            unidadMedida: true,
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(empresaId: string, id: string) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, empresaId },
      include: {
        categoria: true,
        marca: true,
        unidadMedida: true,
        impuesto: true,
        stocks: {
          include: {
            almacen: true,
          },
        },
        insumos: {
          include: {
            insumoProducto: {
              include: {
                unidadMedida: true,
                categoria: true,
              },
            },
            unidadMedida: true,
          },
        },
      },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  async update(empresaId: string, id: string, data: any, usuarioId?: string) {
    const existingProduct = await this.findOne(empresaId, id); // check existence
    const payload = await this.sanitizeProductData(empresaId, data);

    const updated = await this.prisma.producto.update({
      where: { id },
      data: payload,
    });

    const isService =
      (payload.tipo || existingProduct.tipo || 'PRODUCTO').toUpperCase() ===
      'SERVICIO';

    if (
      !isService &&
      (data.stockInicial !== undefined || data.stockMinimo !== undefined)
    ) {
      const parsedStock = Number(data.stockInicial);
      const parsedMinimo = Number(data.stockMinimo);

      let targetAlmacenId = data.almacenId;
      if (!targetAlmacenId) {
        let defaultWarehouse = await this.prisma.almacen.findFirst({
          where: { empresaId, esPrincipal: true },
        });
        if (!defaultWarehouse) {
          defaultWarehouse = await this.prisma.almacen.findFirst({
            where: { empresaId },
          });
        }
        if (!defaultWarehouse) {
          defaultWarehouse = await this.prisma.almacen.create({
            data: {
              empresaId,
              nombre: 'Almacén Principal (CEDI)',
              tipo: 'CENTRAL',
              esPrincipal: true,
            },
          });
        }
        targetAlmacenId = defaultWarehouse.id;
      }

      const existingStock = await this.prisma.inventarioStock.findFirst({
        where: {
          empresaId,
          productoId: id,
          almacenId: targetAlmacenId,
        },
      });

      let effectiveUserId = usuarioId;
      if (!effectiveUserId) {
        const empresa = await this.prisma.empresa.findUnique({
          where: { id: empresaId },
          select: { propietarioId: true },
        });
        effectiveUserId = empresa?.propietarioId || 'SYSTEM';
      }

      if (existingStock) {
        const currentQty = Number(existingStock.cantidad);
        const newQty =
          !isNaN(parsedStock) && parsedStock >= 0 ? parsedStock : currentQty;
        const newMin =
          !isNaN(parsedMinimo) && parsedMinimo >= 0
            ? parsedMinimo
            : Number(existingStock.stockMinimo || 0);

        await this.prisma.inventarioStock.update({
          where: { id: existingStock.id },
          data: {
            cantidad: newQty,
            stockMinimo: newMin,
            costoPromedio:
              payload.costo !== undefined
                ? payload.costo
                  ? Number(payload.costo)
                  : 0
                : existingStock.costoPromedio,
          },
        });

        const diff = newQty - currentQty;
        if (diff !== 0) {
          await this.prisma.movimientoInventario.create({
            data: {
              empresaId,
              productoId: id,
              almacenDestinoId: diff > 0 ? targetAlmacenId : null,
              almacenOrigenId: diff < 0 ? targetAlmacenId : null,
              usuarioId: effectiveUserId,
              tipo: diff > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
              cantidad: Math.abs(diff),
              costoUnitario: payload.costo ? Number(payload.costo) : 0,
              motivo: 'Ajuste de existencias en edición de producto',
              referenciaDoc: `EDIT-${updated.codigo}`,
            },
          });
        }
      } else {
        const initialQty =
          !isNaN(parsedStock) && parsedStock > 0 ? parsedStock : 0;
        const minQty =
          !isNaN(parsedMinimo) && parsedMinimo > 0 ? parsedMinimo : 0;

        await this.prisma.inventarioStock.create({
          data: {
            empresaId,
            productoId: id,
            almacenId: targetAlmacenId,
            cantidad: initialQty,
            stockMinimo: minQty,
            costoPromedio: payload.costo ? Number(payload.costo) : 0,
          },
        });

        if (initialQty > 0) {
          await this.prisma.movimientoInventario.create({
            data: {
              empresaId,
              productoId: id,
              almacenDestinoId: targetAlmacenId,
              usuarioId: effectiveUserId,
              tipo: 'AJUSTE_POSITIVO',
              cantidad: initialQty,
              costoUnitario: payload.costo ? Number(payload.costo) : 0,
              motivo: 'Inventario inicial al editar producto',
              referenciaDoc: `EDIT-${updated.codigo}`,
            },
          });
        }
      }
    }

    if (data.insumos !== undefined && Array.isArray(data.insumos)) {
      await this.syncInsumos(empresaId, id, data.insumos);
    }

    return this.findOne(empresaId, id);
  }

  async remove(empresaId: string, id: string) {
    await this.findOne(empresaId, id);
    return this.prisma.producto.delete({
      where: { id },
    });
  }

  async generateNextCode(
    empresaId: string,
    tipo: string = 'PRODUCTO',
  ): Promise<string> {
    const prefix =
      (tipo || 'PRODUCTO').toUpperCase() === 'SERVICIO' ? 'SRV' : 'PRD';

    const products = await this.prisma.producto.findMany({
      where: {
        empresaId,
        codigo: {
          startsWith: `${prefix}-`,
        },
      },
      select: {
        codigo: true,
      },
    });

    let maxNumber = 0;
    for (const p of products) {
      const match = p.codigo.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    }

    let nextNumber = maxNumber + 1;
    let candidate = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

    while (true) {
      const exists = await this.prisma.producto.findFirst({
        where: { empresaId, codigo: candidate },
      });
      if (!exists) break;
      nextNumber++;
      candidate = `${prefix}-${String(nextNumber).padStart(5, '0')}`;
    }

    return candidate;
  }

  private async sanitizeProductData(empresaId: string, data: any) {
    if (!data) return {};

    const {
      nombre,
      codigo,
      tipo,
      codigoBarras,
      descripcion,
      precioVenta,
      costo,
      impuestoId,
      categoriaId,
      marcaId,
      unidadMedidaId,
      tags,
      imagenes,
      estado,
    } = data;

    const cleanString = (val: any) =>
      typeof val === 'string' && val.trim() !== '' ? val.trim() : null;

    const taxId = cleanString(impuestoId);
    const tax = taxId ? await this.resolveTax(empresaId, taxId) : null;

    const result: any = {};

    if (nombre !== undefined)
      result.nombre = typeof nombre === 'string' ? nombre.trim() : nombre;
    if (tipo !== undefined) result.tipo = cleanString(tipo) || 'PRODUCTO';

    const cleanedCodigo = cleanString(codigo);
    if (cleanedCodigo) {
      result.codigo = cleanedCodigo;
    } else if (codigo !== undefined) {
      // If codigo was explicitly sent as empty/blank, generate one automatically
      result.codigo = await this.generateNextCode(
        empresaId,
        result.tipo || tipo,
      );
    }

    if (codigoBarras !== undefined)
      result.codigoBarras = cleanString(codigoBarras);
    if (descripcion !== undefined)
      result.descripcion = cleanString(descripcion);
    if (precioVenta !== undefined)
      result.precioVenta = Number(precioVenta ?? 0);
    if (costo !== undefined) {
      result.costo =
        costo !== null && costo !== '' && !isNaN(Number(costo))
          ? Number(costo)
          : null;
    }
    if (categoriaId !== undefined)
      result.categoriaId = cleanString(categoriaId);
    if (marcaId !== undefined) result.marcaId = cleanString(marcaId);
    if (unidadMedidaId !== undefined)
      result.unidadMedidaId = cleanString(unidadMedidaId);
    if (impuestoId !== undefined) {
      result.impuestoId = taxId;
      result.taxRate = tax ? tax.tasa : 0;
    }
    if (tags !== undefined) result.tags = cleanString(tags);
    if (imagenes !== undefined)
      result.imagenes = this.normalizeImages(imagenes);
    if (estado !== undefined) result.estado = cleanString(estado) || 'ACTIVO';

    return result;
  }

  private normalizeImages(value: unknown): string | null {
    if (value === null || value === undefined || value === '') return null;
    let images: unknown = value;
    if (typeof value === 'string') {
      try {
        images = JSON.parse(value);
      } catch {
        images = [value];
      }
    }
    if (!Array.isArray(images))
      throw new BadRequestException(
        'Las imágenes deben enviarse como una lista',
      );
    if (images.length > 5)
      throw new BadRequestException(
        'Un producto puede tener como máximo 5 imágenes',
      );
    if (images.some((image) => typeof image !== 'string')) {
      throw new BadRequestException('El formato de las imágenes no es válido');
    }
    return JSON.stringify(images);
  }

  private async resolveTax(empresaId: string, impuestoId?: string | null) {
    if (!impuestoId) return null;
    const tax = await this.prisma.impuesto.findFirst({
      where: { id: impuestoId, empresaId, activo: true },
    });
    if (!tax)
      throw new BadRequestException(
        'El impuesto no pertenece a la empresa o está inactivo',
      );
    return tax;
  }

  private async syncInsumos(
    empresaId: string,
    productoPadreId: string,
    insumos: any[],
  ) {
    if (!Array.isArray(insumos)) return;

    await this.prisma.productoInsumo.deleteMany({
      where: { productoPadreId },
    });

    const validInsumos = insumos.filter(
      (item) =>
        item &&
        item.insumoProductoId &&
        item.insumoProductoId !== productoPadreId,
    );

    for (const item of validInsumos) {
      const qty = Number(item.cantidad) > 0 ? Number(item.cantidad) : 1;
      const cost =
        item.costoUnitario !== undefined &&
        item.costoUnitario !== null &&
        !isNaN(Number(item.costoUnitario))
          ? Number(item.costoUnitario)
          : null;

      await this.prisma.productoInsumo.create({
        data: {
          empresaId,
          productoPadreId,
          insumoProductoId: item.insumoProductoId,
          cantidad: qty,
          costoUnitario: cost,
          unidadMedidaId: item.unidadMedidaId || null,
          notas: typeof item.notas === 'string' ? item.notas.trim() : null,
        },
      });
    }
  }
}
