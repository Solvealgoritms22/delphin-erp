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
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireEntitlement } from '../../common/decorators/require-entitlement.decorator';
import { EntitlementGuard } from '../../common/guards/entitlement.guard';

@ApiTags('Usuarios')
@ApiBearerAuth()
@Controller('v1/usuarios')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios de la empresa activa' })
  findAll(@CurrentUser() user: any) {
    return this.usersService.findAllByEmpresa(user.empresaId);
  }

  @Get('available-companies')
  @ApiOperation({ summary: 'Listar empresas que el administrador puede asignar' })
  findAvailableCompanies(@CurrentUser() user: any) {
    return this.usersService.findAssignableCompanies(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario y vincularlo a la empresa' })
  @RequireEntitlement('maxUsuarios')
  @UseGuards(EntitlementGuard)
  create(@CurrentUser() user: any, @Body() data: any) {
    return data.empresaIds !== undefined
      ? this.usersService.create(user.empresaId, data, user.id)
      : this.usersService.create(user.empresaId, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar rol/estado de un usuario' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return data.empresaIds !== undefined
      ? this.usersService.update(user.empresaId, id, data, user.id)
      : this.usersService.update(user.empresaId, id, data);
  }

  @Post(':id/resend-invitation')
  @ApiOperation({ summary: 'Reenviar invitación de activación' })
  resendInvitation(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.resendInvitation(user.empresaId, id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar membresía de un usuario' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.remove(user.empresaId, id);
  }
}
