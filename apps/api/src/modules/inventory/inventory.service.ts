import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export class TransferStockDto {
  productoId!: string;
  almacenOrigenId!: string;
  almacenDestinoId!: string;
  cantidad!: number;
  motivo?: string;
  referenciaDoc?: string;
}

export class AdjustStockDto {
  productoId!: string;
  almacenId!: string;
  tipo!: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO' | 'COMPRA' | 'VENTA';
  cantidad!: number;
  costoUnitario?: number;
  motivo?: string;
  referenciaDoc?: string;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  // ----------------------------------------------------
  // Almacenes (Warehouses)
  // ----------------------------------------------------

  async getWarehouses(empresaId: string) {
    // Si la empresa no tiene almacenes aún, crear automáticamente el almacén principal
    const count = await this.prisma.almacen.count({ where: { empresaId } });
    if (count === 0) {
      await this.ensureDefaultWarehouse(empresaId);
    }

    return this.prisma.almacen.findMany({
      where: { empresaId },
      include: { sucursal: { select: { id: true, nombre: true } } },
      orderBy: [{ esPrincipal: 'desc' }, { nombre: 'asc' }],
    });
  }

  async createWarehouse(empresaId: string, data: { nombre: string; sucursalId?: string; tipo?: string; codigo?: string }) {
    const existing = await this.prisma.almacen.findFirst({
      where: { empresaId, nombre: data.nombre },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un almacén con el nombre '${data.nombre}'`);
    }

    const count = await this.prisma.almacen.count({ where: { empresaId } });

    return this.prisma.almacen.create({
      data: {
        empresaId,
        nombre: data.nombre,
        sucursalId: data.sucursalId || null,
        tipo: data.tipo || 'VENTA',
        codigo: data.codigo || null,
        esPrincipal: count === 0,
      },
      include: { sucursal: { select: { id: true, nombre: true } } },
    });
  }

  async updateWarehouse(empresaId: string, id: string, data: any) {
    const warehouse = await this.prisma.almacen.findFirst({
      where: { id, empresaId },
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');

    return this.prisma.almacen.update({
      where: { id },
      data: {
        nombre: data.nombre ?? warehouse.nombre,
        tipo: data.tipo ?? warehouse.tipo,
        codigo: data.codigo !== undefined ? data.codigo : warehouse.codigo,
        sucursalId: data.sucursalId !== undefined ? data.sucursalId : warehouse.sucursalId,
        estado: data.estado ?? warehouse.estado,
      },
      include: { sucursal: { select: { id: true, nombre: true } } },
    });
  }

  async ensureDefaultWarehouse(empresaId: string, sucursalId?: string) {
    const existing = await this.prisma.almacen.findFirst({
      where: {
        empresaId,
        ...(sucursalId ? { sucursalId } : { esPrincipal: true }),
      },
    });

    if (existing) return existing;

    return this.prisma.almacen.create({
      data: {
        empresaId,
        sucursalId: sucursalId || null,
        nombre: sucursalId ? 'Almacén Sucursal' : 'Almacén Principal (CEDI)',
        tipo: sucursalId ? 'VENTA' : 'CENTRAL',
        esPrincipal: !sucursalId,
      },
    });
  }

  // ----------------------------------------------------
  // Stock / Existencias
  // ----------------------------------------------------

  async getStocks(empresaId: string, query?: { almacenId?: string; productoId?: string; search?: string }) {
    const where: Prisma.InventarioStockWhereInput = { empresaId };

    if (query?.almacenId) {
      where.almacenId = query.almacenId;
    }
    if (query?.productoId) {
      where.productoId = query.productoId;
    }
    if (query?.search) {
      where.producto = {
        OR: [
          { nombre: { contains: query.search, mode: 'insensitive' } },
          { codigo: { contains: query.search, mode: 'insensitive' } },
          { codigoBarras: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const stocks = await this.prisma.inventarioStock.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            codigo: true,
            codigoBarras: true,
            nombre: true,
            precioVenta: true,
            costo: true,
            categoria: { select: { nombre: true } },
            unidadMedida: { select: { abreviatura: true } },
          },
        },
        almacen: {
          select: {
            id: true,
            nombre: true,
            tipo: true,
            sucursal: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: [{ producto: { nombre: 'asc' } }, { almacen: { nombre: 'asc' } }],
    });

    return stocks.map((s) => ({
      id: s.id,
      productoId: s.productoId,
      productoNombre: s.producto.nombre,
      productoCodigo: s.producto.codigo,
      categoria: s.producto.categoria?.nombre || 'General',
      unidad: s.producto.unidadMedida?.abreviatura || 'UND',
      almacenId: s.almacenId,
      almacenNombre: s.almacen.nombre,
      sucursalNombre: s.almacen.sucursal?.nombre || 'Almacén Central',
      cantidad: Number(s.cantidad),
      stockMinimo: Number(s.stockMinimo),
      stockMaximo: s.stockMaximo ? Number(s.stockMaximo) : null,
      costoPromedio: s.costoPromedio ? Number(s.costoPromedio) : (s.producto.costo ? Number(s.producto.costo) : null),
      actualizadoEn: s.actualizadoEn,
    }));
  }

  async getProductStockBreakdown(empresaId: string, productoId: string) {
    const warehouses = await this.getWarehouses(empresaId);
    const existingStocks = await this.prisma.inventarioStock.findMany({
      where: { empresaId, productoId },
    });

    const stockMap = new Map(existingStocks.map((s) => [s.almacenId, Number(s.cantidad)]));

    return warehouses.map((w) => ({
      almacenId: w.id,
      almacenNombre: w.nombre,
      tipo: w.tipo,
      sucursalNombre: w.sucursal?.nombre || 'Central',
      cantidad: stockMap.get(w.id) || 0,
    }));
  }

  // ----------------------------------------------------
  // Transferencias de Stock (Multi-Almacén)
  // ----------------------------------------------------

  async createTransfer(empresaId: string, usuarioId: string, dto: TransferStockDto) {
    if (dto.almacenOrigenId === dto.almacenDestinoId) {
      throw new BadRequestException('El almacén de origen y destino no pueden ser el mismo');
    }
    if (dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad a transferir debe ser mayor a 0');
    }

    const producto = await this.prisma.producto.findFirst({
      where: { id: dto.productoId, empresaId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const [almacenOrigen, almacenDestino] = await Promise.all([
      this.prisma.almacen.findFirst({ where: { id: dto.almacenOrigenId, empresaId } }),
      this.prisma.almacen.findFirst({ where: { id: dto.almacenDestinoId, empresaId } }),
    ]);

    if (!almacenOrigen) throw new NotFoundException('Almacén de origen no encontrado');
    if (!almacenDestino) throw new NotFoundException('Almacén de destino no encontrado');

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener o crear stock en origen
      const stockOrigen = await tx.inventarioStock.findUnique({
        where: { productoId_almacenId: { productoId: dto.productoId, almacenId: dto.almacenOrigenId } },
      });

      const currentQtyOrigen = stockOrigen ? Number(stockOrigen.cantidad) : 0;
      if (currentQtyOrigen < dto.cantidad) {
        throw new BadRequestException(
          `Stock insuficiente en ${almacenOrigen.nombre}. Disponible: ${currentQtyOrigen}, Solicitado: ${dto.cantidad}`
        );
      }

      // 2. Descontar en origen
      await tx.inventarioStock.update({
        where: { id: stockOrigen!.id },
        data: { cantidad: { decrement: dto.cantidad } },
      });

      // 3. Incrementar en destino (upsert)
      await tx.inventarioStock.upsert({
        where: { productoId_almacenId: { productoId: dto.productoId, almacenId: dto.almacenDestinoId } },
        create: {
          empresaId,
          productoId: dto.productoId,
          almacenId: dto.almacenDestinoId,
          cantidad: dto.cantidad,
        },
        update: {
          cantidad: { increment: dto.cantidad },
        },
      });

      // 4. Registrar en Kardex
      const movimiento = await tx.movimientoInventario.create({
        data: {
          empresaId,
          productoId: dto.productoId,
          almacenOrigenId: dto.almacenOrigenId,
          almacenDestinoId: dto.almacenDestinoId,
          usuarioId,
          tipo: 'TRANSFERENCIA',
          cantidad: dto.cantidad,
          costoUnitario: producto.costo,
          referenciaDoc: dto.referenciaDoc || `TR-${Date.now().toString().slice(-6)}`,
          motivo: dto.motivo || `Transferencia de ${almacenOrigen.nombre} hacia ${almacenDestino.nombre}`,
        },
      });

      return {
        success: true,
        movimientoId: movimiento.id,
        transferido: dto.cantidad,
        origen: almacenOrigen.nombre,
        destino: almacenDestino.nombre,
      };
    });
  }

  // ----------------------------------------------------
  // Ajustes de Inventario y Movimientos
  // ----------------------------------------------------

  async createAdjustment(empresaId: string, usuarioId: string, dto: AdjustStockDto) {
    if (dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    const producto = await this.prisma.producto.findFirst({
      where: { id: dto.productoId, empresaId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');

    const almacen = await this.prisma.almacen.findFirst({
      where: { id: dto.almacenId, empresaId },
    });
    if (!almacen) throw new NotFoundException('Almacén no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const isPositive = dto.tipo === 'AJUSTE_POSITIVO' || dto.tipo === 'COMPRA';

      const stock = await tx.inventarioStock.upsert({
        where: { productoId_almacenId: { productoId: dto.productoId, almacenId: dto.almacenId } },
        create: {
          empresaId,
          productoId: dto.productoId,
          almacenId: dto.almacenId,
          cantidad: isPositive ? dto.cantidad : 0,
        },
        update: {
          cantidad: isPositive ? { increment: dto.cantidad } : { decrement: dto.cantidad },
        },
      });

      const movimiento = await tx.movimientoInventario.create({
        data: {
          empresaId,
          productoId: dto.productoId,
          almacenOrigenId: isPositive ? null : dto.almacenId,
          almacenDestinoId: isPositive ? dto.almacenId : null,
          usuarioId,
          tipo: dto.tipo,
          cantidad: dto.cantidad,
          costoUnitario: dto.costoUnitario !== undefined ? dto.costoUnitario : producto.costo,
          referenciaDoc: dto.referenciaDoc || `AJ-${Date.now().toString().slice(-6)}`,
          motivo: dto.motivo || `Ajuste de inventario en ${almacen.nombre}`,
        },
      });

      return {
        success: true,
        movimientoId: movimiento.id,
        nuevoStock: Number(stock.cantidad),
      };
    });
  }

  // ----------------------------------------------------
  // Kardex Histórico
  // ----------------------------------------------------

  async getKardex(empresaId: string, productoId?: string, page = 1, limit = 50) {
    const where: Prisma.MovimientoInventarioWhereInput = { empresaId };
    if (productoId) where.productoId = productoId;

    const [total, movimientos] = await Promise.all([
      this.prisma.movimientoInventario.count({ where }),
      this.prisma.movimientoInventario.findMany({
        where,
        include: {
          producto: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { creadoEn: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Lookup warehouse names
    const warehouseIds = new Set<string>();
    movimientos.forEach((m) => {
      if (m.almacenOrigenId) warehouseIds.add(m.almacenOrigenId);
      if (m.almacenDestinoId) warehouseIds.add(m.almacenDestinoId);
    });

    const warehouses = await this.prisma.almacen.findMany({
      where: { id: { in: Array.from(warehouseIds) } },
      select: { id: true, nombre: true },
    });
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w.nombre]));

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items: movimientos.map((m) => ({
        id: m.id,
        productoId: m.productoId,
        productoCodigo: m.producto.codigo,
        productoNombre: m.producto.nombre,
        tipo: m.tipo,
        cantidad: Number(m.cantidad),
        costoUnitario: m.costoUnitario ? Number(m.costoUnitario) : null,
        almacenOrigen: m.almacenOrigenId ? warehouseMap.get(m.almacenOrigenId) || 'Origen' : null,
        almacenDestino: m.almacenDestinoId ? warehouseMap.get(m.almacenDestinoId) || 'Destino' : null,
        referenciaDoc: m.referenciaDoc,
        motivo: m.motivo,
        creadoEn: m.creadoEn,
      })),
    };
  }
}
