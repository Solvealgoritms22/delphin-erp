import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiHeader, ApiOperation } from '@nestjs/swagger';
import { TenantApiKeyGuard } from '../guards/tenant-api-key.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  QueryPublicProductsDto,
  QueryPublicInvoicesDto,
  QueryPublicClientsDto,
} from '../dto/tenant-api.dto';
import { Prisma } from '@prisma/client';

@ApiTags('API Pública de Integración Externa')
@ApiHeader({
  name: 'X-API-Key',
  description: 'Clave API generada desde el panel de administración Enterprise',
  required: true,
})
@UseGuards(TenantApiKeyGuard)
@Controller('public/v1/tenant')
export class PublicTenantApiController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('company-info')
  @ApiOperation({ summary: 'Consultar información y configuración general de la empresa' })
  async getCompanyInfo(@Req() req: any) {
    const empresaId = req.empresaId;
    const empresa = await this.prisma.empresa.findUnique({
      where: { id: empresaId },
      select: {
        id: true,
        razonSocial: true,
        rnc: true,
        pais: true,
        direccion: true,
        telefono: true,
        email: true,
        paginaWeb: true,
        logo: true,
        configuracion: {
          select: {
            monedaBase: true,
            precisionMoneda: true,
            zonaHoraria: true,
          },
        },
      },
    });

    return {
      statusCode: 200,
      data: empresa,
    };
  }

  @Get('products')
  @ApiOperation({ summary: 'Listar catálogo de productos y servicios con paginación' })
  async getProducts(@Req() req: any, @Query() query: QueryPublicProductsDto) {
    const empresaId = req.empresaId;
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductoWhereInput = {
      empresaId,
      estado: 'ACTIVO',
    };

    if (query.search) {
      where.OR = [
        { nombre: { contains: query.search, mode: 'insensitive' } },
        { codigo: { contains: query.search, mode: 'insensitive' } },
        { codigoBarras: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.categoriaId) where.categoriaId = query.categoriaId;
    if (query.tipo) where.tipo = query.tipo.toUpperCase();

    const [products, total] = await Promise.all([
      this.prisma.producto.findMany({
        where,
        select: {
          id: true,
          codigo: true,
          codigoBarras: true,
          nombre: true,
          descripcion: true,
          tipo: true,
          precioVenta: true,
          costo: true,
          taxRate: true,
          imagenes: true,
          categoria: { select: { id: true, nombre: true } },
          marca: { select: { id: true, nombre: true } },
          unidadMedida: { select: { id: true, nombre: true, abreviatura: true } },
          stocks: {
            select: {
              almacen: { select: { id: true, nombre: true } },
              cantidad: true,
            },
          },
          actualizadoEn: true,
        },
        orderBy: { nombre: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      statusCode: 200,
      data: products.map((p) => ({
        ...p,
        imagenes: p.imagenes ? JSON.parse(p.imagenes) : [],
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Consultar facturas emitidas por la empresa' })
  async getInvoices(@Req() req: any, @Query() query: QueryPublicInvoicesDto) {
    const empresaId = req.empresaId;
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.FacturaVentaWhereInput = {
      empresaId,
    };

    if (query.estado) {
      where.estado = query.estado.toUpperCase();
    }

    if (query.desde || query.hasta) {
      where.fecha = {};
      if (query.desde) where.fecha.gte = new Date(query.desde);
      if (query.hasta) where.fecha.lte = new Date(query.hasta);
    }

    if (query.search) {
      where.OR = [
        { numeroFactura: { contains: query.search, mode: 'insensitive' } },
        { ncf: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.facturaVenta.findMany({
        where,
        select: {
          id: true,
          numeroFactura: true,
          ncf: true,
          tipoNcf: true,
          fecha: true,
          estado: true,
          tipoPago: true,
          metodoPago: true,
          subtotal: true,
          descuento: true,
          itbis: true,
          total: true,
          balancePendiente: true,
          moneda: true,
          cliente: {
            select: {
              id: true,
              nombreRazonSocial: true,
              numeroDocumento: true,
              email: true,
            },
          },
          detalles: {
            select: {
              cantidad: true,
              precioUnitario: true,
              itbis: true,
              total: true,
              producto: { select: { codigo: true, nombre: true } },
            },
          },
        },
        orderBy: { fecha: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.facturaVenta.count({ where }),
    ]);

    return {
      statusCode: 200,
      data: invoices,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('clients')
  @ApiOperation({ summary: 'Consultar directorio de clientes' })
  async getClients(@Req() req: any, @Query() query: QueryPublicClientsDto) {
    const empresaId = req.empresaId;
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 25)));
    const skip = (page - 1) * limit;

    const where: Prisma.ClienteWhereInput = {
      empresaId,
      estado: 'ACTIVO',
    };

    if (query.search) {
      where.OR = [
        { nombreRazonSocial: { contains: query.search, mode: 'insensitive' } },
        { numeroDocumento: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        select: {
          id: true,
          nombreRazonSocial: true,
          tipoDocumento: true,
          numeroDocumento: true,
          email: true,
          telefono: true,
          direccion: true,
          pais: true,
          creadoEn: true,
        },
        orderBy: { nombreRazonSocial: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      statusCode: 200,
      data: clients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Consultar inventario y existencias por almacén' })
  async getInventory(@Req() req: any) {
    const empresaId = req.empresaId;

    const warehouses = await this.prisma.almacen.findMany({
      where: { empresaId, estado: 'ACTIVO' },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        esPrincipal: true,
        stocks: {
          select: {
            cantidad: true,
            stockMinimo: true,
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                precioVenta: true,
                unidadMedida: { select: { abreviatura: true } },
              },
            },
          },
        },
      },
    });

    return {
      statusCode: 200,
      data: warehouses,
    };
  }
}
