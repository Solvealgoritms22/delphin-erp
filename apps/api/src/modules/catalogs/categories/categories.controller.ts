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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos: Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/catalogs/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Crear categoría' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.categoriesService.create(user.empresaId, data);
  }

  @Get()
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Listar categorías' })
  findAll(@CurrentUser() user: any, @Query('tipo') tipo?: string) {
    return this.categoriesService.findAll(user.empresaId, tipo);
  }

  @Get(':id')
  @RequirePermissions('catalogs:read')
  @ApiOperation({ summary: 'Obtener categoría por id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.categoriesService.findOne(user.empresaId, id);
  }

  @Patch(':id')
  @RequirePermissions('catalogs:write')
  @ApiOperation({ summary: 'Actualizar categoría' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.categoriesService.update(user.empresaId, id, data);
  }

  @Delete(':id')
  @RequirePermissions('catalogs:delete')
  @ApiOperation({ summary: 'Eliminar categoría' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.categoriesService.remove(user.empresaId, id);
  }
}
