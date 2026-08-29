import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import {
  DateRangeReportDto,
  TopProductsReportDto,
  InventoryReportDto,
  TaxReportDto,
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

  // =========================================================================
  // REPORTES FISCALES DGII
  // =========================================================================

  @Get('tax/606')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Formato 606: Compras de Bienes y Servicios DGII' })
  get606(@CurrentUser() user: any, @Query() query: TaxReportDto) {
    return this.reportsService.get606Report(user.empresaId, query.periodo, query.sucursalId);
  }

  @Get('tax/607')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Formato 607: Ventas de Bienes y Servicios DGII' })
  get607(@CurrentUser() user: any, @Query() query: TaxReportDto) {
    return this.reportsService.get607Report(user.empresaId, query.periodo, query.sucursalId);
  }

  @Get('tax/608')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Formato 608: Comprobantes Fiscales Anulados DGII' })
  get608(@CurrentUser() user: any, @Query() query: TaxReportDto) {
    return this.reportsService.get608Report(user.empresaId, query.periodo, query.sucursalId);
  }

  @Get('tax/it1')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Borrador de Declaración Jurada IT-1 DGII' })
  getIt1(@CurrentUser() user: any, @Query() query: TaxReportDto) {
    return this.reportsService.getIt1Report(user.empresaId, query.periodo, query.sucursalId);
  }

  @Get('tax/download/:type')
  @RequirePermissions('reports:read')
  @ApiOperation({ summary: 'Descargar archivo plano TXT para la DGII (606, 607, 608)' })
  async downloadTaxTxt(
    @CurrentUser() user: any,
    @Param('type') type: '606' | '607' | '608',
    @Query('periodo') periodo: string,
    @Res() res: Response,
  ) {
    let report: { txtContent: string; filename: string };
    if (type === '606') {
      report = await this.reportsService.get606Report(user.empresaId, periodo);
    } else if (type === '607') {
      report = await this.reportsService.get607Report(user.empresaId, periodo);
    } else if (type === '608') {
      report = await this.reportsService.get608Report(user.empresaId, periodo);
    } else {
      res.status(400).send('Tipo de reporte no soportado');
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${report.filename}"`);
    res.send(report.txtContent);
  }
}
