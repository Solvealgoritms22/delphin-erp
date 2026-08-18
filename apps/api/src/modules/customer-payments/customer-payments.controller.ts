import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomerPaymentsService } from './customer-payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Cobros de clientes')
@ApiBearerAuth()
@Controller('v1/customer-payments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomerPaymentsController {
  constructor(private readonly service: CustomerPaymentsService) {}

  @Post()
  @RequirePermissions('billing:write')
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.service.create(user.empresaId, user.id, data);
  }

  @Get('invoice/:id')
  @RequirePermissions('billing:read')
  list(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.listForInvoice(user.empresaId, id);
  }
}
