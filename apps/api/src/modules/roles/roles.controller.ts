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
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('v1/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @RequirePermissions('roles:read')
  @Get()
  @ApiOperation({ summary: 'Listar roles de la empresa activa' })
  findAll(@CurrentUser() user: any) {
    return this.rolesService.findAllByEmpresa(user.empresaId);
  }

  @RequirePermissions('roles:write')
  @Post()
  @ApiOperation({ summary: 'Crear rol' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.rolesService.create(user.empresaId, data);
  }

  @RequirePermissions('roles:write')
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar rol' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.rolesService.update(user.empresaId, id, data);
  }

  @RequirePermissions('roles:write')
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar rol' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.rolesService.remove(user.empresaId, id);
  }
}
