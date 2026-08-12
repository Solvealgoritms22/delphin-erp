import { Controller, Delete, ForbiddenException, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActivityLogService } from './activity-log.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Seguridad')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/security-logs')
export class SecurityLogsController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos de seguridad' })
  findMany(
    @Query('search') search?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.findSecurityLogs({
      search,
      severity,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 25,
    });
  }

  @Delete()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('security:delete')
  @ApiOperation({ summary: 'Limpiar logs de seguridad de la empresa actual' })
  clear(@Req() request: any) {
    if (!request.user.empresaId) {
      throw new ForbiddenException('No hay una empresa activa para limpiar');
    }
    return this.activityLogService.clear(request.user.empresaId, 'SECURITY');
  }
}
