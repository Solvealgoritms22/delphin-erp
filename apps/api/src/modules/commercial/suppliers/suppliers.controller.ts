import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Comercial: Proveedores')
@ApiBearerAuth()
@Controller('v1/commercial/suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Crear proveedor' })
  create(@Request() req, @Body() data: any) {
    return this.suppliersService.create(req.user.empresaId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar proveedores' })
  findAll(@Request() req) {
    return this.suppliersService.findAll(req.user.empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proveedor por id' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.suppliersService.findOne(id, req.user.empresaId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.suppliersService.update(id, req.user.empresaId, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar proveedor' })
  remove(@Request() req, @Param('id') id: string) {
    return this.suppliersService.remove(id, req.user.empresaId);
  }
}
