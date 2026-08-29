import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { FilterPurchasesDto } from './dto/filter-purchases.dto';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Comercial: Compras y Cuentas por Pagar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Registrar nueva factura de compra o gasto' })
  create(@CurrentUser() user: any, @Body() dto: CreatePurchaseDto) {
    const userId = user.userId || user.id;
    return this.purchasesService.create(user.empresaId, userId, dto);
  }

  @Get()
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Listar facturas de compra con filtros y métricas' })
  findAll(@CurrentUser() user: any, @Query() filter: FilterPurchasesDto) {
    return this.purchasesService.findAll(user.empresaId, filter);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Obtener detalle de una factura de compra' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.purchasesService.findOne(user.empresaId, id);
  }

  @Post(':id/payments')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Registrar pago o abono a factura de compra' })
  registerPayment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateSupplierPaymentDto,
  ) {
    const userId = user.userId || user.id;
    return this.purchasesService.registerPayment(user.empresaId, userId, id, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Anular factura de compra y revertir inventario' })
  cancel(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('motivo') motivo?: string,
  ) {
    const userId = user.userId || user.id;
    return this.purchasesService.cancel(user.empresaId, userId, id, motivo);
  }
}
