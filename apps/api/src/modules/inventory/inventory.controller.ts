import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  InventoryService,
  TransferStockDto,
  AdjustStockDto,
} from './inventory.service';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Inventario')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ----------------------------------------------------
  // Almacenes
  // ----------------------------------------------------

  @Get('warehouses')
  @ApiOperation({ summary: 'Listar almacenes de la empresa' })
  getWarehouses(@CurrentUser() user: any) {
    return this.inventoryService.getWarehouses(user.empresaId);
  }

  @Post('warehouses')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Crear nuevo almacén' })
  createWarehouse(@CurrentUser() user: any, @Body() data: any) {
    return this.inventoryService.createWarehouse(user.empresaId, data);
  }

  @Patch('warehouses/:id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Actualizar almacén' })
  updateWarehouse(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.inventoryService.updateWarehouse(user.empresaId, id, data);
  }

  // ----------------------------------------------------
  // Stock y Existencias
  // ----------------------------------------------------

  @Get('stocks')
  @ApiOperation({ summary: 'Consultar existencias por almacén / producto' })
  getStocks(
    @CurrentUser() user: any,
    @Query('almacenId') almacenId?: string,
    @Query('productoId') productoId?: string,
    @Query('search') search?: string,
  ) {
    return this.inventoryService.getStocks(user.empresaId, {
      almacenId,
      productoId,
      search,
    });
  }

  @Get('products/:id/breakdown')
  @ApiOperation({
    summary: 'Desglose de existencias de un producto en todos los almacenes',
  })
  getProductStockBreakdown(@CurrentUser() user: any, @Param('id') id: string) {
    return this.inventoryService.getProductStockBreakdown(user.empresaId, id);
  }

  // ----------------------------------------------------
  // Transferencias y Movimientos
  // ----------------------------------------------------

  @Post('transfers')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('inventory:write')
  @ApiOperation({ summary: 'Transferir stock entre almacenes/sucursales' })
  createTransfer(@CurrentUser() user: any, @Body() dto: TransferStockDto) {
    return this.inventoryService.createTransfer(user.empresaId, user.id, dto);
  }

  @Post('adjustments')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('inventory:write')
  @ApiOperation({
    summary: 'Realizar ajuste de inventario (conteo, merma, entrada/salida)',
  })
  createAdjustment(@CurrentUser() user: any, @Body() dto: AdjustStockDto) {
    return this.inventoryService.createAdjustment(user.empresaId, user.id, dto);
  }

  // ----------------------------------------------------
  // Kardex
  // ----------------------------------------------------

  @Get('kardex')
  @ApiOperation({ summary: 'Historial de movimientos de inventario (Kardex)' })
  getKardex(
    @CurrentUser() user: any,
    @Query('productoId') productoId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.inventoryService.getKardex(
      user.empresaId,
      productoId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
