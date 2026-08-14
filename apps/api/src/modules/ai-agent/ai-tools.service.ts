import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Strict Read-Only Database Tools for the ERP AI Agent.
 * ALL operations are strictly READ-ONLY and strictly filtered by empresaId.
 * No mutation (create, update, delete, upsert) methods exist here.
 */
@Injectable()
export class AiToolsService {
  private readonly logger = new Logger(AiToolsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get basic overview of the company, subscription, and branch count
   */
  async getCompanyOverview(empresaId: string) {
    this.logger.debug(`[AI-TOOL] getCompanyOverview for empresaId: ${empresaId}`);
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        suscripcion: {
          include: {
            plan: true,
          },
        },
        sucursales: {
          select: {
            id: true,
            nombre: true,
            ciudad: true,
            telefono: true,
            estado: true,
          },
        },
        _count: {
          select: {
            productos: true,
            clientes: true,
            proveedores: true,
            membresias: true,
            sucursales: true,
          },
        },
      },
    });

    if (!empresa) {
      return { error: 'Empresa no encontrada o no asignada.' };
    }

    return {
      razonSocial: empresa.razonSocial,
      rnc: empresa.rnc,
      pais: empresa.pais,
      telefono: empresa.telefono,
      email: empresa.email,
      estado: empresa.estado,
      creadoEn: empresa.creadoEn,
      plan: empresa.suscripcion?.plan?.nombre || 'Free / Starter',
      planEstado: empresa.suscripcion?.estado || 'ACTIVE',
      sucursales: empresa.sucursales,
      resumenConteos: {
        totalProductos: empresa._count.productos,
        totalClientes: empresa._count.clientes,
        totalProveedores: empresa._count.proveedores,
        totalUsuarios: empresa._count.membresias,
        totalSucursales: empresa._count.sucursales,
      },
    };
  }

  /**
   * Get executive KPIs and distribution metrics
   */
  async getExecutiveMetrics(empresaId: string) {
    this.logger.debug(`[AI-TOOL] getExecutiveMetrics for empresaId: ${empresaId}`);
    const [
      totalProductos,
      totalClientes,
      totalProveedores,
      totalUsuarios,
      categorias,
      recentActivity,
    ] = await Promise.all([
      this.prisma.producto.count({ where: { empresaId } }),
      this.prisma.cliente.count({ where: { empresaId } }),
      this.prisma.proveedor.count({ where: { empresaId } }),
      this.prisma.membresia.count({ where: { empresaId } }),
      this.prisma.categoria.findMany({
        where: { empresaId },
        select: {
          nombre: true,
          _count: { select: { productos: true } },
        },
      }),
      this.prisma.activityLog.findMany({
        where: { empresaId },
        orderBy: { creadoEn: 'desc' },
        take: 5,
        select: {
          modulo: true,
          accion: true,
          resourceName: true,
          usuarioNombre: true,
          creadoEn: true,
        },
      }),
    ]);

    return {
      metricasGenerales: {
        totalProductos,
        totalClientes,
        totalProveedores,
        totalUsuarios,
      },
      distribucionCategorias: categorias.map((c) => ({
        categoria: c.nombre,
        productos: c._count.productos,
      })),
      actividadReciente: recentActivity,
    };
  }

  /**
   * Query catalog products with prices and categories
   */
  async queryProducts(
    empresaId: string,
    params?: { search?: string; categoria?: string; limit?: number },
  ) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(`[AI-TOOL] queryProducts for empresaId: ${empresaId}, limit: ${limit}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: 'insensitive' } },
        { codigo: { contains: params.search, mode: 'insensitive' } },
        { descripcion: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params?.categoria) {
      where.categoria = {
        nombre: { contains: params.categoria, mode: 'insensitive' },
      };
    }

    const productos = await this.prisma.producto.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        precioVenta: true,
        costo: true,
        taxRate: true,
        estado: true,
        categoria: { select: { nombre: true } },
        marca: { select: { nombre: true } },
        unidadMedida: { select: { abreviatura: true, nombre: true } },
      },
    });

    return {
      totalEncontrados: productos.length,
      productos: productos.map((p) => ({
        codigo: p.codigo,
        nombre: p.nombre,
        tipo: p.tipo,
        precioVenta: p.precioVenta,
        costo: p.costo,
        impuesto: p.taxRate ? `${p.taxRate}%` : '0%',
        categoria: p.categoria?.nombre || 'Sin categoría',
        marca: p.marca?.nombre || 'Sin marca',
        unidad: p.unidadMedida?.abreviatura || 'Und',
        estado: p.estado,
      })),
    };
  }

  /**
   * Query commercial clients
   */
  async queryClients(empresaId: string, params?: { search?: string; limit?: number }) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(`[AI-TOOL] queryClients for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { telefono: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const clientes = await this.prisma.cliente.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombreRazonSocial: true,
        tipoDocumento: true,
        numeroDocumento: true,
        email: true,
        telefono: true,
        direccion: true,
        pais: true,
        estado: true,
      },
    });

    return {
      totalEncontrados: clientes.length,
      clientes: clientes.map((c) => ({
        nombre: c.nombreRazonSocial,
        documento: `${c.tipoDocumento}: ${c.numeroDocumento}`,
        email: c.email || 'N/A',
        telefono: c.telefono || 'N/A',
        direccion: c.direccion || 'N/A',
        pais: c.pais,
        estado: c.estado,
      })),
    };
  }

  /**
   * Query commercial suppliers
   */
  async querySuppliers(empresaId: string, params?: { search?: string; limit?: number }) {
    const limit = Math.min(params?.limit || 20, 50);
    this.logger.debug(`[AI-TOOL] querySuppliers for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.search) {
      where.OR = [
        { nombreRazonSocial: { contains: params.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { telefono: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const proveedores = await this.prisma.proveedor.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        id: true,
        nombreRazonSocial: true,
        tipoDocumento: true,
        numeroDocumento: true,
        email: true,
        telefono: true,
        direccion: true,
        estado: true,
      },
    });

    return {
      totalEncontrados: proveedores.length,
      proveedores: proveedores.map((p) => ({
        nombre: p.nombreRazonSocial,
        documento: `${p.tipoDocumento}: ${p.numeroDocumento}`,
        email: p.email || 'N/A',
        telefono: p.telefono || 'N/A',
        direccion: p.direccion || 'N/A',
        estado: p.estado,
      })),
    };
  }

  /**
   * Query branches / locations
   */
  async queryBranches(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryBranches for empresaId: ${empresaId}`);
    const sucursales = await this.prisma.sucursal.findMany({
      where: { empresaId },
      orderBy: { creadoEn: 'asc' },
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        direccion: true,
        telefono: true,
        email: true,
        estado: true,
      },
    });

    return {
      totalSucursales: sucursales.length,
      sucursales,
    };
  }

  /**
   * Query activity & audit logs
   */
  async queryActivityLogs(
    empresaId: string,
    params?: { limit?: number; module?: string; action?: string },
  ) {
    const limit = Math.min(params?.limit || 15, 30);
    this.logger.debug(`[AI-TOOL] queryActivityLogs for empresaId: ${empresaId}`);

    const where: any = { empresaId };
    if (params?.module) {
      where.modulo = { contains: params.module, mode: 'insensitive' };
    }
    if (params?.action) {
      where.accion = params.action;
    }

    const logs = await this.prisma.activityLog.findMany({
      where,
      take: limit,
      orderBy: { creadoEn: 'desc' },
      select: {
        modulo: true,
        accion: true,
        resourceName: true,
        resourceType: true,
        usuarioNombre: true,
        usuarioEmail: true,
        ipAddress: true,
        creadoEn: true,
      },
    });

    return {
      totalLogs: logs.length,
      logs: logs.map((l) => ({
        fecha: l.creadoEn.toISOString(),
        modulo: l.modulo,
        accion: l.accion,
        recurso: l.resourceName || l.resourceType || 'General',
        usuario: l.usuarioNombre || l.usuarioEmail || 'Sistema',
        ip: l.ipAddress || 'Interna',
      })),
    };
  }

  /**
   * Query users and roles in this tenant
   */
  async queryTeamMembers(empresaId: string) {
    this.logger.debug(`[AI-TOOL] queryTeamMembers for empresaId: ${empresaId}`);
    const membresias = await this.prisma.membresia.findMany({
      where: { empresaId },
      select: {
        id: true,
        estado: true,
        role: { select: { nombre: true, descripcion: true } },
        usuario: {
          select: {
            nombre: true,
            email: true,
            ultimoAcceso: true,
            isVerified: true,
          },
        },
      },
    });

    return {
      totalMiembros: membresias.length,
      miembros: membresias.map((m) => ({
        nombre: m.usuario.nombre || 'Sin nombre',
        email: m.usuario.email,
        rol: m.role?.nombre || 'Sin rol',
        estado: m.estado,
        verificado: m.usuario.isVerified ? 'Sí' : 'No',
        ultimoAcceso: m.usuario.ultimoAcceso?.toISOString() || 'Nunca',
      })),
    };
  }
}
