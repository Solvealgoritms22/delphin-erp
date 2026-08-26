import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import {
  DateRangeReportDto,
  TopProductsReportDto,
  InventoryReportDto,
} from './dto/reports.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Reportes y Estadísticas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reporte general de ventas y desglose temporal' })
  getSalesReport(@CurrentUser() user: any, @Query() query: DateRangeReportDto) {
    return this.reportsService.getSalesReport(user.empresaId, query);
  }

  @Get('top-products')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reporte de productos más vendidos' })
  getTopProducts(@CurrentUser() user: any, @Query() query: TopProductsReportDto) {
    return this.reportsService.getTopProductsReport(user.empresaId, query);
  }

  @Get('receivables')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reporte de cuentas por cobrar y antigüedad de saldos' })
  getReceivables(@CurrentUser() user: any) {
    return this.reportsService.getReceivablesReport(user.empresaId);
  }

  @Get('inventory')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reporte de valoración de inventario y alertas de stock bajo' })
  getInventory(@CurrentUser() user: any, @Query() query: InventoryReportDto) {
    return this.reportsService.getInventoryReport(user.empresaId, query);
  }

  @Get('sales-by-client')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Reporte de ventas agrupadas por cliente' })
  getSalesByClient(@CurrentUser() user: any, @Query() query: DateRangeReportDto) {
    return this.reportsService.getSalesByClientReport(user.empresaId, query);
  }
}
