import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, FilterInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { Response } from 'express';

@ApiTags('Facturación de Ventas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermissions('invoices:write')
  create(@CurrentUser() user: any, @Body() dto: CreateInvoiceDto) {
    const userId = user.userId || user.id;
    return this.invoicesService.create(user.empresaId, userId, dto);
  }

  @Get()
  @RequirePermissions('invoices:read')
  findAll(@CurrentUser() user: any, @Query() query: FilterInvoiceDto) {
    return this.invoicesService.findAll(user.empresaId, query);
  }

  @Get(':id')
  @RequirePermissions('invoices:read')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.findOne(user.empresaId, id);
  }

  @Post(':id/send-fiscalbridge')
  @RequirePermissions('invoices:write')
  sendFiscalBridge(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoicesService.sendToFiscalBridge(user.empresaId, id);
  }

  @Get(':id/pdf')
  @RequirePermissions('invoices:read')
  getPdf(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.invoicesService.proxyPdf(user.empresaId, id, res);
  }

  @Get(':id/xml')
  @RequirePermissions('invoices:read')
  getXml(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    return this.invoicesService.proxyXml(user.empresaId, id, res);
  }
}
