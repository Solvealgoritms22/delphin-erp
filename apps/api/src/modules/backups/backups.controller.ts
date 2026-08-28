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
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('backups:read')
  list(@CurrentUser() user: any, @Query('empresaId') empresaId?: string) {
    return this.backups.list(user.id, empresaId || user.empresaId);
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('backups:read')
  getSettings(
    @CurrentUser() user: any,
    @Query('empresaId') empresaId?: string,
  ) {
    return this.backups.getSettings(user.id, empresaId || user.empresaId);
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('backups:read')
  googleStatus(@CurrentUser() user: any) {
    return this.backups.googleStatus(user.id);
  }

  @Post('google/authorize')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('backups:write')
  googleAuthorize(@CurrentUser() user: any) {
    return this.backups.googleAuthorize(user.id);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl =
      process.env.FRONTEND_URL?.trim() || 'http://localhost:4200';
    try {
      if (!code || !state) {
        throw new BadRequestException('Callback OAuth incompleto');
      }
      await this.backups.googleCallback(code, state);
      return res.redirect(`${frontendUrl}/settings/backups?googleDrive=success`);
    } catch (err: any) {
      const msg = encodeURIComponent(
        err?.message || 'Error al conectar Google Drive',
      );
      return res.redirect(
        `${frontendUrl}/settings/backups?googleDriveError=${msg}`,
      );
    }
  }

  @Delete('google')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('backups:write')
  disconnectGoogle(@CurrentUser() user: any) {
    return this.backups.disconnectGoogle(user.id);
  }

  @Get(':id/download')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('backups:delete')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.backups.remove(user.id, id);
  }
}
