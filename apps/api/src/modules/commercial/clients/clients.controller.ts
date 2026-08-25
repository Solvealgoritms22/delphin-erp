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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('Comercial: Clientes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/commercial/clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Request() req, @Body() data: any) {
    return this.clientsService.create(req.user.empresaId, data);
  }

  @Get()
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Listar clientes' })
  findAll(@Request() req) {
    return this.clientsService.findAll(req.user.empresaId);
  }

  @Get(':id')
  @RequirePermissions('commercial:read')
  @ApiOperation({ summary: 'Obtener cliente por id' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.clientsService.findOne(id, req.user.empresaId);
  }

  @Patch(':id')
  @RequirePermissions('commercial:write')
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Request() req, @Param('id') id: string, @Body() data: any) {
    return this.clientsService.update(id, req.user.empresaId, data);
  }

  @Delete(':id')
  @RequirePermissions('commercial:delete')
  @ApiOperation({ summary: 'Eliminar cliente' })
  remove(@Request() req, @Param('id') id: string) {
    return this.clientsService.remove(id, req.user.empresaId);
  }
}
