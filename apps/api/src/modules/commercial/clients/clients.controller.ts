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
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Comercial: Clientes')
@ApiBearerAuth()
@Controller('v1/commercial/clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Request() req, @Body() data: any) {
    return this.clientsService.create(req.user.empresaId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(@Request() req) {
    return this.clientsService.findAll(req.user.empresaId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener cliente por id' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.clientsService.findOne(id, req.user.empresaId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(id, req.user.empresaId, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar cliente' })
  remove(@Request() req, @Param('id') id: string) {
    return this.clientsService.remove(id, req.user.empresaId);
  }
}
