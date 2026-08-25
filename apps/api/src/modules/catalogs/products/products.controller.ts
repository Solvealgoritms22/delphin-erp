import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ActivityLogService } from '../../activity-log/activity-log.service';

@ApiTags('Catálogos: Productos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/catalogs/products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly activityLog: ActivityLogService,
  ) {}

  @Post()
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Crear producto o servicio' })
  async create(@CurrentUser() user: any, @Body() data: any) {
    const result = await this.productsService.create(
      user.empresaId,
      data,
      user.id,
    );
    this.activityLog.log({
      empresaId: user.empresaId,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      modulo: 'products',
      accion: 'CREATE',
      resourceId: result.id,
      resourceName: result.nombre,
      resourceType: 'Producto',
    });
    return result;
  }

  @Get()
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Listar productos de la empresa activa' })
  findAll(@CurrentUser() user: any) {
    return this.productsService.findAll(user.empresaId);
  }

  @Get('next-code')
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Generar siguiente código correlativo de producto o servicio' })
  async getNextCode(
    @CurrentUser() user: any,
    @Query('tipo') tipo?: string,
  ) {
    const code = await this.productsService.generateNextCode(
      user.empresaId,
      tipo || 'PRODUCTO',
    );
    return { code };
  }

  @Get(':id')
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Obtener producto por id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.productsService.findOne(user.empresaId, id);
  }

  @Patch(':id')
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Actualizar producto' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    const result = await this.productsService.update(
      user.empresaId,
      id,
      data,
      user.id,
    );
    this.activityLog.log({
      empresaId: user.empresaId,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      modulo: 'products',
      accion: 'UPDATE',
      resourceId: result.id,
      resourceName: result.nombre,
      resourceType: 'Producto',
    });
    return result;
  }

  @Delete(':id')
  @RequirePermissions('catalogs:delete')
  @ApiOperation({ summary: 'Eliminar producto' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const existing = await this.productsService.findOne(user.empresaId, id);
    const result = await this.productsService.remove(user.empresaId, id);
    this.activityLog.log({
      empresaId: user.empresaId,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      usuarioEmail: user.email,
      modulo: 'products',
      accion: 'DELETE',
      resourceId: id,
      resourceName: existing.nombre,
      resourceType: 'Producto',
    });
    return result;
  }
}
