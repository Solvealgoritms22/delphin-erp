import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TenantApiKeyService } from '../tenant-api-key.service';
import {
  CreateTenantApiAppDto,
} from '../dto/tenant-api.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Gestión de API Pública del Tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/tenant-api/apps')
export class TenantApiManagementController {
  constructor(private readonly apiKeyService: TenantApiKeyService) {}

  @Get()
  @RequirePermissions('settings_company:read')
  @ApiOperation({ summary: 'Listar aplicaciones API registradas del tenant' })
  findAll(@CurrentUser() user: any) {
    return this.apiKeyService.findAll(user.empresaId);
  }

  @Post()
  @RequirePermissions('settings_company:write')
  @ApiOperation({ summary: 'Registrar nueva aplicación API externa (Máx 2 por tenant Enterprise)' })
  create(@CurrentUser() user: any, @Body() dto: CreateTenantApiAppDto) {
    return this.apiKeyService.create(user.empresaId, dto);
  }

  @Post(':id/rotate')
  @RequirePermissions('settings_company:write')
  @ApiOperation({ summary: 'Rotar y regenerar clave API para una aplicación' })
  rotate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.apiKeyService.rotateKey(user.empresaId, id);
  }

  @Patch(':id/revoke')
  @RequirePermissions('settings_company:write')
  @ApiOperation({ summary: 'Revocar acceso de una clave API' })
  revoke(@CurrentUser() user: any, @Param('id') id: string) {
    return this.apiKeyService.revoke(user.empresaId, id);
  }

  @Delete(':id')
  @RequirePermissions('settings_company:write')
  @ApiOperation({ summary: 'Eliminar registro de aplicación API' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.apiKeyService.delete(user.empresaId, id);
  }
}
