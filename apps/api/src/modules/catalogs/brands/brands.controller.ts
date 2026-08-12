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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@ApiTags('Catálogos: Marcas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/catalogs/brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear marca' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.brandsService.create(user.empresaId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar marcas' })
  findAll(@CurrentUser() user: any) {
    return this.brandsService.findAll(user.empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener marca por id' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.brandsService.findOne(id, user.empresaId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar marca' })
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() data: any) {
    return this.brandsService.update(id, user.empresaId, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar marca' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.brandsService.remove(id, user.empresaId);
  }
}
