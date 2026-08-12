import { Controller, Delete, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ActivityLogService } from './activity-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Actividad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/activity')
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar logs de actividad con filtros y paginación',
  })
  findMany(
    @Query('modulo') modulo?: string,
    @Query('accion') accion?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('year') year?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.findMany({
      modulo,
      accion,
      usuarioId,
      year: year ? parseInt(year, 10) : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  @Get('years')
  @ApiOperation({ summary: 'Obtener años disponibles de actividad' })
  getYears() {
    return this.activityLogService.getYears();
  }

  @Delete()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('activity:delete')
  @ApiOperation({ summary: 'Limpiar actividad de la empresa actual' })
  clear(@Req() request: any) {
    if (!request.user.empresaId) {
      throw new ForbiddenException('No hay una empresa activa para limpiar');
    }
    return this.activityLogService.clear(request.user.empresaId);
  }

}
