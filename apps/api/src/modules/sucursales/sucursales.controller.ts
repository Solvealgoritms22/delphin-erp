import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SucursalesService } from './sucursales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Sucursales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/sucursales')
export class SucursalesController {
  constructor(private readonly sucursalesService: SucursalesService) {}

  @Post()
  @RequirePermissions('sucursales:write')
  @ApiOperation({ summary: 'Crear sucursal' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.sucursalesService.create(user.empresaId, data);
  }

  @Get()
  @RequirePermissions('sucursales:read')
  @ApiOperation({ summary: 'Listar sucursales de la empresa activa' })
  findAll(@CurrentUser() user: any) {
    return this.sucursalesService.findAll(user.empresaId);
  }

  @Get(':id')
  @RequirePermissions('sucursales:read')
  @ApiOperation({ summary: 'Obtener sucursal por id' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sucursalesService.findOne(id, user.empresaId);
  }

  @Patch(':id')
  @RequirePermissions('sucursales:write')
  @ApiOperation({ summary: 'Actualizar sucursal' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() data: any) {
    return this.sucursalesService.update(id, user.empresaId, data);
  }

  @Delete(':id')
  @RequirePermissions('sucursales:delete')
  @ApiOperation({ summary: 'Eliminar sucursal' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.sucursalesService.remove(id, user.empresaId);
  }
}
