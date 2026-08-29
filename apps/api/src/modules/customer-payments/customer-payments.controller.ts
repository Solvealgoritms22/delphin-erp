import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CustomerPaymentsService } from './customer-payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCustomerPaymentDto } from './dto/create-customer-payment.dto';
import { FilterCustomerPaymentsDto } from './dto/filter-customer-payments.dto';

@ApiTags('Cobros de Clientes y CxC')
@ApiBearerAuth()
@Controller('v1/customer-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerPaymentsController {
  constructor(private readonly service: CustomerPaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar un recibo de cobro a cliente' })
  @RequirePermissions('commercial:write')
  create(@CurrentUser() user: any, @Body() dto: CreateCustomerPaymentDto) {
    return this.service.create(user.empresaId, user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar historial de recibos de cobro con filtros' })
  @RequirePermissions('commercial:read')
  findAll(
    @CurrentUser() user: any,
    @Query() filterDto: FilterCustomerPaymentsDto,
  ) {
    return this.service.findAll(user.empresaId, filterDto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Obtener métricas y KPIs de Cuentas por Cobrar (CxC)' })
  @RequirePermissions('commercial:read')
  getMetrics(@CurrentUser() user: any) {
    return this.service.getMetrics(user.empresaId);
  }

  @Get('pending-invoices')
  @ApiOperation({ summary: 'Listar facturas de venta pendientes de cobro' })
  @RequirePermissions('commercial:read')
  getPendingInvoices(
    @CurrentUser() user: any,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.service.getPendingInvoices(user.empresaId, clienteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de un recibo de cobro' })
  @RequirePermissions('commercial:read')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.findOne(user.empresaId, id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Anular un recibo de cobro y restituir balances' })
  @RequirePermissions('commercial:write')
  cancel(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.cancel(user.empresaId, user.id, id);
  }
}
