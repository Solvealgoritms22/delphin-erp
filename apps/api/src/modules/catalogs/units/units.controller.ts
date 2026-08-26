import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UnitsService } from './units.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos: Unidades de Medida')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/catalogs/units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Crear unidad de medida' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.unitsService.create(user.empresaId, data);
  }

  @Get()
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Listar unidades de medida' })
  findAll(@CurrentUser() user: any, @Query('tipo') tipo?: string) {
    return this.unitsService.findAll(user.empresaId, tipo);
  }

  @Get(':id')
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Obtener unidad por id' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.findOne(id, user.empresaId);
  }

  @Patch(':id')
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Actualizar unidad de medida' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() data: any) {
    return this.unitsService.update(id, user.empresaId, data);
  }

  @Delete(':id')
  @RequirePermissions('catalogs:delete')
  @ApiOperation({ summary: 'Eliminar unidad de medida' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.unitsService.remove(id, user.empresaId);
  }
}
