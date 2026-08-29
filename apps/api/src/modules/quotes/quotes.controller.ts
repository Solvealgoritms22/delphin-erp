import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  FilterQuotesDto,
  SendQuoteEmailDto,
} from './dto/quotes.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Comercial: Cotizaciones y Presupuestos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Crear nueva cotización' })
  create(@CurrentUser() user: any, @Body() dto: CreateQuoteDto) {
    const userId = user.userId || user.id;
    return this.quotesService.create(user.empresaId, userId, dto);
  }

  @Get()
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Listar cotizaciones con filtros y paginación' })
  findAll(@CurrentUser() user: any, @Query() filter: FilterQuotesDto) {
    return this.quotesService.findAll(user.empresaId, filter);
  }

  @Get('metrics')
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Obtener métricas y KPIs de cotizaciones' })
  getMetrics(@CurrentUser() user: any) {
    return this.quotesService.getMetrics(user.empresaId);
  }

  @Get('smtp-status')
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Consultar estado del servidor SMTP de la empresa' })
  getSmtpStatus(@CurrentUser() user: any) {
    return this.quotesService.getSmtpStatus(user.empresaId);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Obtener detalle completo de una cotización' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.quotesService.findOne(user.empresaId, id);
  }

  @Patch(':id')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Actualizar cotización' })
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateQuoteDto>,
  ) {
    return this.quotesService.update(user.empresaId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Anular o eliminar cotización' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.quotesService.delete(user.empresaId, id);
  }

  @Post(':id/send-email')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Enviar cotización por correo electrónico validando SMTP y destinatario' })
  sendEmail(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendQuoteEmailDto,
  ) {
    return this.quotesService.sendEmail(user.empresaId, id, dto);
  }

  @Post(':id/convert-to-invoice')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Convertir cotización en Factura de Venta fiscal' })
  convertToInvoice(@CurrentUser() user: any, @Param('id') id: string) {
    const userId = user.userId || user.id;
    return this.quotesService.convertToInvoice(user.empresaId, userId, id);
  }
}
