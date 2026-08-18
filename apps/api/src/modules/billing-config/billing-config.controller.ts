import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingConfigService } from './billing-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Configuración de facturación')
@ApiBearerAuth()
@Controller('v1/billing-config')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingConfigController {
  constructor(private readonly service: BillingConfigService) {}

  @Get()
  @RequirePermissions('company:read')
  get(@CurrentUser() user: any) {
    return this.service.get(user.empresaId);
  }

  @Patch()
  @RequirePermissions('company:write')
  update(@CurrentUser() user: any, @Body() data: any) {
    return this.service.update(user.empresaId, user.id, data);
  }

  @Get('taxes')
  @RequirePermissions('catalogs:read')
  taxes(@CurrentUser() user: any) {
    return this.service.listTaxes(user.empresaId);
  }

  @Post('taxes')
  @RequirePermissions('company:write')
  createTax(@CurrentUser() user: any, @Body() data: any) {
    return this.service.createTax(user.empresaId, user.id, data);
  }

  @Patch('taxes/:id')
  @RequirePermissions('company:write')
  updateTax(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.updateTax(user.empresaId, user.id, id, data);
  }

  @Get('payment-terms')
  @RequirePermissions('company:read')
  paymentTerms(@CurrentUser() user: any) {
    return this.service.listTerms(user.empresaId);
  }

  @Post('payment-terms')
  @RequirePermissions('company:write')
  createPaymentTerm(@CurrentUser() user: any, @Body() data: any) {
    return this.service.createTerm(user.empresaId, user.id, data);
  }

  @Patch('payment-terms/:id')
  @RequirePermissions('company:write')
  updatePaymentTerm(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.service.updateTerm(user.empresaId, user.id, id, data);
  }
}
