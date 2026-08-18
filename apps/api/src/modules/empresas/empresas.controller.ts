import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmpresasService } from './empresas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Empresas')
@ApiBearerAuth()
@Controller('v1/empresas')
@UseGuards(JwtAuthGuard)
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva empresa (tenant)' })
  create(@CurrentUser() user: any, @Body() data: any) {
    return this.empresasService.create(user.id, data);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Obtener catálogo de planes de suscripción' })
  getPlans() {
    return this.empresasService.getPlans();
  }

  @Get('subscription')
  @ApiOperation({ summary: 'Obtener suscripción de la empresa activa' })
  async getSubscription(@CurrentUser() user: any) {
    if (!user.empresaId) return null;
    return this.prisma.suscripcion.findUnique({
      where: { empresaId: user.empresaId },
      include: { plan: true },
    });
  }

  @Get('current')
  @ApiOperation({ summary: 'Obtener datos de la empresa activa' })
  getCurrent(@CurrentUser() user: any) {
    return this.empresasService.findCurrent(user.empresaId);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Obtener empresas del usuario (propias + membresías)',
  })
  getMyEmpresas(@CurrentUser() user: any) {
    return this.empresasService.findAllForUser(user.id);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Actualizar datos de la empresa activa' })
  updateCurrent(@CurrentUser() user: any, @Body() data: any) {
    return this.empresasService.updateCurrent(user.id, user.empresaId, data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar empresa (solo propietario)' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() data: any) {
    return this.empresasService.update(user.id, id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar empresa (solo propietario)' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.empresasService.remove(user.id, id);
  }
}
