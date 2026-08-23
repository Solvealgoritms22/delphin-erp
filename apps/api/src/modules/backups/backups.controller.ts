import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { BackupsService } from './backups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Backups')
@ApiBearerAuth()
@Controller('v1/backups')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get()
  @RequirePermissions('backups:read')
  list(@CurrentUser() user: any, @Query('empresaId') empresaId?: string) {
    return this.backups.list(user.id, empresaId || user.empresaId);
  }

  @Get('settings')
  @RequirePermissions('backups:read')
  getSettings(
    @CurrentUser() user: any,
    @Query('empresaId') empresaId?: string,
  ) {
    return this.backups.getSettings(user.id, empresaId || user.empresaId);
  }

  @Patch('settings')
  @RequirePermissions('backups:write')
  updateSettings(
    @CurrentUser() user: any,
    @Body() body: any,
    @Query('empresaId') empresaId?: string,
  ) {
    return this.backups.updateSettings(
      user.id,
      empresaId || user.empresaId,
      body,
    );
  }

  @Post()
  @RequirePermissions('backups:write')
  create(
    @CurrentUser() user: any,
    @Body() body: { empresaId?: string; proveedor?: string },
  ) {
    const proveedor = body.proveedor || 'LOCAL';
    if (!['LOCAL', 'GOOGLE_DRIVE'].includes(proveedor)) {
      throw new BadRequestException('Proveedor de backup no soportado');
    }
    return this.backups.create(
      user.id,
      body.empresaId || user.empresaId,
      proveedor as 'LOCAL' | 'GOOGLE_DRIVE',
    );
  }

  @Get('google/status')
  @RequirePermissions('backups:drive')
  googleStatus(@CurrentUser() user: any) {
    return this.backups.googleStatus(user.id);
  }

  @Post('google/authorize')
  @RequirePermissions('backups:drive')
  googleAuthorize(@CurrentUser() user: any) {
    return this.backups.googleAuthorize(user.id);
  }

  @Get('google/callback')
  googleCallback(@Query('code') code: string, @Query('state') state: string) {
    if (!code || !state)
      throw new BadRequestException('Callback OAuth incompleto');
    return this.backups.googleCallback(code, state);
  }

  @Delete('google')
  @RequirePermissions('backups:drive')
  disconnectGoogle(@CurrentUser() user: any) {
    return this.backups.disconnectGoogle(user.id);
  }

  @Get(':id/download')
  @RequirePermissions('backups:read')
  async download(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const file = await this.backups.readLocal(user.id, id);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.send(file.data);
  }

  @Delete(':id')
  @RequirePermissions('backups:delete')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.backups.remove(user.id, id);
  }
}
