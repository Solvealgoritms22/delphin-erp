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
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos: Categorías')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/catalogs/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear categoría' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.categoriesService.create(user.empresaId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorías' })
  findAll(@CurrentUser() user: any) {
    return this.categoriesService.findAll(user.empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener categoría por id' })
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.categoriesService.findOne(user.empresaId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar categoría' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.categoriesService.update(user.empresaId, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar categoría' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.categoriesService.remove(user.empresaId, id);
  }
}
