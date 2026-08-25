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
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos: Marcas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/catalogs/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Crear marca' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.brandsService.create(user.empresaId, data);
  }

  @Get()
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Listar marcas' })
  findAll(@CurrentUser() user: any) {
    return this.brandsService.findAll(user.empresaId);
  }

  @Get(':id')
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Obtener marca por id' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.brandsService.findOne(id, user.empresaId);
  }

  @Patch(':id')
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Actualizar marca' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() data: any) {
    return this.brandsService.update(id, user.empresaId, data);
  }

  @Delete(':id')
  @RequirePermissions('catalogs:delete')
  @ApiOperation({ summary: 'Eliminar marca' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.brandsService.remove(id, user.empresaId);
  }
}
